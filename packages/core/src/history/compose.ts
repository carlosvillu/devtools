// 🔴 LA FRONTERA DE PERSISTENCIA DE UNA RECETA (T6.10, D10, §9/§11) — el corazón de seguridad
// de la fase. Aquí, y solo aquí, se decide qué de una composición llega a la BD.
//
// LO QUE ENTRA (allowlist, no blacklist): por cada paso, EXCLUSIVAMENTE `transform_id` y `kind`,
// que son dato DEL MOTOR (el id del catálogo §6.6 y el kind detectado sobre la salida, I10), no
// del usuario. Lo que NO entra: el fuente, el resultado, y —el que más muerde— el `secret` de
// `jwt.sign`, que vive en `ComposeStepSpec.options`. El schema del cuerpo (`HistoryComposeBody`,
// `.strict()`) ya rechaza con 400 cualquier `options`/`secret`/`source`; esta función es la
// SEGUNDA línea: aunque un paso llegara con campos de más, aquí se ENUMERA lo que se lee, así que
// no hay por dónde copiar un secreto a la fila. Allowlist por construcción.
//
// El `preview` es una ETIQUETA SINTÉTICA generada AQUÍ, en el servidor, a partir del número de
// pasos: ni un solo carácter escrito por el usuario. El fuente/resultado/secreto nunca salieron
// del navegador (§5.3), así que el servidor no podría ponerlos aunque quisiera.
import type { HistoryComposeStep } from './contracts';
import type { ChainSummaryStep } from './redact';

export interface ComposeHistoryRecordDraft {
  preview: string;
  inputKind: string;
  chain: ChainSummaryStep[];
  direction: 'compose';
}

/** La etiqueta sintética del preview de una receta: «compuesto · N pasos». Determinista y sin
 *  ningún dato del usuario — solo el recuento, que es del motor. */
export function buildComposePreview(stepCount: number): string {
  return `compuesto · ${String(stepCount)} ${stepCount === 1 ? 'paso' : 'pasos'}`;
}

/**
 * Construye la fila de historial de una composición a partir de la receta ya validada. Es la
 * única función que el borde de `POST /api/history` debe usar para llegar a la BD.
 *
 * `steps` viene validado por `HistoryComposeBodySchema` (`.min(1)`), así que el primer paso
 * existe; se comprueba igualmente para no depender de una invariante externa (un bug de cableado
 * que llamara con `[]` debe fallar ruidosamente, no escribir una fila con `inputKind` inventado).
 */
export function buildComposeHistoryRecord(steps: HistoryComposeStep[]): ComposeHistoryRecordDraft {
  const first = steps[0];
  if (!first) throw new Error('buildComposeHistoryRecord: la receta no tiene pasos');
  return {
    preview: buildComposePreview(steps.length),
    // `input_kind` = el kind del PRIMER paso (§9): dato del motor, no del usuario.
    inputKind: first.kind,
    // Se leen SOLO `transform_id` y `kind`. Ningún otro campo del paso se toca (allowlist).
    chain: steps.map((step) => ({ kind: step.kind, transformId: step.transform_id })),
    direction: 'compose',
  };
}
