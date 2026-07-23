// Codec de la RECETA compartible en la URL (§7, T7.2). Dos funciones PURAS y TOTALES:
//   · `encodeRecipe(steps)` → string URL-safe compacto y estable.
//   · `decodeRecipe(s)`     → `{ ok:true, steps } | { ok:false }`, NUNCA lanza (I1/I9).
//
// Las consume `/compose` en el CLIENTE (T7.3, precargar una receta compartida) y la OG en el
// SERVIDOR (T7.4). Por eso el módulo es ISOMORFO: solo operaciones puras de string y Zod, sin
// `Buffer`, sin `node:*`, sin base64 (no hace falta — la salida ya es ASCII URL-safe). El guard
// estructural de `url-codec.test.ts` fija que sus imports relativos siguen siendo puros.
//
// ── LA CODIFICACIÓN, y POR QUÉ esta y no otra ───────────────────────────────────────
// Un paso se serializa como `<transform_id><FIELD_SEP><kind>` y la receta une los pasos con
// `<STEP_SEP>`. Ejemplo: `json.minify-json~base64url.encode-base64`.
//
//   1. POR IDS LITERALES, no por índices en el catálogo. Un índice sería más corto, pero una URL
//      compartida debe SOBREVIVIR a que el catálogo se reordene: con índices, insertar una
//      transformación en medio de `ENCODE_SPECS` haría que las URLs viejas decodificaran a OTRA
//      transformación EN SILENCIO. Con el id literal, reordenar no rompe nada; y si un id se
//      elimina o renombra, la URL vieja falla de forma SEGURA (`ok:false`, no corrupción), porque
//      `decodeRecipe` valida contra el catálogo vivo. Estabilidad > máxima compacidad.
//   2. EL `kind` VIAJA en la URL (no se recomputa). El contrato pide `steps:[{transform_id,kind}]`
//      y round-trip EXACTO: `decodeRecipe(encodeRecipe(x))` recupera `x`, kind incluido. Además
//      este codec es puro y no tiene la fuente de entrada, así que NO PODRÍA recomputar el kind.
//      La fuente de verdad del kind sigue siendo el detector del motor (I10): lo que viaja es el
//      valor que el motor YA detectó sobre la salida de cada paso al componer; la URL solo lo
//      transporta para que la receta sea autodescriptiva sin re-ejecutar el motor. Al reabrirla,
//      T7.3/T7.4 pueden re-componer y el kind recomputado coincidirá (I10 + determinismo I11).
//   3. DELIMITADORES `-` y `~`: ambos son `unreserved` de la RFC 3986 (nunca se percent-encodean)
//      y —hecho comprobado por el guard de colisión del test sobre `ENCODE_TRANSFORM_IDS` y
//      `DATA_KINDS` vivos— NINGÚN id ni kind del catálogo los contiene. Los ids usan `.` (que no
//      es delimitador) y los kinds usan `_` (`unix_timestamp`); ninguno usa `-` ni `~`. Resultado:
//      la salida entera es ASCII URL-safe y `encodeURIComponent` la deja intacta (lo asserta el
//      test), sin capa de base64 ni percent-encoding. Compacto por no arrastrar el boilerplate de
//      un JSON (`{"transform_id":…}`).
//
// ── DETERMINISMO (I11) ──────────────────────────────────────────────────────────────
// `encodeRecipe` recorre `steps` EN ORDEN y no lee reloj, aleatoriedad ni `Object.keys` de orden
// no garantizado: misma receta ⇒ mismo string, siempre. Es la única forma de serializar una
// receta dada, así que decode∘encode es la identidad sobre strings bien formados.
import { z } from 'zod';
import { MAX_COMPOSE_STEPS } from '../engine/contracts';
import { HistoryComposeStepSchema, type HistoryComposeStep } from '../history/contracts';

// Separador ENTRE pasos y ENTRE los dos campos de un paso. Exportados para que el guard de
// colisión del test se ate a ESTOS valores (no a una copia que se quedaría obsoleta si cambian).
export const RECIPE_STEP_SEP = '~';
export const RECIPE_FIELD_SEP = '-';

// La MISMA validación que la frontera de persistencia de T6.10 (`HistoryComposeBodySchema.steps`):
// se REUSA `HistoryComposeStepSchema` (estricto; `transform_id` refinado contra el catálogo vivo
// `ENCODE_TRANSFORM_IDS`; `kind` contra `DataKindSchema`) y los MISMOS límites `.min(1)` (una
// receta vacía no es compartible: no hay nada que precargar) y `.max(MAX_COMPOSE_STEPS)` (el cap
// de 8, I2 — la constante, no un `8` hardcodeado). Reusar el schema evita dos verdades: una receta
// compartible es exactamente una receta persistible.
const RecipeSchema = z.array(HistoryComposeStepSchema).min(1).max(MAX_COMPOSE_STEPS);

export type DecodeRecipeResult = { ok: true; steps: HistoryComposeStep[] } | { ok: false };

/**
 * Serializa una receta VÁLIDA a su forma compacta URL-safe. Determinista (I11). El caller pasa
 * una receta ya válida (la que el motor produjo/validó); el round-trip garantizado es para
 * recetas válidas — `decodeRecipe` es quien valida el input hostil.
 */
export function encodeRecipe(steps: HistoryComposeStep[]): string {
  return steps
    .map((step) => `${step.transform_id}${RECIPE_FIELD_SEP}${step.kind}`)
    .join(RECIPE_STEP_SEP);
}

/**
 * Parsea una receta desde la URL. TOTAL (I1/I9): sobre CUALQUIER string —incluida basura, una
 * cadena vacía, control chars, un id inventado, un kind inválido, >8 pasos o una forma corrupta—
 * devuelve `{ ok:false }` en vez de lanzar. Valida contra el catálogo vivo vía `RecipeSchema`.
 */
export function decodeRecipe(s: string): DecodeRecipeResult {
  // Envoltura defensiva: este módulo es un parser TOTAL sobre input hostil (una URL que teclea
  // cualquiera). Ningún camino actual lanza —`split` y `safeParse` son totales—, pero la garantía
  // I1/I9 es sobre el CONTRATO, no sobre los caminos que hoy existen: si un cambio futuro
  // introdujera una operación que lanza, la totalidad se conserva aquí y no en el navegador del
  // usuario. El control adversarial del test la fija.
  try {
    // `typeof` defiende contra callers no tipados: las URLs llegan como `string | null`
    // (`URLSearchParams.get`), y un `null`/`undefined` colado debe ser `ok:false`, no un throw.
    if (typeof s !== 'string' || s.length === 0) return { ok: false };
    const raw: { transform_id: string; kind: string }[] = [];
    for (const token of s.split(RECIPE_STEP_SEP)) {
      const parts = token.split(RECIPE_FIELD_SEP);
      // Exactamente dos campos: ni `id-`, ni `-kind`, ni `a-b-c`, ni un token sin separador. Como
      // ni ids ni kinds contienen `-` (guard de colisión), 2 partes es la forma bien formada.
      if (parts.length !== 2) return { ok: false };
      raw.push({ transform_id: parts[0] ?? '', kind: parts[1] ?? '' });
    }
    const parsed = RecipeSchema.safeParse(raw);
    return parsed.success ? { ok: true, steps: parsed.data } : { ok: false };
  } catch {
    return { ok: false };
  }
}
