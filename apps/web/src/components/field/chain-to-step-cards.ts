// Traducción de dominio: `Chain` de `@app/core/engine` → props planas que consumen los
// composites PUROS del DS (StepCard/ChainSummary). Esta es la capa que la regla de lint de
// TD.5 empuja fuera de `components/chain/`: aquí SÍ se conocen los contratos de `@app/core`.
// Funciones puras (sin React, sin estado) → unit-testeables sin jsdom (architecture.md §2.3).
import {
  KINDS_COEXISTING_WITH_TEXT,
  transformsForKind,
  type Chain,
  type ChainStep,
  type ChainTerminal,
  type DataKind,
} from '@app/core/engine';

// Vista de un StepCard. `alternatives` y `transforms` (T1.6) alimentan los affordances de
// desvío de O4/O5; los handlers (`onSelectTransform`/`onSelectAlternative`) los cablea el
// componente cliente (FieldAnalyzer), no esta función pura.
export interface StepCardView {
  index: number;
  kind?: DataKind;
  confidence?: number;
  applied?: string;
  alternatives: DataKind[];
  transforms: { value: string; label: string }[];
  output?: string;
  notes?: string[];
  terminal?: ChainTerminal;
}

// Umbral de I8: una detección descartada solo se ofrece como alternativa si es plausible.
const ALTERNATIVE_MIN_CONFIDENCE = 0.3;

/**
 * Alternativas de detección a mostrar (O5/I8) para un paso: las detecciones DESCARTADAS con
 * confianza ≥ 0.3, MÁS `text` cuando el kind elegido convive siempre con texto (§6.2). Nunca
 * incluye el kind ya elegido ni duplica `text`.
 */
export function alternativesForStep(step: ChainStep): DataKind[] {
  const chosen = step.detections[0];
  const result: DataKind[] = [];
  for (const detection of step.detections.slice(1)) {
    if (detection.confidence >= ALTERNATIVE_MIN_CONFIDENCE && !result.includes(detection.kind)) {
      result.push(detection.kind);
    }
  }
  if (chosen && KINDS_COEXISTING_WITH_TEXT.has(chosen.kind) && !result.includes('text')) {
    result.push('text');
  }
  return result;
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
    // Opciones del picker (O4): las transformaciones aplicables al kind elegido, derivadas del
    // REGISTRO del motor (no una lista a mano). StepCard solo muestra el picker si hay > 1.
    const transforms = chosen
      ? transformsForKind(chosen.kind).map((t) => ({ value: t.id, label: t.label }))
      : [];
    return {
      index: step.index,
      kind: chosen?.kind,
      confidence: chosen?.confidence,
      applied: step.applied ?? undefined,
      alternatives: alternativesForStep(step),
      transforms,
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
 * «No se reconoció ningún formato»: el MOTOR no supo reconocer el input — su detección elegida
 * en el paso 0 es `text` (el suelo, I6). Es DISTINTO de un timestamp (que SÍ se detecta y acaba
 * en `text`) y —clave para T1.6— DISTINTO de un input que el usuario decidió leer como texto vía
 * un override (O5): ahí el paso 0 sigue detectando su kind real (p. ej. `unix_timestamp`), así
 * que NO es «no reconocido» y la UI muestra el paso (con su badge y el marcador terminal), no el
 * callout genérico. El criterio es el kind detectado en el origen, no «¿se aplicó algo?».
 */
export function isUnrecognized(chain: Chain): boolean {
  const first = chain.steps[0];
  return first !== undefined && first.detections[0]?.kind === 'text';
}
