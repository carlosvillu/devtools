// El motor de cadena (PRD §6): `analyze(input, { now })` construye la `Chain` completa
// del §6.1 encadenando detectar → aplicar la transformación por defecto → re-detectar
// sobre el resultado, hasta un final legítimo. Es PEGAMENTO puro y total (I1): reutiliza
// `detect()` (T1.1) y `buildTransformIndex(now)` / `defaultTransformId()` (T1.2); no
// reimplementa ni detección ni transformación. Determinista (I5): mismo input + mismo
// `now` ⇒ misma `Chain` byte a byte — no lee el reloj (I4: el `now` entra por el caller y
// se cierra en el índice de transformaciones), no itera `Map`/`Set` (solo `.get`/`.has`).
import { detect } from './detectors';
import { buildTransformIndex, defaultTransformId } from './transforms';
import type { Chain, ChainStep, Detection, Transform, TransformResult } from './contracts';

// Profundidad máxima (I2): la `Chain` NUNCA tiene más de 8 pasos. Al alcanzar el tope tras
// un paso productivo, la cadena termina con `terminal:'max_depth'` — final legítimo, no error.
const MAX_STEPS = 8;

export interface AnalyzeOptions {
  now: Date;
}

// Firma de la función de detección, para poder inyectar el orquestador real (`detect`) en
// producción y un grafo controlado en los tests del bucle (I3 no es alcanzable con las
// transformaciones reales de v1 — todas encogen o convergen; ver `analyze.test.ts`).
type DetectFn = (input: string) => Detection[];

// Construye un `ChainStep` productivo (con transformación aplicada). Copia las `notes` de la
// transformación al paso (§6.5: la nota `exp` del JWT debe llegar a la UI, criterio 14.1).
function productiveStep(
  index: number,
  input: string,
  detections: Detection[],
  applied: string,
  result: Extract<TransformResult, { ok: true }>,
): ChainStep {
  const step: ChainStep = { index, input, detections, applied, output: result.output };
  if (result.notes !== undefined && result.notes.length > 0) step.notes = result.notes;
  return step;
}

// Un paso terminal SIN transformación aplicada (`text` / `no_transform` / `error`): `applied`
// y `output` son `null` (§6.1: `applied` = id REALMENTE aplicado; aquí no se aplicó ninguno).
function terminalStep(index: number, input: string, detections: Detection[]): ChainStep {
  return { index, input, detections, applied: null, output: null };
}

// El bucle de encadenado del §6, aislado de la construcción del índice para poder ejercitar
// el guard de ciclos (I3) con un grafo inyectado. `analyze()` lo cablea con lo REAL.
export function runChain(
  input: string,
  detectInput: DetectFn,
  index: Map<string, Transform>,
): Chain {
  const steps: ChainStep[] = [];
  // Inputs ya vistos (incluido el original), para el guard de ciclos (I3).
  const seenInputs = new Set<string>();
  let current = input;

  try {
    for (;;) {
      const stepIndex = steps.length;
      const detections = detectInput(current);
      const chosen = detections[0];

      // `text` es terminal (I6): es el suelo de la cadena, no hay transformación desde él.
      // `detect()` siempre devuelve al menos `text`, así que `chosen` nunca es undefined; el
      // guard mantiene la totalidad si algún día se inyecta un detector que devuelve vacío.
      if (chosen === undefined || chosen.kind === 'text') {
        steps.push(terminalStep(stepIndex, current, detections));
        return { steps, terminal: 'text' };
      }

      seenInputs.add(current);

      // Transformación por defecto del kind elegido (§6.3). `null` solo para `text` (ya
      // descartado). Si el id no resuelve a una `Transform`, no hay nada válido que aplicar:
      // se cierra como `text` (no es un fallo de transformación, es "nada que hacer").
      const id = defaultTransformId(chosen.kind, current);
      const transform = id === null ? undefined : index.get(id);
      if (id === null || transform === undefined) {
        steps.push(terminalStep(stepIndex, current, detections));
        return { steps, terminal: 'text' };
      }

      const result = transform.apply(current);

      // Fallo de la transformación (I1): la cadena termina en `error` conservando los previos.
      if (!result.ok) {
        steps.push(terminalStep(stepIndex, current, detections));
        return { steps, terminal: 'error' };
      }

      // La transformación no aporta: su salida es idéntica a su entrada (§6.5). No se re-aplica
      // → `no_transform`. Se comprueba ANTES que el ciclo: un punto fijo es "nada que hacer",
      // no un bucle (por eso el paso 2 del §6.5 es terminal, no un ciclo cortado por I2).
      if (result.output === current) {
        steps.push(terminalStep(stepIndex, current, detections));
        return { steps, terminal: 'no_transform' };
      }

      // Ciclo (I3): el output ya apareció como input de un paso anterior (incluido el original).
      // Se registra el paso CON su `applied` y `output` (a diferencia de los terminales sin
      // transformación) y se corta, conservando los previos.
      if (seenInputs.has(result.output)) {
        steps.push(productiveStep(stepIndex, current, detections, id, result));
        return { steps, terminal: 'cycle' };
      }

      // Paso productivo: se registra y se continúa re-detectando sobre el output.
      steps.push(productiveStep(stepIndex, current, detections, id, result));
      current = result.output;

      // Tope de profundidad (I2): tras un paso productivo, si ya hay 8 pasos, se para. El
      // último paso conserva su `applied`/`output` reales (no es un error): es el único
      // terminal cuyo paso final lleva transformación aplicada.
      if (steps.length >= MAX_STEPS) {
        return { steps, terminal: 'max_depth' };
      }
    }
  } catch {
    // I1 (defensa en profundidad): `analyze` NUNCA lanza. Las transformaciones y los detectores
    // son totales, así que este catch es inalcanzable con el código real; existe para que un
    // fallo inesperado se traduzca a una `Chain` válida en vez de propagar una excepción.
    steps.push(terminalStep(steps.length, current, []));
    return { steps, terminal: 'error' };
  }
}

// API pública del motor de cadena. Cablea el `detect()` real y el índice de transformaciones
// construido con el `now` inyectado (I4). Puro y total dado `input` + `now` (I5).
export function analyze(input: string, options: AnalyzeOptions): Chain {
  return runChain(input, detect, buildTransformIndex(options.now));
}
