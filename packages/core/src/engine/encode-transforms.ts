// Catálogo de transformaciones de CODIFICACIÓN (PRD §6.6) — la dirección inversa del motor.
// Las 5 sin secreto llegaron en T6.4; `hash.sha256`, `hash.md5` y `jwt.sign`, en T6.5.
//
// ── Cuatro reglas que gobiernan este módulo ─────────────────────────────────────────
//
// 1. REGISTRO SEPARADO y SIN «transformación por defecto». `compose()` no se auto-conduce
//    (I12): el usuario elige cada paso, así que el concepto de default del §6.3 no existe
//    aquí. Este catálogo NO se mezcla con `DEFAULT_TRANSFORM_BY_KIND`.
//
// 2. PURAS Y TOTALES (I1/I9). Ningún `apply` lanza jamás: un fallo es `{ok:false,error}` con
//    un mensaje en español útil para la UI. Cinco de las ocho son totales de verdad (no hay
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
import { hmacSha256, md5, sha256, toHex } from './hash';
import { applyJsonMinify } from './transforms';
import type {
  EncodeApply,
  EncodeContext,
  EncodeGroup,
  EncodeOptionSpec,
  EncodeTransform,
  TransformResult,
} from './contracts';

// `notes` es opcional y solo `jwt.sign` las emite hoy (lo que pasó con el `iat`). Se omite el
// campo cuando no hay notas en vez de emitir `notes: []`: un array vacío viajaría hasta la UI
// y la obligaría a distinguir "sin notas" de "lista vacía" (mismo criterio que §6.3).
const ok = (output: string, notes?: string[]): TransformResult =>
  notes === undefined ? { ok: true, output } : { ok: true, output, notes };
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

// ── las 4 transformaciones sin secreto de T6.4 (§6.6) ───────────────────────────────

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

// «base64url = alfabeto `-_` y SIN padding» (§6.6) se declara AQUÍ y solo aquí: lo usan dos
// rutas —la transformación `base64url.encode` y los tres segmentos de `jwt.sign`— y si cada
// una repitiera los argumentos de `encodeBase64` podrían divergir (basta con que alguien
// "arregle" el padding en un sitio para producir JWTs que ningún verificador acepta).
const base64UrlBytes = (bytes: Uint8Array): string => encodeBase64(bytes, ALPHABET_URL, false);

