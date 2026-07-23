import type { ComposeResult, DataKind } from '@app/core/engine';
import type { HistoryComposeStep } from '@app/core/history';

// Las decisiones de PRESENTACIÓN de `/compose` derivadas de un `ComposeResult`, extraídas del
// componente como funciones puras (frontend/architecture.md §2.3): son exactamente las tres
// trampas de cableado que T6.6 dejó documentadas en el contrato, y aquí se testean sin jsdom en
// milisegundos en vez de a través del DOM.

/**
 * Cuántos pasos SE APLICARON de verdad. `result.steps` incluye el paso fallido (I9 conserva el
 * trabajo previo y registra el fallo), así que contarlos todos anunciaría un paso que no produjo
 * nada. Es el contador de la barra de resultado del artboard.
 */
export function okStepCount(result: ComposeResult): number {
  return result.steps.filter((step) => step.ok).length;
}

/**
 * ¿Se pinta la barra de resultado? DOS condiciones, y ninguna es `output != null`:
 *   · `terminal === 'ok'` — con `terminal: 'error'`, `output` es el parcial del ÚLTIMO PASO OK,
 *     así que una barra «copiar resultado» encima de una pantalla que muestra un fallo le daría
 *     al usuario un resultado incompleto creyendo que es el bueno.
 *   · `steps.length > 0` — con receta vacía `output === source` (I12), y sin este gate la barra
 *     duplicaría la fuente bajo un «· 0 pasos ·».
 */
export function showResultBar(result: ComposeResult): boolean {
  return result.terminal === 'ok' && result.steps.length > 0;
}

/**
 * El kind a mostrar como «reconocido» junto a la entrada, o `null` si no hay nada escrito.
 * El motor NO distingue «vacío» de «texto»: con el campo vacío `sourceKind` es `text` (el suelo
 * de I6), así que la supresión del badge la hace la UI — anunciar «reconocido: text» sobre un
 * campo en blanco sería ruido que además parece un fallo de detección.
 */
export function recognizedSourceKind(result: ComposeResult): DataKind | null {
  return result.source.trim() === '' ? null : result.sourceKind;
}

/**
 * Los kinds de la cadena para el resumen de una línea: la fuente y luego la salida de cada paso
 * que se aplicó. Los pasos fallidos no aportan kind (no tienen salida que detectar, I10).
 */
export function composeChainKinds(result: ComposeResult): DataKind[] {
  const kinds: DataKind[] = [result.sourceKind];
  for (const step of result.steps) {
    if (step.ok && step.kind !== null) kinds.push(step.kind);
  }
  return kinds;
}

/**
 * 🔴 LA RECETA QUE SE REGISTRA en `/history` (T6.10) — y SOLO la receta. De cada paso APLICADO
 * (`ok`, con `kind` detectado, I10) se toman EXCLUSIVAMENTE `transform_id` y `kind`, que son dato
 * del motor. NO se toca `input`/`output` (el dato del usuario, §11) ni las `options` del paso
 * (donde vive el secreto de firma): el `ComposeStep` del resultado ni siquiera tiene `options`
 * (por contrato, §6.6), así que no hay por dónde colarlo. Devuelve `[]` si el resultado no es un
 * éxito terminal (nada que registrar): el llamante solo debe registrar cuando hay barra de
 * resultado (`showResultBar`), y esta función lo respalda por si se cablea mal.
 */
export function historyRecipe(result: ComposeResult): HistoryComposeStep[] {
  if (result.terminal !== 'ok') return [];
  const steps: HistoryComposeStep[] = [];
  for (const step of result.steps) {
    if (step.ok && step.kind !== null) {
      steps.push({ transform_id: step.transform, kind: step.kind });
    }
  }
  return steps;
}
