'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  MAX_COMPOSE_STEPS,
  encodeCatalogByGroup,
  safeCompose,
  type ComposeStep,
} from '@app/core/engine';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Card } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { CopyButton } from '@/components/ui/copy-button';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { ChainSummary } from '@/components/chain/chain-summary';
import { COMPOSE_PRIVACY_DETAIL, COMPOSE_PRIVACY_HEADLINE } from '@/lib/privacy-notice';
import {
  parseComposeDraft,
  saveDraft,
  serializeComposeDraft,
  takeSwitchedDraft,
  type ComposeDraft,
} from '@/lib/work-mode';
import {
  composeChainKinds,
  okStepCount,
  recognizedSourceKind,
  showResultBar,
} from './compose-view';

// El CONSTRUCTOR DE CADENA de `/compose` (T6.7), traducido de `docs/mockups/compose.html`
// (`ComposeClaro`) a primitivas del DS. La hoja `'use client'` de la pantalla: la página es un
// Server Component delgado y aquí vive todo lo interactivo (frontend §3).
//
// ── EL MOTOR CORRE AQUÍ, EN EL NAVEGADOR ─────────────────────────────────────────────────
// Decisión 1 de F6 (PRD §5.3/D10): no existe `/api/compose`. Se importa `safeCompose` de
// `@app/core/engine` y se ejecuta en el cliente, así que COMPONER NO DISPARA NI UNA PETICIÓN
// DE RED — es lo que hace verdadera la promesa del `Callout` y lo que el E2E vigila contando
// peticiones, no mirando la pantalla.
//
// `safeCompose` y NO `compose`: `compose()` LANZA con una receta que no valida, y aquí se
// recompone en cada pulsación; un estado transitorio inválido dejaría la pantalla en blanco en
// el navegador del usuario. `safeCompose` devuelve el fallo como dato (T6.6).
//
// Se recalcula la receta ENTERA en cada render: T6.6 lo midió (207 µs con 2 pasos sobre 42 B,
// 13,7 ms sobre los 128 KB de I7), así que no hay ni API incremental, ni worker, ni caché.

// Un paso tal y como lo edita el usuario: el id de la transformación + una clave estable de
// React. La clave NO puede ser el índice (quitar el paso 1 remontaría el 2 y perdería su foco)
// ni el id (la misma transformación puede repetirse en la cadena).
interface BuilderStep {
  key: string;
  transform: string;
}

// El catálogo agrupado del MOTOR (`encodeCatalogByGroup`, T6.4/T6.5): la paleta no mantiene su
// propia lista de transformaciones ni sabe nada de `jwt.sign` en particular — se recorre.
const CATALOG = encodeCatalogByGroup();
const ALL_TRANSFORMS = CATALOG.flatMap((group) =>
  group.items.map((item) => ({ value: item.id, label: item.label })),
);

// ── DECISIÓN: LA PALETA NO PINTA CHIP DE KIND (subtarea explícita de T6.7) ────────────────
// El artboard pinta un `Badge` de tipo por cada item de la paleta (`base64.encode` → chip
// `base64`). El catálogo del motor NO puede darlo y no es un olvido suyo: por I10 el kind se
// DETECTA re-ejecutando los detectores de §6.2 sobre la SALIDA, y cuando se pinta la paleta esa
// salida todavía no existe. Las dos salidas posibles eran una tabla de presentación con el kind
// *esperado* (decorativa) o quitar el chip. SE QUITA:
//   · un chip que promete `json` para `json.stringify` mentiría hoy mismo — su salida es un
//     string JSON escapado que los detectores ven como `text`, no como `json`;
//   · esa tabla sería una SEGUNDA verdad sobre los tipos, mantenida a mano en la UI y sin nada
//     que la ate al motor: el día que un detector cambie, nadie se enteraría de que miente;
//   · el usuario no pierde información: el kind real aparece —detectado, no prometido— en el
//     `Badge` «produce» del paso en cuanto lo añade, y ahí sí es verdad.
// El grupo (json / binario / hash / firma) sigue dando la pista de familia que el chip daba.

function nextStepKey(counter: React.RefObject<number>): string {
  counter.current += 1;
  return `step-${String(counter.current)}`;
}

// Píldora del índice del paso — el rail del artboard. Mismo componente visual que el de
// `StepCard` en `/analyze` (misma rejilla, mismos tokens); `tone="accent"` marca los pasos que
// el usuario ha añadido frente a la fuente (`in`).
function IndexPill({ children, tone }: { children: React.ReactNode; tone?: 'accent' }) {
  return (
    <span
      className={
        tone === 'accent'
          ? 'inline-flex size-6.5 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-subtle-bg font-mono text-xs font-semibold text-accent-subtle-fg'
          : 'inline-flex size-6.5 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-2 font-mono text-xs font-semibold text-text-muted'
      }
    >
      {children}
    </span>
  );
}

