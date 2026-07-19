// Derivación del registro de historial a partir de (input, Chain) — PRD §8 «Redacción
// (D7)» y §11. Lógica PURA: es el único sitio donde se decide qué se parece al dato del
// usuario y qué no, para que sea unit-testable y auditable de un vistazo.
//
// 🔴 REGLA DE ORO (criterio 14.8): el input crudo NO se persiste ni se loguea. De aquí
// solo pueden salir dos cosas:
//   - `preview`: redactado (si el kind es `jwt`, payload y firma → `…`) y truncado a 120.
//   - `chain`:   SOLO `[{ kind, transformId }]`. Ningún valor intermedio, ni truncado.
// Añadir aquí cualquier campo que transporte `step.input`/`step.output` rompe D7.
import type { Chain } from '../engine/contracts';

/** Máximo de caracteres de `preview` (PRD §9: «truncado + redactado (D7), máx 120 chars»). */
export const PREVIEW_MAX_CHARS = 120;

/** Marca de redacción/truncado. */
const ELLIPSIS = '…';

/** Resumen de un paso: tipo detectado + transformación aplicada (null si terminal).
 *  Estructuralmente compatible con `ChainSummaryEntry` de `@app/db` (core no puede
 *  importar de db: la dirección de dependencias es db → core). */
export interface ChainSummaryStep {
  kind: string;
  transformId: string | null;
}

export interface HistoryRecordDraft {
  preview: string;
  inputKind: string;
  chain: ChainSummaryStep[];
}

/**
 * Redacta el input según su kind detectado. Para `jwt` conserva ÚNICAMENTE el header
 * (y el prefijo `Bearer ` si lo traía, que el detector tolera) y sustituye payload y
 * firma por `…`; para el resto no hay redacción por kind, solo el truncado posterior.
 */
export function redactInput(input: string, kind: string): string {
  const trimmed = input.trim();
  if (kind !== 'jwt') return trimmed;

  const bearer = /^(Bearer\s+)/i.exec(trimmed);
  const prefix = bearer?.[1] ?? '';
  const token = trimmed.slice(prefix.length);
  const segments = token.split('.');
  // Un `jwt` siempre trae 3 segmentos; si por lo que sea no los trae, se redacta TODO
  // menos el primer segmento igualmente (fallar hacia el lado seguro, nunca hacia el dato).
  if (segments.length < 2) return `${prefix}${ELLIPSIS}`;
  const [header] = segments;
  const redactedRest = segments.slice(1).map(() => ELLIPSIS);
  return `${prefix}${[header, ...redactedRest].join('.')}`;
}

/** Trunca a `PREVIEW_MAX_CHARS` contando el propio marcador de truncado. */
export function truncatePreview(value: string, max: number = PREVIEW_MAX_CHARS): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}${ELLIPSIS}`;
}

/** `preview` final: se redacta PRIMERO y se trunca DESPUÉS — al revés, un truncado
 *  «afortunado» podría dejar pasar medio payload de un JWT largo. */
export function buildPreview(input: string, kind: string): string {
  return truncatePreview(redactInput(input, kind));
}

/** Kind del paso 0 (§9 `input_kind`): la detección elegida (la de mayor confianza).
 *  Sin detecciones, `text` — el motor siempre detecta al menos `text`, pero el default
 *  evita que un hueco del motor escriba `null` en una columna NOT NULL. */
export function inputKindOf(chain: Chain): string {
  return chain.steps[0]?.detections[0]?.kind ?? 'text';
}

/** Resumen de la cadena (D7): por cada paso, tipo detectado y transformación aplicada.
 *  JAMÁS `step.input` ni `step.output`. */
export function summarizeChain(chain: Chain): ChainSummaryStep[] {
  return chain.steps.map((step) => ({
    kind: step.detections[0]?.kind ?? 'text',
    transformId: step.applied,
  }));
}

/**
 * Construye la fila de historial a persistir a partir del input crudo y la cadena. Es
 * la ÚNICA función que el route handler debe usar para llegar a la BD: recibe el dato
 * crudo y devuelve algo que ya no lo contiene.
 */
export function buildHistoryRecord(input: string, chain: Chain): HistoryRecordDraft {
  const inputKind = inputKindOf(chain);
  return {
    preview: buildPreview(input, inputKind),
    inputKind,
    chain: summarizeChain(chain),
  };
}
