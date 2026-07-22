// El motor de COMPOSICIÓN (PRD §6.6): `compose(source, steps, { now })` aplica EN ORDEN los
// pasos que el usuario ha elegido, encadenando la salida de cada uno a la entrada del siguiente.
//
// Es el ESPEJO de `analyze()` (§6, `analyze.ts`), no su primo, y la diferencia cabe en una
// línea: `analyze()` se auto-conduce (detecta → transforma → re-detecta → decide el siguiente
// paso) y `compose()` **no decide nada** (I12) — el usuario manda. De ahí que aquí no haya
// `defaultTransformId`, ni guard de ciclos, ni `no_transform`: no hay bucle que gobernar, hay
// una lista que ejecutar. Lo que sí comparten, y es el punto de I10, es la VERDAD SOBRE LOS
// TIPOS: los dos llaman al mismo `detect()` de §6.2.
//
// PEGAMENTO puro y total (I9, hereda I1): no reimplementa ninguna transformación (las trae
// `buildEncodeIndex`), no lee el reloj (I4: `now` entra por el caller y se cierra en el índice)
// y no itera `Map`/`Set` (solo `.get`), de donde sale el determinismo byte a byte (I11).
//
// CORRE EN EL NAVEGADOR (D10, §5.3): este módulo es la RAÍZ del cono de imports que
// `client-only.test.ts` escanea. Nada de lo alcanzable desde aquí puede usar `node:*`,
// `Buffer` ni `crypto.subtle` — por eso T6.6 sacó `Buffer` de `detectors.ts`/`transforms.ts`
// (ver `base64.ts`), que I10 arrastra al cliente al re-detectar tras cada paso.
import { type ZodError } from 'zod';
import { ComposeRecipeSchema } from './contracts';
import { detect } from './detectors';
import { buildEncodeIndex } from './encode-transforms';
import type {
  ComposeResult,
  ComposeStep,
  ComposeStepSpec,
  DataKind,
  EncodeTransform,
  TransformResult,
} from './contracts';

export interface ComposeOptions {
  // El tiempo se inyecta (I4): el `iat` de `jwt.sign` sale de aquí, nunca del reloj del sistema.
  now: Date;
}

// I10 en una función: el kind de un texto se DETECTA con los detectores de §6.2 y se toma la
// detección de mayor confianza. `detect()` siempre devuelve al menos `text` (I6), así que el
// `?? 'text'` es defensa en profundidad, no un caso real.
//
// El `try/catch` cierra la MISMA asimetría que el de `runCompose` alrededor de `apply`: sin él,
// la totalidad de `compose()` (I9) descansaría en que `detect()` sea total —cierto hoy, y con
// tests— en vez de en código propio. Un detector que lanzara degradaría el kind a `text`, que
// es el suelo legítimo (I6), en vez de tumbar el motor en el navegador del usuario.
function kindOf(value: string): DataKind {
  try {
    return detect(value)[0]?.kind ?? 'text';
  } catch {
    return 'text';
  }
}

function failedStep(index: number, transform: string, input: string, error: string): ComposeStep {
  return { index, transform, input, ok: false, output: null, kind: null, error };
}

// El bucle, aislado del cableado del índice para poder ejercitarlo con un catálogo inyectado
// (mismo patrón que `runChain`). `compose()` lo cablea con lo REAL.
export function runCompose(
  source: string,
  steps: ComposeStepSpec[],
  index: Map<string, EncodeTransform>,
): ComposeResult {
  const executed: ComposeStep[] = [];
  const sourceKind = kindOf(source);
  let current = source;
  // `output` arranca en `source` SOLO si la receta está vacía (I12: sin pasos, la fuente tal
  // cual). Con receta no vacía arranca en `null` y solo lo pisa un paso ok: si falla el primero,
  // no hay «último paso ok» que devolver (§6.6).
  let output: string | null = steps.length === 0 ? source : null;
  let outputKind: DataKind | null = steps.length === 0 ? sourceKind : null;

  for (const [position, spec] of steps.entries()) {
    // `index` empieza en 1: la fuente es el paso 0 y no es un `ComposeStep` (§6.6).
    const stepIndex = position + 1;
    const transform = index.get(spec.transform);

    // Un id que no está en el catálogo es un fallo DEL PASO, no una excepción: la receta puede
    // venir del historial (§9) y nombrar una transformación que ya no existe. I12 manda que
    // NO se salte: se registra fallido y la cadena termina ahí, conservando lo anterior.
    if (transform === undefined) {
      executed.push(
        failedStep(
          stepIndex,
          spec.transform,
          current,
          `No existe la transformación «${spec.transform}» en el catálogo de composición.`,
        ),
      );
      return { source, sourceKind, steps: executed, output, outputKind, terminal: 'error' };
    }

    let result: TransformResult;
    try {
      result = transform.apply(current, spec.options);
    } catch {
      // I9 (defensa en profundidad): las transformaciones del catálogo son totales por contrato
      // y sus tests lo fijan, así que este catch es inalcanzable con el código real. Existe para
      // que un fallo inesperado se traduzca a un `ComposeResult` válido —con TODO lo anterior
      // intacto— en vez de propagar una excepción al navegador del usuario.
      result = { ok: false, error: 'La transformación falló de forma inesperada.' };
    }

    // Fallo del paso (I9): se registra CON su error, se conserva todo lo anterior y la cadena
    // termina ahí. Un paso roto no borra el trabajo del usuario.
    if (!result.ok) {
      executed.push(failedStep(stepIndex, spec.transform, current, result.error));
      return { source, sourceKind, steps: executed, output, outputKind, terminal: 'error' };
    }

    const kind = kindOf(result.output);
    const step: ComposeStep = {
      index: stepIndex,
      transform: spec.transform,
      input: current,
      ok: true,
      output: result.output,
      kind,
    };
    // Se omite `notes` cuando no hay notas en vez de emitir `notes: []` (mismo criterio que
    // `productiveStep` en `analyze.ts`): la UI no debe distinguir «sin notas» de «lista vacía».
    if (result.notes !== undefined && result.notes.length > 0) step.notes = result.notes;
    executed.push(step);

    current = result.output;
    output = result.output;
    outputKind = kind;
  }

  return { source, sourceKind, steps: executed, output, outputKind, terminal: 'ok' };
}

