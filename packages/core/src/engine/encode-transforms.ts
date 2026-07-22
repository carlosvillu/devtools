// Catálogo de transformaciones de CODIFICACIÓN (PRD §6.6) — la dirección inversa del motor.
// Las que NO necesitan secreto (T6.4); `hash.sha256`, `hash.md5` y `jwt.sign` llegan en T6.5.
//
// ── Cuatro reglas que gobiernan este módulo ─────────────────────────────────────────
//
// 1. REGISTRO SEPARADO y SIN «transformación por defecto». `compose()` no se auto-conduce
//    (I12): el usuario elige cada paso, así que el concepto de default del §6.3 no existe
//    aquí. Este catálogo NO se mezcla con `DEFAULT_TRANSFORM_BY_KIND`.
//
// 2. PURAS Y TOTALES (I1/I9). Ningún `apply` lanza jamás: un fallo es `{ok:false,error}` con
//    un mensaje en español útil para la UI. Tres de las cinco son totales de verdad (no hay
//    entrada que las rompa); se anota caso por caso más abajo.
//    ASIMETRÍA que conviene conocer antes de leer función por función: ante el MISMO input
//    roto —un surrogate UTF-16 SUELTO, p. ej. medio emoji copiado a mano— las dos familias
//    reaccionan distinto y las dos a propósito. `base64.encode`/`base64url.encode` lo mutilan
//    EN SILENCIO (`TextEncoder` sustituye por U+FFFD: hay pérdida, no excepción), mientras que
//    `url.encode` devuelve `{ok:false}` (`encodeURIComponent` lanza `URIError` y se captura).
//    No se uniforma: cada una hereda el comportamiento de su primitiva estándar, y forzar una
//    a imitar a la otra sería inventar semántica que el §6.6 no pide. Ambos casos están fijados
//    en `encode-transforms.test.ts` para que nadie los "arregle" sin darse cuenta.
//
// 3. CORRE EN EL NAVEGADOR (D10, §5.3). Este módulo NO puede usar `node:*`, ni `Buffer`, ni
//    `crypto.subtle`: el motor de composición se ejecuta entero en el cliente y jamás sale a
//    la red. Por eso el base64 se implementa a mano sobre el alfabeto de la RFC 4648 en vez
//    de con `Buffer.from(x).toString('base64')`, y el paso a bytes usa `TextEncoder`, que es
//    estándar web (y existe también en Node, así que el test lo ejerce tal cual). Lo protege
//    un control negativo permanente por grep: `client-only.test.ts`.
//
// 4. EL CATÁLOGO ES DATO DEL MOTOR, no de la presentación (misma lección que
//    `KINDS_COEXISTING_WITH_TEXT`, I8): id, label y grupo viven aquí, y la paleta agrupada de
//    `/compose` (§7) se deriva con `encodeCatalogByGroup()`. La UI no mantiene su propia lista.
import { ENCODE_GROUPS } from './contracts';
import { applyJsonMinify } from './transforms';
import type {
  EncodeApply,
  EncodeContext,
  EncodeGroup,
  EncodeTransform,
  TransformResult,
} from './contracts';

const ok = (output: string): TransformResult => ({ ok: true, output });
const fail = (error: string): TransformResult => ({ ok: false, error });

// ── base64 (RFC 4648) implementado a mano, sin `Buffer` ─────────────────────────────

const ALPHABET_STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const ALPHABET_URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// Codifica bytes en base64. `alphabet` decide estándar (`+/`) o URL-safe (`-_`); `pad` decide
// si se rellena con `=` hasta múltiplo de 4 (estándar sí, base64url del §6.6 no).
// Se indexa con `charAt`, que siempre devuelve `string`: así no hace falta ni `!` (prohibido
// en producción) ni un `?? ''` que enmascararía un índice fuera de rango.
function encodeBase64(bytes: Uint8Array, alphabet: string, pad: boolean): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const remaining = bytes.length - i;
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    out += alphabet.charAt(b0 >> 2);
    out += alphabet.charAt(((b0 & 0b11) << 4) | (b1 >> 4));
    out += remaining > 1 ? alphabet.charAt(((b1 & 0b1111) << 2) | (b2 >> 6)) : pad ? '=' : '';
    out += remaining > 2 ? alphabet.charAt(b2 & 0b111111) : pad ? '=' : '';
  }
  return out;
}