// TOTAL, por lo mismo que `base64.encode`. Sin padding y con alfabeto `-_` (§6.6): es la forma
// que usan los segmentos de un JWT.
function applyBase64UrlEncode(input: string): TransformResult {
  return ok(base64UrlBytes(utf8Bytes(input)));
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

// ── hashes (§6.6, T6.5): SHA-256 y MD5 en hex ───────────────────────────────────────
// La implementación vive en `hash.ts`, en TS puro (ni `node:crypto` ni `crypto.subtle`: el
// motor corre en el navegador Y es síncrono, §5.3). Aquí solo se envuelve.
//
// TOTALES las dos: `TextEncoder` no lanza y el resto es aritmética de 32 bits sobre un
// `Uint8Array`. No existe entrada —vacía, binaria, surrogate suelto, megabytes de texto— que
// las rompa; el corpus adversarial del test lo fija.
//
// DECISIÓN: la entrada se hashea como TEXTO UTF-8 opaco, sin `trim()` ni normalización
// alguna. Un hash sobre "  a  " DEBE diferir del hash sobre "a": recortar en silencio haría
// que la salida no correspondiera a la entrada que el usuario ve en pantalla, que es
// exactamente el bug que un devtool de hashes no puede permitirse.
function applySha256(input: string): TransformResult {
  return ok(toHex(sha256(utf8Bytes(input))));
}

function applyMd5(input: string): TransformResult {
  return ok(toHex(md5(utf8Bytes(input))));
}

// ── jwt.sign (§6.6, T6.5) ───────────────────────────────────────────────────────────
//
// ██ EL SECRETO ██ `options.secret` es material sensible y este es el contrato, escrito
// donde vive la función que lo recibe (§11):
//   · NO SE LOGUEA: esta función no tiene logger ni lo tendrá — es pura, no hace I/O (I9).
//   · NO SE SERIALIZA EN EL RESULTADO: el `TransformResult` que sale de aquí contiene el
//     token y, como mucho, notas sobre el `iat`. Ni el `output`, ni las `notes`, ni ningún
//     mensaje de error incluyen jamás el secreto — tampoco un prefijo, una longitud ni un
//     "empieza por…". Nótese que la firma HMAC del token no es el secreto: es una función de
//     un solo sentido de él. Un test con secreto canario asserta que el canario no aparece en
//     `JSON.stringify(result)` completo, notas incluidas.
//   · NO SE PERSISTE: lo que §9 guarda es la RECETA (`ComposeStepSpec`), y el borde de
//     persistencia es quien debe excluir `options.secret` antes de escribir. El motor no
//     persiste nada porque no puede: no tiene puertos.
// Consecuencia práctica de las tres: el secreto entra por el argumento `options` de ESTA
// llamada y muere cuando la función retorna.
//
// PUEDE FALLAR (y falla como dato, nunca como excepción — I1/I9). Cuatro razones, todas con
// mensaje útil para la UI y ninguna con fallback silencioso:
//   1. Sin secreto (ausente, no-string o cadena vacía). NO se firma con cadena vacía: un JWT
//      con secreto '' es verificable por cualquiera, así que el silencio aquí sería una
//      vulnerabilidad de manual. Un secreto de solo espacios SÍ se acepta tal cual (no se
//      hace `trim`): es un secreto raro, pero es el que el usuario escribió, y recortarlo
//      produciría un token que su verificador no reconocería.
//   2. `alg` distinto de 'HS256'. Solo HS256 en v1 (§6.6). Un `alg: 'RS256'` NO cae de vuelta
//      a HS256: eso firmaría con un algoritmo que el usuario no pidió. `alg` ausente sí
//      significa 'HS256', porque es el único valor posible del catálogo.
//   3. El payload no es JSON válido.
//   4. El payload es JSON válido pero no es un OBJETO (un array, un número, `null`, una
//      cadena). Un payload de JWT es un objeto de claims (RFC 7519 §4) y, sobre todo, no hay
//      dónde poner el `iat` en un array o en un escalar.
//
// DECISIÓN sobre la entrada: es el PAYLOAD, y se re-serializa COMPACTO (`JSON.stringify` de
// lo parseado), no se codifica el texto crudo. Así el token no depende de la indentación con
// que llegue el payload, que es lo que hace que `json.minify → jwt.sign` y `jwt.sign` a secas
// den el mismo token, y lo que permite que el segundo segmento sea el literal exacto del
// ejemplo trabajado del §6.6.
//
// LO QUE ESA RE-SERIALIZACIÓN CUESTA, dicho entero para que nadie lo descubra en producción:
// el viaje `JSON.parse` → `JSON.stringify` **no es la identidad sobre el texto**, y aquí no
// solo normaliza espacios.
//   · Los enteros de más de 2^53 pierden precisión: `{"sub":12345678901234567890}` se firma
//     como `12345678901234567000`. Un `sub` de 19 dígitos queda firmado con un valor DISTINTO
//     del que el usuario escribió.
//   · Las claves duplicadas colapsan (gana la última) y las claves con forma de entero se
//     reordenan al principio del objeto (regla de orden de propiedades de JS).
// Consecuencia práctica: **re-firmar un token existente no garantiza reproducir su payload
// byte a byte**, y el caso que menciona la decisión del `iat` (traer un `iat` propio) solo
// cierra si el resto de claims sobrevive al viaje. No se corrige aquí porque no es un defecto
// de `jwt.sign`: `json.minify` (§6.3, reutilizada por el catálogo) hace exactamente lo mismo,
// así que arreglarlo en un solo sitio dejaría las dos direcciones del motor discrepando.
// Queda ANOTADO, no escondido.
//
// DECISIÓN sobre `iat`: se añade automáticamente **al final** del objeto de claims a partir
// del `now` inyectado (I4: el motor jamás lee el reloj), en segundos epoch. Si el payload YA
// trae un `iat`, se RESPETA el suyo y no se sobrescribe, con una nota que lo explica —
// pisarlo destruiría en silencio un dato que el usuario escribió a propósito (p. ej. al
// re-firmar un token existente). En ambos casos el resultado es determinista (I5/I11): mismo
// payload + mismo secreto + mismo `now` ⇒ el mismo token byte a byte.
const JWT_HEADER_HS256 = '{"alg":"HS256","typ":"JWT"}';

// Cómo se nombra en el mensaje de error un `alg` que no es 'HS256'. Dos razones para que
// exista esta función en vez de un `JSON.stringify(alg)` en línea, y ninguna es cosmética:
//
//   1. **`JSON.stringify` LANZA**, y aquí no puede lanzar nada (I1/I9). Revienta con `BigInt`
//      (`TypeError: Do not know how to serialize a BigInt`), con estructuras circulares
//      (`Converting circular structure to JSON`) y con cualquier objeto cuyo `toJSON` lance —
//      y `alg` es `unknown`: viene de `Record<string, unknown>`, así que el tipo no lo impide.
//      Hoy no es alcanzable desde el producto (las `options` de una receta nacen de JSON, que
//      no produce BigInt ni ciclos), pero I1 dice «ninguna función del motor lanza», no
//      «ninguna lanza por los caminos que hoy existen»: el día que `options` llegue de otro
//      sitio, esto sería una excepción en el navegador del usuario.
//   2. **`JSON.stringify` devuelve `undefined`** para símbolos y funciones, y el mensaje
//      quedaba «Recibido: undefined.» — indistinguible de «no pasaste `alg`», que es un caso
//      VÁLIDO y significa HS256. Un error que se lee como un acierto es peor que no darlo.
//
// Las cadenas se siguen mostrando entrecomilladas (`Recibido: "RS256".`): es el caso real y
// el que la UI enseña. Todo lo demás se describe por su tipo, que es información honesta y
// no requiere serializar nada.
function describeAlg(alg: unknown): string {
  if (typeof alg === 'string') return JSON.stringify(alg);
  if (alg === null) return 'null';
  return `un valor de tipo ${typeof alg}`;
}

function applyJwtSign(
  input: string,
  options: Record<string, unknown> | undefined,
  now: Date,
): TransformResult {
  const secret = options?.secret;
  if (typeof secret !== 'string' || secret.length === 0) {
    return fail('jwt.sign necesita un secreto: escríbelo en las opciones del paso.');
  }
  const alg = options?.alg;
  if (alg !== undefined && alg !== 'HS256') {
    return fail(`Algoritmo no soportado: solo HS256. Recibido: ${describeAlg(alg)}.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.trim());
  } catch {
    return fail('El payload de un JWT debe ser JSON válido.');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return fail('El payload de un JWT debe ser un objeto JSON de claims, no un valor suelto.');
  }
  const epochSeconds = Math.floor(now.getTime() / 1000);
  if (!Number.isFinite(epochSeconds)) {
    return fail('El instante inyectado no es una fecha válida y no se puede calcular el iat.');
  }
  const claims = parsed as Record<string, unknown>;
  const hadIat = Object.prototype.hasOwnProperty.call(claims, 'iat');
  const payload = hadIat ? claims : { ...claims, iat: epochSeconds };
  const note = hadIat
    ? 'El payload ya traía `iat`: se respeta el suyo y no se sobrescribe.'
    : `iat: ${String(epochSeconds)} (añadido a partir del instante inyectado)`;
  const signingInput = `${base64UrlBytes(utf8Bytes(JWT_HEADER_HS256))}.${base64UrlBytes(
    utf8Bytes(JSON.stringify(payload)),
  )}`;
  const signature = base64UrlBytes(hmacSha256(utf8Bytes(secret), utf8Bytes(signingInput)));
  return ok(`${signingInput}.${signature}`, [note]);
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
  // Qué opciones declara el paso (ver `EncodeOptionSpecSchema` en `contracts.ts`). Ausente en
  // las 7 que no piden nada; presente y con `kind: 'secret'` marcado en `jwt.sign`, que es de
  // donde T6.10 sacará su allowlist de persistencia. DESCRIPTOR, no validador: quien decide
  // qué se acepta sigue siendo el cuerpo de la transformación.
  options?: EncodeOptionSpec[];
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
  { id: 'hash.sha256', label: 'hash.sha256', group: 'hash', build: () => applySha256 },
  { id: 'hash.md5', label: 'hash.md5', group: 'hash', build: () => applyMd5 },
  // La ÚNICA entrada del catálogo que usa las dos vías de contexto a la vez, y la razón por la
  // que T6.4 las separó: `now` (per-ejecución) se cierra en el `build`, `options` (per-paso,
  // con el secreto) entra por la llamada. Dos pasos de la misma receta pueden firmar con
  // secretos distintos sin reconstruir el catálogo.
  {
    id: 'jwt.sign',
    label: 'jwt.sign',
    group: 'firma',
    // El orden es el del panel del artboard `ComposeClaro`: primero el algoritmo, luego el
    // secreto. `alg` es `required: false` porque su ausencia SIGNIFICA HS256 (no es un
    // olvido); `secret` es el único `kind: 'secret'` del catálogo — el que la frontera de
    // persistencia (T6.10) debe excluir y el que la UI pinta con `type="password"`.
    options: [
      { key: 'alg', label: 'Algoritmo', kind: 'choice', choices: ['HS256'], required: false },
      { key: 'secret', label: 'Secreto de firma', kind: 'secret', required: true },
    ],
    build:
      ({ now }) =>
      (input, options) =>
        applyJwtSign(input, options, now),
  },
];

// Construye el catálogo ejecutable con el contexto inyectado. SIN default para `ctx`, igual
// que `buildTransforms`: el motor jamás fabrica su propio reloj, lo pasa el caller (T6.6).
export function buildEncodeTransforms(ctx: EncodeContext): EncodeTransform[] {
  // `options` se omite cuando el spec no lo declara (no se emite `options: []`): el contrato
  // lo tiene como opcional y el consumidor resuelve con `?? []`.
  return ENCODE_SPECS.map(({ id, label, group, options, build }) => ({
    id,
    label,
    group,
    ...(options === undefined ? {} : { options }),
    apply: build(ctx),
  }));
}

// Índice por id para el lookup de `compose()` (T6.6). Separado del de §6.3 a propósito: una
// receta de composición solo puede nombrar ids de ESTE catálogo.
export function buildEncodeIndex(ctx: EncodeContext): Map<string, EncodeTransform> {
  return new Map(buildEncodeTransforms(ctx).map((t) => [t.id, t]));
}

// La paleta agrupada de `/compose` (§7), derivada del catálogo — nunca escrita a mano en la
// UI. Devuelve los grupos en el orden de `ENCODE_GROUPS` y **omite los vacíos** (la paleta no
// debe pintar cabeceras huecas). Desde T6.5 los cuatro grupos del §6.6 tienen entradas, así
// que el filtro no descarta ninguno hoy; se mantiene porque la regla es del catálogo, no del
// estado actual de la tabla: declarar un grupo en `ENCODE_GROUPS` antes de poblarlo es
// exactamente lo que hizo T6.4 con `hash` y `firma`.
// Lee SOLO campos estáticos de `ENCODE_SPECS`: no necesita `ctx` (ni lo aceptaría), que es
// justo lo que la paleta de T6.7 necesita — pintar el catálogo no obliga a tener un reloj.
// Propaga además el descriptor `options`: es lo que permite a T6.7/T6.8 pintar el panel del
// secreto recorriendo un array en vez de con un `if (id === 'jwt.sign')` que el typechecker no
// puede vigilar (`id` es `z.string()`, no una unión).
export function encodeCatalogByGroup(): {
  group: EncodeGroup;
  items: { id: string; label: string; options?: EncodeOptionSpec[] }[];
}[] {
  return ENCODE_GROUPS.map((group) => ({
    group,
    items: ENCODE_SPECS.filter((t) => t.group === group).map(({ id, label, options }) => ({
      id,
      label,
      ...(options === undefined ? {} : { options }),
    })),
  })).filter((g) => g.items.length > 0);
}