// API pública del motor de composición. Cablea el `detect()` real (dentro de `runCompose`) y el
// catálogo de codificación construido con el `now` inyectado (I4).
//
// ██ ESTA FUNCIÓN LANZA SI LA RECETA NO VALIDA ██ y conviene leer con precisión CUÁNDO, porque
// no es solo el caso de los 9 pasos. `ComposeRecipeSchema.parse` rechaza —con `ZodError`— todo
// esto: más de 8 pasos, `steps` que no es un array, un paso que no es objeto (`null`, un
// número), `transform` ausente / no-string / cadena vacía, y `options` que no es un objeto.
// Es una validación PREVIA a la ejecución, así que no contradice I9, que gobierna la ejecución
// de los pasos; y el cap de 8 es del ESQUEMA por mandato del §6.6 («no se ejecuta a medias, se
// rechaza»), no del cuerpo del motor.
//
// ⚠️ Por eso ESTA NO ES LA ENTRADA POR DEFECTO para quien no controla la receta: si la lista de
// pasos viene del historial (T6.10, §9) o de una UI que la está editando, usa `safeCompose`.
// `compose()` es para quien YA validó.
export function compose(
  source: string,
  steps: ComposeStepSpec[],
  ctx: ComposeOptions,
): ComposeResult {
  const recipe = ComposeRecipeSchema.parse(steps);
  return runCompose(source, recipe, buildEncodeIndex({ now: ctx.now }));
}

// Resultado de `safeCompose`: la validación de la receta como DATO, no como excepción.
export type SafeComposeResult =
  { ok: true; result: ComposeResult } | { ok: false; issue: ZodError };

// LA ENTRADA RECOMENDADA cuando la receta no está garantizada: un solo canal de fallo.
//
// El problema que resuelve, dicho concreto porque no es teórico: `compose()` tiene DOS canales
// de fallo —lanza si la RECETA no valida, devuelve `terminal:'error'` si un PASO falla— y la
// pantalla de §7 recompone en cada pulsación. Basta con que la afordancia «añadir paso» deje
// por un instante un paso con `transform: ''` (antes de que el usuario elija en el `Select`)
// para que `z.string().min(1)` lance EN ESE RENDER y la pantalla se quede en blanco. Lo mismo
// vale para una receta corrupta restaurada del historial. Con esto, ese borde es un estado que
// la UI pinta («esta receta no se puede reproducir»), no una excepción que la tumba.
//
// Existe además para que T6.7 y T6.10 no reimplementen cada una el mismo guard: un olvido en
// cualquiera de las dos es una excepción no capturada en el navegador del usuario — justo lo
// que I9 promete que no pasa.
//
// NO sustituye a `compose()` ni cambia su contrato: el `throw` del cap de 8 sigue respaldado
// por el §6.6, y quien ya validó su receta puede seguir llamando directamente.
export function safeCompose(
  source: string,
  steps: unknown,
  ctx: ComposeOptions,
): SafeComposeResult {
  const parsed = ComposeRecipeSchema.safeParse(steps);
  if (!parsed.success) return { ok: false, issue: parsed.error };
  return { ok: true, result: runCompose(source, parsed.data, buildEncodeIndex({ now: ctx.now })) };
}