// Texto → bytes UTF-8. `TextEncoder` es estándar web (y global en Node ≥ 11): NO se importa
// de `node:util` — eso rompería el navegador y haría morder el grep de `client-only.test.ts`.
// `btoa` no vale como alternativa: solo acepta Latin-1, así que `btoa('🙂')` LANZA
// `InvalidCharacterError` y violaría la totalidad (I1) justo en el caso que el producto
// necesita (no-ASCII y emoji).
function utf8Bytes(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

// ── las 4 transformaciones nuevas (§6.6) ────────────────────────────────────────────

// TOTAL: `JSON.stringify` de un `string` nunca lanza ni devuelve `undefined` — y desde
// ES2019 (well-formed stringify) escapa los surrogates sueltos como `\udXXX` en vez de emitir
// UTF-16 inválido. No hay entrada que la rompa.
//
// DECISIÓN (§6.6 dice «envuelve el texto como string JSON escapado»): la entrada se trata como
// TEXTO OPACO y la salida es ese texto convertido en un literal de string JSON — comillas
// incluidas y escapes aplicados. NO parsea ni reformatea el JSON de entrada: `{"a":1}` sale
// como `"{\"a\":1}"`, no como `{"a":1}`. Formatear JSON ya es `json.format` (§6.3) y
// compactarlo es `json.minify`; si `json.stringify` reformateara, sería un duplicado de una de
// las dos. Su uso real es el inverso: preparar un valor para EMPOTRARLO dentro de otro JSON.
function applyJsonStringify(input: string): TransformResult {
  return ok(JSON.stringify(input));
}

// TOTAL: `TextEncoder` no lanza — un surrogate suelto lo sustituye por U+FFFD (comportamiento
// del estándar, con pérdida pero sin excepción) — y `encodeBase64` es aritmética pura.
// La cadena vacía codifica a cadena vacía, que es la respuesta correcta (0 bytes → 0 grupos).
function applyBase64Encode(input: string): TransformResult {
  return ok(encodeBase64(utf8Bytes(input), ALPHABET_STD, true));
}

// TOTAL, por lo mismo que `base64.encode`. Sin padding y con alfabeto `-_` (§6.6): es la forma
// que usan los segmentos de un JWT.
function applyBase64UrlEncode(input: string): TransformResult {
  return ok(encodeBase64(utf8Bytes(input), ALPHABET_URL, false));
}

// PUEDE FALLAR: `encodeURIComponent` lanza `URIError` si el texto contiene un surrogate
// suelto (UTF-16 mal formado, p. ej. medio emoji copiado a mano). Es la ÚNICA entrada que la
// rompe, y por eso el `try/catch` no es decorativo. Se codifica con `encodeURIComponent` —no
// con `encodeURI`— porque su inversa exacta es `decodeURIComponent`, que es lo que hace
// `url.decode` (§6.3): así la ida y vuelta cierra byte a byte.
function applyUrlEncode(input: string): TransformResult {
  try {
    return ok(encodeURIComponent(input));
  } catch {
    return fail('La entrada contiene un carácter UTF-16 mal formado y no se puede codificar.');
  }
}

// ── el catálogo (§6.6) ──────────────────────────────────────────────────────────────
// Orden = el de la tabla del §6.6 y el de la paleta del artboard `ComposeClaro`. Los `label`
// son los del mockup, que muestra el id literal: el usuario de un devtool reconoce
// `base64url.encode` antes que una perífrasis en español (el §6.3 sí usa prosa porque allí la
// UI enseña «qué te hemos hecho», no «qué eliges»).
//
// NINGUNA transformación se escribe dos veces: `json.minify` es LA MISMA función que usa el
// registro de decodificación (§6.3) — se importa, no se copia. El test lo comprueba por
// identidad referencial, que es lo único que distingue reutilizar de duplicar bien.
// La estructura ESPEJA la de `SPECS` en `transforms.ts` (la dirección de decodificar), y por
// la misma razón: separa los METADATOS ESTÁTICOS (`id`/`label`/`group`, lo que la paleta de
// §7 necesita y puede leer sin ningún contexto) del EJECUTABLE, que se construye ligado al
// contexto de la ejecución con `build(ctx)`.
//
// El reparto entre las dos vías de entrada no es un capricho, es su ciclo de vida:
//   - `now` es PER-EJECUCIÓN (I4) ⇒ entra por `build(ctx)` y queda cerrado en el `apply`.
//   - `options` es PER-PASO (§6.6: `ComposeStepSpec.options`) ⇒ entra por la llamada.
// Por eso `options` NO puede vivir en `build`: dos pasos de la misma receta pueden usar la
// misma transformación con opciones distintas. Es exactamente lo que `jwt.sign` necesitará en
// T6.5 (`{secret, alg}` per-paso, `iat` desde el `now` per-ejecución); las cinco de T6.4 no
// leen ninguno de los dos y se declaran como `(input) => TransformResult`, asignable tal cual.
interface EncodeTransformSpec {
  id: string;
  label: string;
  group: EncodeGroup;
  build: (ctx: EncodeContext) => EncodeApply;
}

export const ENCODE_SPECS: EncodeTransformSpec[] = [
  { id: 'json.minify', label: 'json.minify', group: 'json', build: () => applyJsonMinify },
  { id: 'json.stringify', label: 'json.stringify', group: 'json', build: () => applyJsonStringify },
  { id: 'base64.encode', label: 'base64.encode', group: 'binario', build: () => applyBase64Encode },
  {
    id: 'base64url.encode',
    label: 'base64url.encode',
    group: 'binario',
    build: () => applyBase64UrlEncode,
  },
  { id: 'url.encode', label: 'url.encode', group: 'binario', build: () => applyUrlEncode },
];

// Construye el catálogo ejecutable con el contexto inyectado. SIN default para `ctx`, igual
// que `buildTransforms`: el motor jamás fabrica su propio reloj, lo pasa el caller (T6.6).
export function buildEncodeTransforms(ctx: EncodeContext): EncodeTransform[] {
  return ENCODE_SPECS.map(({ id, label, group, build }) => ({
    id,
    label,
    group,
    apply: build(ctx),
  }));
}

// Índice por id para el lookup de `compose()` (T6.6). Separado del de §6.3 a propósito: una
// receta de composición solo puede nombrar ids de ESTE catálogo.
export function buildEncodeIndex(ctx: EncodeContext): Map<string, EncodeTransform> {
  return new Map(buildEncodeTransforms(ctx).map((t) => [t.id, t]));
}

// La paleta agrupada de `/compose` (§7), derivada del catálogo — nunca escrita a mano en la
// UI. Devuelve los grupos en el orden de `ENCODE_GROUPS` y **omite los vacíos**: hoy `hash` y
// `firma` no tienen entradas (llegan en T6.5) y la paleta no debe pintar cabeceras huecas.
// Lee SOLO campos estáticos de `ENCODE_SPECS`: no necesita `ctx` (ni lo aceptaría), que es
// justo lo que la paleta de T6.7 necesita — pintar el catálogo no obliga a tener un reloj.
export function encodeCatalogByGroup(): {
  group: EncodeGroup;
  items: { id: string; label: string }[];
}[] {
  return ENCODE_GROUPS.map((group) => ({
    group,
    items: ENCODE_SPECS.filter((t) => t.group === group).map(({ id, label }) => ({ id, label })),
  })).filter((g) => g.items.length > 0);
}
