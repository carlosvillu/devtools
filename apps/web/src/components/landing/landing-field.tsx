'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Icon } from '@/components/ui/icon';
import { Kbd } from '@/components/ui/kbd';
import { PENDING_INPUT_KEY } from '@/lib/pending-input';

// Campo de la landing (`/`) — la isla `'use client'` de una página por lo demás estática
// (frontend/architecture.md §2.1: la frontera va en la hoja interactiva, no en la página). NO
// analiza aquí: la landing NUNCA muestra la cadena. Su único trabajo es HACER EL RELEVO a
// `/analyze`, donde `FieldAnalyzer` (T5.1) consume el input y lo analiza.
//
// §11 del PRD — el input JAMÁS toca la URL: el relevo escribe el valor en
// `sessionStorage[PENDING_INPUT_KEY]` (clave con fuente única en `lib/pending-input.ts`) y navega
// con `router.push('/analyze')` SIN query ni fragment. Un query param filtraría el JWT a la barra,
// al historial del navegador, al `Referer` y a los logs de Caddy/Cloudflare — la clase de fuga que
// F3/F4 cerraron. El e2e de la landing lo blinda con un control negativo (URL de `/analyze` sin el
// input) que se pone rojo si se reintroduce el input en la URL.

// JWT de JUGUETE del botón «Pega un ejemplo». NO es un secreto: firma y payload son literales
// `test-…-not-a-secret` evidentes; decodifica a jwt → json con expiración en 2030 («caduca en…»).
// Fuente única del ejemplo (el e2e ejercita el aterrizaje, no el literal).
const EXAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItbm90LWEtc2VjcmV0IiwibmFtZSI6ImRldnRvb2xzIGRlbW8iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTkwMDAwMDAwMH0.dGVzdC1zaWduYXR1cmUtbm90LWEtc2VjcmV0';

export function LandingField() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Igual que `FieldAnalyzer`: el pegado se marca en `onPaste` y se resuelve en `onChange`, cuando
  // el valor ya incluye lo pegado. Sin este ref no habría forma de distinguir pegar de teclear.
  const pastedRef = useRef(false);
  const has = value.trim().length > 0;

  // El relevo a `/analyze`: guarda el input en sessionStorage y navega. NUNCA pone el input en la
  // URL (§11). Con el campo vacío no hace nada (no se puede analizar la nada).
  function handoff(input: string) {
    if (input.trim() === '') return;
    window.sessionStorage.setItem(PENDING_INPUT_KEY, input);
    router.push('/analyze');
  }

  function onChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = event.target.value;
    setValue(next);
    if (pastedRef.current) {
      pastedRef.current = false;
      handoff(next); // pegar → salta a /analyze de inmediato
    }
    // Teclear sin Enter NO navega: se espera (a diferencia de `/analyze`, aquí no hay análisis).
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter durante la composición de un IME (CJK, `keyCode 229`) CONFIRMA el candidato, no
    // analiza: navegar aquí saltaría a /analyze con el texto parcial a destiempo. Se ignora.
    if (event.nativeEvent.isComposing) return;
    // Enter sin Shift = analizar (salta a /analyze). `preventDefault` es OBLIGATORIO: sin él, en un
    // `<textarea>` Enter solo inserta un salto de línea y jamás navega. Shift+Enter deja el salto.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handoff(value);
    }
  }

  function clear() {
    setValue('');
    textareaRef.current?.focus();
  }

  return (
    <div className="w-full max-w-155">
      {/* Campo píldora: el contenedor es dueño del estado de foco (borde acento + focus-ring) vía
          `focus-within`; el `Textarea` del DS va dentro con su borde/relleno/anillo neutralizados
          para no duplicar el marco. Click en cualquier zona enfoca el campo. */}
      <div
        onClick={() => textareaRef.current?.focus()}
        className="flex items-start gap-3 rounded-xl border border-border-strong bg-surface px-4.5 py-4 shadow-sm transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-ring"
      >
        <Icon name="terminal" size={20} aria-hidden className="mt-0.5 shrink-0 text-text-subtle" />
        <Textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onPaste={() => {
            pastedRef.current = true;
          }}
          aria-label="Pega algo para analizar"
          placeholder="Pega un JWT, base64, JSON, timestamp, URL…"
          className="max-h-52 resize-none border-transparent bg-transparent p-0 text-sm focus-visible:border-transparent focus-visible:ring-0"
        />
        {has ? (
          <IconButton
            icon="x"
            label="limpiar"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              clear();
            }}
            className="mt-0.5 shrink-0"
          />
        ) : null}
      </div>

      <div className="mt-5 flex flex-col items-center gap-4">
        <Button
          variant="secondary"
          onClick={() => {
            handoff(EXAMPLE_JWT);
          }}
        >
          Pega un ejemplo
        </Button>
        {/* Pista del disparo sin botón (14.1 intacto): ⌘V pega y Enter analiza. */}
        <span className="inline-flex flex-wrap items-center justify-center gap-2 text-xs text-text-subtle">
          <span className="inline-flex gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>V</Kbd>
          </span>
          pega y analiza
          <span aria-hidden>·</span>
          <Kbd>Enter</Kbd>
          para analizar
        </span>

        {/* Afordancia TERCIARIA a la dirección inversa (`/compose`, T6.7). Discreta a propósito
            (T6.9): el campo y «Pega un ejemplo» mandan; esto solo señala que la otra dirección
            EXISTE, sin robarle protagonismo. Es navegación NORMAL a `/compose` — NO usa el relevo
            por sessionStorage de `handoff` (componer arranca en blanco, no arrastra el input; el
            control negativo §11 solo cubre el flujo de pegar → /analyze, que queda intacto).
            `Link` estilado con tokens (mismo registro que el footer/«Entrar»), no un `<a>` crudo. */}
        <Link
          href="/compose"
          className="text-xs text-text-subtle transition-colors hover:text-text-muted"
        >
          ¿al revés?{' '}
          <span className="font-medium text-text-muted underline underline-offset-4">
            compón algo
          </span>{' '}
          y lo empaqueta
        </Link>
      </div>
    </div>
  );
}