// Conector vertical entre tarjetas (decorativo: `aria-hidden`, la relación real la da el orden
// del DOM y el número del paso).
function Connector() {
  return (
    <div aria-hidden="true" className="relative ml-3 h-5.5 w-px bg-border-strong">
      <Icon
        name="arrow-down"
        size={13}
        className="absolute -bottom-0.5 -left-1.5 bg-bg text-text-subtle"
      />
    </div>
  );
}

export function ComposeBuilder() {
  const [source, setSource] = useState('');
  const [steps, setSteps] = useState<BuilderStep[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // El tiempo se INYECTA (I4): el motor jamás lee el reloj. Se fija UNA vez al montar para que
  // recomponer no cambie el resultado bajo los pies del usuario (I11: mismo `now` ⇒ mismo
  // resultado byte a byte) y para que el render sea determinista entre servidor y cliente.
  const [now] = useState(() => new Date());
  const keyCounter = useRef(0);
  // Borrador ya leído (y flag ya consumido), guardado en un ref con el MISMO patrón que el
  // pending de `FieldAnalyzer`: la lectura es de un solo uso, pero en StrictMode (dev) el efecto
  // de montaje corre dos veces y el valor debe sobrevivir al segundo pase.
  const draftReadRef = useRef(false);
  const draftRef = useRef<ComposeDraft | null>(null);
  // Foco de la paleta: la afordancia «añadir paso» y el primer chip se sustituyen mutuamente, así
  // que el foco tiene que viajar con ellos o se pierde en `<body>` (ver el comentario de la
  // paleta más abajo). `wantsFocusRef` distingue «la paleta se ha abierto/cerrado por una acción
  // del usuario» de «acaba de montar la pantalla»: en el montaje NO se roba el foco.
  const addStepRef = useRef<HTMLButtonElement>(null);
  const firstChipRef = useRef<HTMLButtonElement>(null);
  const wantsFocusRef = useRef(false);
  const sourceId = useId();

  // Restauración del borrador AL CONMUTAR de modo (ver `lib/work-mode.ts`): solo si venimos del
  // conmutador. Entrar por enlace directo o recargar da pantalla limpia — es la decisión escrita
  // allí, y este efecto es el único sitio que la ejecuta en esta pantalla.
  useEffect(() => {
    if (typeof window === 'undefined') return; // sessionStorage no existe en SSR
    if (!draftReadRef.current) {
      draftReadRef.current = true;
      draftRef.current = parseComposeDraft(takeSwitchedDraft('compose'));
    }
    const draft = draftRef.current;
    if (draft) {
      setSource(draft.source);
      setSteps(
        draft.transforms
          .slice(0, MAX_COMPOSE_STEPS)
          .map((transform) => ({ key: nextStepKey(keyCounter), transform })),
      );
    }
  }, []);

  // Guardado del borrador: sincronización con un sistema externo (sessionStorage), que es
  // exactamente para lo que sirve un efecto. Se guarda la fuente y los ids de los pasos —NUNCA
  // las `options`, donde vivirá el secreto de firma de T6.8 (§11).
  useEffect(() => {
    const empty = source === '' && steps.length === 0;
    // Pantalla vacía ⇒ cadena vacía ⇒ `saveDraft` BORRA la clave (decisión de retención escrita
    // en `lib/work-mode.ts`): vaciar la pantalla no deja rastro en la pestaña.
    saveDraft(
      'compose',
      empty
        ? ''
        : serializeComposeDraft({ source, transforms: steps.map((step) => step.transform) }),
    );
  }, [source, steps]);

  // Sincroniza el foco con el estado de la paleta (un sistema externo: el foco del documento).
  useEffect(() => {
    if (!wantsFocusRef.current) return;
    wantsFocusRef.current = false;
    if (paletteOpen) firstChipRef.current?.focus();
    else addStepRef.current?.focus();
  }, [paletteOpen]);

  const composed = safeCompose(
    source,
    steps.map((step) => ({ transform: step.transform })),
    { now },
  );

  function addStep(transform: string) {
    const key = nextStepKey(keyCounter);
    setSteps((previous) =>
      previous.length >= MAX_COMPOSE_STEPS ? previous : [...previous, { key, transform }],
    );
    closePalette();
  }

  // Abrir/cerrar la paleta SIEMPRE por aquí: son las dos únicas puertas, y las dos declaran que
  // el foco debe seguir a la afordancia que sustituye a la otra.
  function openPalette() {
    wantsFocusRef.current = true;
    setPaletteOpen(true);
  }

  function closePalette() {
    wantsFocusRef.current = true;
    setPaletteOpen(false);
  }

  function removeStep(key: string) {
    setSteps((previous) => previous.filter((step) => step.key !== key));
  }

  function changeTransform(key: string, transform: string) {
    setSteps((previous) =>
      previous.map((step) => (step.key === key ? { ...step, transform } : step)),
    );
  }

  // La receta que edita el usuario siempre valida (los ids salen del catálogo y el tope de 8 lo
  // impone `addStep`), así que este camino es defensa en profundidad: si algún día no valida, la
  // pantalla lo DICE en vez de quedarse en blanco.
  if (!composed.ok) {
    return (
      <Callout tone="danger" title="Esta receta no se puede reproducir" role="alert">
        Los pasos guardados no forman una cadena válida. Quítalos y empieza de nuevo.
      </Callout>
    );
  }

  const result = composed.result;
  const sourceKind = recognizedSourceKind(result);
  const appliedSteps = okStepCount(result);
  const atLimit = steps.length >= MAX_COMPOSE_STEPS;

  return (
    <div>
      {/* eyebrow + resumen de la cadena (el «text → json → jwt» del artboard, dicho con los
          mismos badges que usa `/analyze`: una sola forma de nombrar los tipos en el producto) */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-2xs font-semibold tracking-wide text-text-subtle uppercase">
          la cadena · la construyes tú
        </span>
        <div className="h-px flex-1 bg-border" />
        <ChainSummary kinds={composeChainKinds(result)} size="sm" />
      </div>

      {/* paso 0 — la fuente */}
      <Card className="flex gap-3">
        <IndexPill>in</IndexPill>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <label htmlFor={sourceId} className="text-sm font-medium">
              entrada
            </label>
            <span className="text-xs text-text-subtle">
              escribe o pega lo que quieras codificar
            </span>
            {/* Con el campo vacío NO se anuncia kind: el motor no distingue «vacío» de «texto»
                (I6 devuelve `text` como suelo), así que la supresión la hace la UI. */}
            {sourceKind ? (
              <span
                role="status"
                className="ml-auto inline-flex items-center gap-1.5 text-xs text-text-muted"
              >
                reconocido <Badge kind={sourceKind} size="sm" />
              </span>
            ) : null}
          </div>
          <Textarea
            id={sourceId}
            rows={4}
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
            }}
            placeholder="Escribe o pega el valor del que quieres partir…"
            className="text-sm"
          />
        </div>
      </Card>

      {steps.map((step, position) => {
        // `result.steps` contiene SOLO los pasos ejecutados: la cadena se corta en el primero
        // que falla (I9), así que los siguientes no tienen resultado y se pintan «sin aplicar».
        const executed: ComposeStep | undefined = result.steps[position];
        const number = position + 1;
        return (
          <div key={step.key}>
            <Connector />
            <Card className="flex gap-3">
              <IndexPill tone="accent">{number}</IndexPill>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs whitespace-nowrap text-text-muted">transforma con</span>
                  <div className="w-47.5 max-w-full">
                    <Select
                      mono
                      size="sm"
                      aria-label={`Transformación del paso ${String(number)}`}
                      value={step.transform}
                      options={ALL_TRANSFORMS}
                      onChange={(event) => {
                        changeTransform(step.key, event.target.value);
                      }}
                    />
                  </div>
                  <span className="ml-auto inline-flex items-center gap-2">
                    {executed?.ok && executed.kind ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-text-subtle">
                        <Icon name="corner-down-right" size={13} /> produce{' '}
                        <Badge kind={executed.kind} size="sm" />
                      </span>
                    ) : null}
                    <IconButton
                      icon="x"
                      size="sm"
                      label={`Quitar el paso ${String(number)} (${step.transform})`}
                      onClick={() => {
                        removeStep(step.key);
                      }}
                    />
                  </span>
                </div>

                {executed?.ok && executed.output !== null ? (
                  <CodeBlock title={step.transform} value={executed.output} wrap>
                    {executed.output}
                  </CodeBlock>
                ) : null}

                {/* Un paso puede fallar por sí mismo (I9: se conserva todo lo anterior) — p. ej.
                    `json.minify` sobre algo que no es JSON, o `jwt.sign` sin secreto mientras su
                    panel llega en T6.8. Se dice con el mensaje del motor, no con uno inventado. */}
                {executed && !executed.ok ? (
                  <Callout tone="danger" role="alert">
                    {executed.error}
                  </Callout>
                ) : null}

                {/* …y los pasos POSTERIORES a uno roto no se ejecutan: se dice, en vez de
                    dejarlos mudos como si no hubieran hecho nada. */}
                {executed === undefined ? (
                  <span className="text-xs text-text-subtle">
                    no se aplicó: un paso anterior de la cadena falló.
                  </span>
                ) : null}

                {executed?.notes?.map((note) => (
                  <span
                    key={note}
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-text-muted"
                  >
                    <Icon name="info" size={12} className="text-accent" />
                    {note}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        );
      })}

      <Connector />

      {/* afordancia «añadir paso» → paleta agrupada del catálogo del motor */}
      <div className="ml-9.5">
        {atLimit ? (
          <span className="text-xs text-text-subtle">
            Límite de {MAX_COMPOSE_STEPS} pasos alcanzado: quita alguno para añadir otro.
          </span>
        ) : paletteOpen ? (
          // La paleta SUSTITUYE al disparador (fidelidad al artboard), así que no es un
          // `aria-expanded` lo que la describe —el control que lo llevaría deja de existir— sino
          // el FOCO: al abrir se enfoca el primer chip (`autoFocus` sobre el primer item, ver
          // abajo) y al cerrar vuelve a «añadir paso», que se remonta. Sin esto, el foco caía a
          // `<body>` y quien navega con teclado tenía que recorrer la página entera otra vez.
          // El grupo se nombra para que el lector de pantalla anuncie DÓNDE ha aterrizado.
          <Card padding="sm" role="group" aria-label="Transformaciones disponibles">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <span className="text-xs text-text-muted">
                añade un paso — se aplica sobre la salida anterior
              </span>
              <IconButton
                icon="x"
                size="sm"
                label="Cerrar la paleta de transformaciones"
                onClick={closePalette}
              />
            </div>
            <div className="flex flex-col gap-2.5">
              {CATALOG.map((group, groupIndex) => (
                <div key={group.group} className="flex flex-wrap items-center gap-2.5">
                  <span className="w-15.5 shrink-0 text-2xs font-semibold tracking-wide text-text-subtle uppercase">
                    {group.group}
                  </span>
                  {group.items.map((item, itemIndex) => (
                    <Button
                      key={item.id}
                      ref={groupIndex === 0 && itemIndex === 0 ? firstChipRef : undefined}
                      variant="secondary"
                      size="sm"
                      className="gap-1.75 font-mono"
                      onClick={() => {
                        addStep(item.id);
                      }}
                    >
                      {item.label}
                      <Icon name="chevron-right" size={12} className="text-text-subtle" />
                    </Button>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Button
            ref={addStepRef}
            variant="ghost"
            size="sm"
            className="gap-2 border-dashed border-border-strong text-text-muted"
            onClick={openPalette}
          >
            <Icon name="chevron-down" size={14} />
            añadir paso
          </Button>
        )}
      </div>

      {/* ── LA BARRA DE RESULTADO ────────────────────────────────────────────────────────
          Gateada con `terminal === 'ok'` Y `steps.length > 0` (`showResultBar`), NUNCA con
          `output != null`: con un paso roto, `output` es el parcial del último paso correcto
          (ofrecerlo sería dar por bueno un resultado incompleto), y con receta vacía es la
          propia fuente. El contador son los pasos APLICADOS, no las filas de la pantalla. */}
      {showResultBar(result) && result.output !== null ? (
        <Card padding="sm" className="mt-6 overflow-hidden border-accent/35 p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-accent/20 bg-accent-subtle-bg px-4 py-3">
            <span className="inline-flex flex-wrap items-center gap-2">
              <Icon name="check" size={15} className="text-accent" />
              <span className="text-sm font-semibold text-accent-subtle-fg">resultado</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                · {appliedSteps} {appliedSteps === 1 ? 'paso' : 'pasos'} ·
                {result.outputKind ? <Badge kind={result.outputKind} size="sm" /> : null} listo para
                compartir
              </span>
            </span>
            <CopyButton value={result.output} withLabel label="Copiar el resultado" />
          </div>
          <CodeBlock value={result.output} copyable={false} wrap className="rounded-none border-0">
            {result.output}
          </CodeBlock>
        </Card>
      ) : null}

      <div className="mt-6">
        <Callout tone="security" title={COMPOSE_PRIVACY_HEADLINE}>
          {COMPOSE_PRIVACY_DETAIL}
        </Callout>
      </div>
    </div>
  );
}
