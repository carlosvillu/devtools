// Traducción de dominio: `Chain` de `@app/core/engine` → props planas que consumen los
// composites PUROS del DS (StepCard/ChainSummary). Esta es la capa que la regla de lint de
// TD.5 empuja fuera de `components/chain/`: aquí SÍ se conocen los contratos de `@app/core`.
// Funciones puras (sin React, sin estado) → unit-testeables sin jsdom (architecture.md §2.3).
import type { Chain, ChainTerminal, DataKind } from '@app/core/engine';

// Vista de un StepCard. Refleja el subconjunto de props de StepCard que T1.5 rellena; las
// alternativas de detección y el picker de desvío (`alternatives`/`transforms`) son de T1.6
// y se dejan fuera a propósito.
export interface StepCardView {
  index: number;
  kind?: DataKind;
  confidence?: number;
  applied?: string;
  output?: string;
  notes?: string[];
  terminal?: ChainTerminal;
}

/**
 * Un StepCardView por paso de la cadena. La detección elegida es `detections[0]` (el motor
 * las entrega por confianza desc). El motivo terminal de la cadena se pinta SOLO en el último
 * paso (contrato de StepCard: `terminal` marca el fin de la cadena en la última tarjeta).
 */
export function chainToStepCards(chain: Chain): StepCardView[] {
  const last = chain.steps.length - 1;
  return chain.steps.map((step, i) => {
    const chosen = step.detections[0];
    return {
      index: step.index,
      kind: chosen?.kind,
      confidence: chosen?.confidence,
      applied: step.applied ?? undefined,
      output: step.output ?? undefined,
      notes: step.notes,
      terminal: i === last ? chain.terminal : undefined,
    };
  });
}

/**
 * Kinds distintos-consecutivos para el ChainSummary (`jwt → json`, no `jwt → json → json`).
 * La misma kind puede repetirse entre pasos (p. ej. `json.format` re-detecta `json`); el
 * resumen colapsa las repeticiones adyacentes conservando el orden.
 */
export function chainKinds(chain: Chain): DataKind[] {
  const kinds: DataKind[] = [];
  for (const step of chain.steps) {
    const kind = step.detections[0]?.kind;
    if (kind && kind !== kinds[kinds.length - 1]) kinds.push(kind);
  }
  return kinds;
}

/**
 * «No se reconoció ningún formato»: ningún paso aplicó una transformación, así que el input
 * se quedó en su forma cruda (terminal `text`). Es DISTINTO de, p. ej., un timestamp, que SÍ
 * transforma y también acaba en `text`: por eso el criterio es «¿se aplicó algo?», no el
 * terminal. Con esto la UI dice explícitamente qué se intentó en vez de mostrar pantalla vacía.
 */
export function isUnrecognized(chain: Chain): boolean {
  return chain.steps.every((step) => step.applied === null);
}
