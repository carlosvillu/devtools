'use client';

import { useEffect, useRef, useState } from 'react';
import { ChainSchema, type Chain, type DataKind, type StepOverride } from '@app/core/engine';
import { api, ApiError } from '@/lib/api-client';
import { Textarea } from '@/components/ui/textarea';
import { Callout } from '@/components/ui/callout';
import { Icon } from '@/components/ui/icon';
import { Kbd } from '@/components/ui/kbd';
import { Spinner } from '@/components/ui/spinner';
import { ChainSummary } from '@/components/chain/chain-summary';
import { StepCard } from '@/components/chain/step-card';
import { PENDING_INPUT_KEY } from '@/lib/pending-input';
import { PRIVACY_HEADLINE, PRIVACY_DETAIL } from '@/lib/privacy-notice';
import { chainKinds, chainToStepCards, isUnrecognized } from './chain-to-step-cards';

// Hoja interactiva de `/` (frontend/architecture.md §2: la frontera `'use client'` vive en
// el componente más profundo, no en la página). El campo de pegado + la cadena en vivo. La
// página (Server Component) solo compone el encabezado estático y monta esto.
//
// Disparo del análisis SIN botón (Entrega T1.5): al PEGAR se analiza de inmediato; al
// ESCRIBIR se espera a 300 ms de inactividad (debounce). Cada disparo cancela el anterior
// —aborta el fetch en vuelo y descarta su respuesta con un contador de secuencia— para que
// una respuesta lenta y vieja no pise a una entrada nueva.
const DEBOUNCE_MS = 300;

export function FieldAnalyzer() {
  const [input, setInput] = useState('');
  const [chain, setChain] = useState<Chain | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Desvíos de O4/O5 (T1.6): la cadena se recalcula SIEMPRE desde el input original con estos
  // reencaminamientos por paso (replay en servidor). Se resetean cuando cambia el input.
  const [overrides, setOverrides] = useState<StepOverride[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const seqRef = useRef(0);
  const pastedRef = useRef(false);
  // Input pendiente ya consumido de sessionStorage, guardado en un ref para que la lectura+
  // borrado ocurra UNA sola vez: en StrictMode (dev) el efecto de montaje corre dos veces, pero
  // el borrado es idempotente porque tras el primer pase la clave ya no existe. El ref conserva
  // el valor entre ambos pases para que el análisis se dispare igual (el primer fetch lo aborta
  // la limpieza de StrictMode; el segundo pase lo relanza). En producción corre una sola vez.
  const consumedPendingRef = useRef<string | null>(null);
  const pendingReadRef = useRef(false);

  // Foco automático al cargar (Entrega T1.5): se pega o se escribe sin tocar nada primero.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Consumo del input pendiente que la landing dejó en sessionStorage (T5.1). Al montar: si hay
  // valor, se LEE, se BORRA la clave (recargar `/analyze` NO re-analiza: el pending es de un solo
  // uso) y se dispara el análisis inmediato — el mismo camino que un pegado. Sin pending: campo
  // vacío, comportamiento de hoy intacto. sessionStorage no existe en SSR ⇒ va en useEffect con
  // guarda de `typeof window`. El input NUNCA toca la URL: solo sale de sessionStorage.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!pendingReadRef.current) {
      pendingReadRef.current = true;
      const pending = window.sessionStorage.getItem(PENDING_INPUT_KEY);
      if (pending) {
        window.sessionStorage.removeItem(PENDING_INPUT_KEY);
        consumedPendingRef.current = pending;
      }
    }
    // `consumedPendingRef` solo se asigna dentro del `if (pending)` de arriba, que ya descarta
    // null y '' (getItem falsy) — así que aquí basta con la verdad del valor.
    const value = consumedPendingRef.current;
    if (value) {
      setInput(value);
      runAnalyze(value, []);
    }
    // Solo al montar (deps vacías, como el efecto de foco): el consumo del pending es un evento
    // de arranque de un solo uso, no una reacción a cambios de props/estado.
  }, []);

  // Limpieza al desmontar: ni timers ni fetches colgando.
  useEffect(
    () => () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  function runAnalyze(value: string, nextOverrides: StepOverride[]) {
    clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (value.trim() === '') {
      // Campo vacío: ni cadena ni mensaje de «no reconocido» — solo el estado inicial.
      seqRef.current += 1;
      setChain(null);
      setError(null);
      setPending(false);
      return;
    }

    const seq = ++seqRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    setError(null);

    // §11: el cuerpo lleva el input y, si hay desvíos, los overrides (ids/kinds/índices —
    // nunca valores intermedios). Sin desvíos se omite la clave, para no ensuciar el contrato.
    const body: { input: string; overrides?: StepOverride[] } =
      nextOverrides.length > 0 ? { input: value, overrides: nextOverrides } : { input: value };

    void (async () => {
      try {
        const result = await api.post('/api/analyze', ChainSchema, body, {
          signal: controller.signal,
        });
        if (seq !== seqRef.current) return; // respuesta obsoleta: llegó otra entrada
        setChain(result);
        setPending(false);
      } catch (err) {
        if (controller.signal.aborted || seq !== seqRef.current) return; // cancelada: sin ruido
        setPending(false);
        setChain(null);
        setError(
          err instanceof ApiError
            ? err.message
            : 'No se pudo analizar la entrada. Inténtalo de nuevo.',
        );
      }
    })();
  }

  function scheduleDebounced(value: string) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runAnalyze(value, []);
    }, DEBOUNCE_MS);
  }

  function onChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;
    setInput(value);
    // Input nuevo ⇒ cadena nueva: los desvíos previos ya no aplican (los índices cambian).
    setOverrides([]);
    if (pastedRef.current) {
      pastedRef.current = false;
      runAnalyze(value, []); // pegado → inmediato
    } else {
      scheduleDebounced(value); // tecleo → tras 300 ms de calma
    }
  }

  // Desvío de la cadena en `stepIndex` (O4 picker o O5 alternativa). Se descartan los overrides
  // de pasos >= stepIndex (su cola se recalcula) y se conservan los de pasos < stepIndex (los
  // desvíos anteriores siguen vigentes: sus pasos son idénticos por determinismo). Luego se
  // re-analiza el input ORIGINAL con la nueva lista — el motor replantea toda la cadena.
  function divert(stepIndex: number, choice: { transform: string } | { kind: DataKind }) {
    const next: StepOverride[] = [
      ...overrides.filter((o) => o.step < stepIndex),
      { step: stepIndex, ...choice },
    ];
    setOverrides(next);
    runAnalyze(input, next);
  }

  const steps = chain ? chainToStepCards(chain) : [];
  const unrecognized = chain != null && isUnrecognized(chain);
  const showChain = chain != null && !unrecognized;

  return (
    <div>
      <Textarea
        ref={textareaRef}
        rows={3}
        value={input}
        onChange={onChange}
        onPaste={() => {
          pastedRef.current = true;
        }}
        aria-label="Pega algo para analizar"
        placeholder="Pega un JWT, un base64, un timestamp, un JSON, una URL…"
        className="text-sm"
      />

      {/* fila de pista: pegar/analizar sin botón + resumen de estado de la cadena */}
      <div className="mt-2.5 mb-7 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-2 text-text-subtle">
          <span className="inline-flex gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>V</Kbd>
          </span>
          pega y analiza — sin botón
        </span>
        {pending ? (
          <Spinner size={14} label="Analizando" />
        ) : chain ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-text-muted">
            {/* verde solo en el icono (objeto gráfico, umbral 3:1); el texto pequeño va en
                --text-muted para cumplir AA 4.5:1 — `text-success` (green-600) a 12px sobre
                fondo claro da 3.93:1 (verificado en T1.5). */}
            <Icon name="git-branch" size={14} className="text-success" />
            {chain.steps.length} {chain.steps.length === 1 ? 'paso' : 'pasos'} · terminal
          </span>
        ) : null}
      </div>

      {error ? (
        <Callout tone="danger" title="No se pudo analizar" role="alert" className="mb-6">
          {error}
        </Callout>
      ) : null}

      {unrecognized ? (
        <Callout tone="info" title="No se reconoció ningún formato conocido" className="mb-6">
          Se intentó detectar jwt, json, base64, timestamp, url, uuid y hash. Lo que pegaste se
          interpreta como texto plano: no hay nada que decodificar.
        </Callout>
      ) : null}

      {showChain ? (
        <>
          <div className="mb-4 flex items-center gap-3">
            <span className="text-2xs font-semibold tracking-wide text-text-subtle uppercase">
              la cadena
            </span>
            <div className="h-px flex-1 bg-border" />
            <ChainSummary kinds={chainKinds(chain)} size="md" />
          </div>
          <div className="flex flex-col gap-3">
            {steps.map((step) => (
              <StepCard
                key={step.index}
                {...step}
                onSelectTransform={(id) => {
                  divert(step.index, { transform: id });
                }}
                onSelectAlternative={(kind) => {
                  divert(step.index, { kind });
                }}
              />
            ))}
          </div>
        </>
      ) : null}

      <div className="mt-6">
        <Callout tone="security" title={PRIVACY_HEADLINE}>
          {PRIVACY_DETAIL}
        </Callout>
      </div>
    </div>
  );
}
