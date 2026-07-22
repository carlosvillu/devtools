// Las 11 transformaciones de v1 (PRD §6.3) como funciones PURAS y TOTALES (I1: nunca
// lanzan; un fallo es `{ ok:false, error }`). Cada transformación decide qué hace un `kind`
// concreto sobre su input; el motor de cadena (T1.3) las orquesta.
//
// ── Inyección del tiempo (I4/I5) ─────────────────────────────────────────────────────
// El contrato §6.1 fija `Transform.apply: (input: string) => TransformResult` — SIN `now`.
// Pero `timestamp.to_relative` y la nota `exp` de `jwt.decode` dependen del instante actual.
// Se resuelve con una FACTORY: `buildTransforms(now)` construye las 11 `Transform` cerrando
// cada `apply` sobre el `now` inyectado. Así `apply` sigue siendo `(input) => result` y es
// PURO dado el `now`: mismo input + mismo `now` ⇒ misma salida byte a byte (I5). Ninguna
// `apply` referencia el reloj del sistema (ni `Date.now`, ni un `new Date` sin argumento):
// el reloj entra SOLO por
// el parámetro de `buildTransforms`, que NO tiene default de producción a propósito: el
// motor jamás debe poder fabricar el reloj por su cuenta (lo pasa el caller en T1.3).
import { decodeSegmentJson, JWT_PREFIX_RE } from './detectors';
import type { DataKind, Transform, TransformResult } from './contracts';

// ── helpers de tiempo (deterministas: reciben `now`) ─────────────────────────────────

const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY; // aproximación estable (mes = 30 días) — determinista, suficiente para un dev tool
const YEAR = 365 * DAY;

const UNITS: [seconds: number, singular: string, plural: string][] = [
  [YEAR, 'año', 'años'],
  [MONTH, 'mes', 'meses'],
  [DAY, 'día', 'días'],
  [HOUR, 'hora', 'horas'],
  [MINUTE, 'minuto', 'minutos'],
  [SECOND, 'segundo', 'segundos'],
];

// Magnitud legible de una diferencia temporal en español: "4 horas", "1 día", "2 meses".
// Elige la mayor unidad que "cabe" y pluraliza. Determinista (solo depende de |diff|).
function magnitude(absSeconds: number): string {
  for (const [unitSeconds, singular, plural] of UNITS) {
    if (absSeconds >= unitSeconds) {
      const value = Math.floor(absSeconds / unitSeconds);
      return `${String(value)} ${value === 1 ? singular : plural}`;
    }
  }
  return '0 segundos';
}

type Tense = 'past' | 'future' | 'now';

// Descompone la relación entre un instante objetivo y `now` en tiempo verbal + magnitud.
// El signo lo da el objetivo respecto a `now`: pasado (objetivo < now), futuro o "ahora".
function relative(target: Date, now: Date): { tense: Tense; magnitude: string } {
  const diffMs = target.getTime() - now.getTime();
  if (Math.abs(diffMs) < 1000) return { tense: 'now', magnitude: '0 segundos' };
  return {
    tense: diffMs < 0 ? 'past' : 'future',
    magnitude: magnitude(Math.floor(Math.abs(diffMs) / 1000)),
  };
}

// ISO 8601 UTC sin milisegundos: "2025-07-16T00:00:00Z". Es la forma exacta que fija el
// ejemplo trabajado del §6.5 para la nota `exp` del JWT. (`timestamp.to_iso` conserva los
// milisegundos: ver su comentario — allí no hay forma canónica que imponer y `.000Z` es ISO
// 8601 legítimo, mientras que la nota del §6.5 exige la forma corta literal.)
function isoShort(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// ── helpers de resultado ─────────────────────────────────────────────────────────────

const ok = (output: string, notes?: string[]): TransformResult =>
  notes && notes.length > 0 ? { ok: true, output, notes } : { ok: true, output };
const fail = (error: string): TransformResult => ({ ok: false, error });

// Ordena claves de objetos recursivamente (dentro de objetos anidados y de objetos que viven
// en arrays); NO reordena los elementos de un array. Salida determinista para `json.sort_keys`.
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    return Object.fromEntries(entries.map(([k, v]) => [k, sortKeysDeep(v)]));
  }
  return value;
}

// Parsea el string de un timestamp coherente con el detector (§6.2): 10 dígitos = segundos,
// 13 = milisegundos. Devuelve la `Date` o `null` si no encaja (totalidad).
function parseTimestamp(input: string): Date | null {
  const s = input.trim();
  if (!/^\d+$/.test(s)) return null;
  if (s.length !== 10 && s.length !== 13) return null;
  const ms = s.length === 10 ? Number(s) * 1000 : Number(s);
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Deriva la variante RFC 4122 del nibble más significativo del primer carácter del 4.º grupo.
function uuidVariant(nibble: number): string {
  if (nibble < 0x8) return 'NCS (retrocompatibilidad)';
  if (nibble < 0xc) return 'RFC 4122';
  if (nibble < 0xe) return 'Microsoft (reservado)';
  return 'reservado (futuro)';
}

const UUID_RE =
  /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f])([0-9a-f]{3})-([0-9a-f])([0-9a-f]{3})-([0-9a-f]{12})$/i;

const HASH_CANDIDATES: Record<number, string[]> = {
  32: ['md5'],
  40: ['sha1'],
  64: ['sha256'],
};

const BASE64_STD = /^[A-Za-z0-9+/]+={0,2}$/;
const BASE64_URL = /^[A-Za-z0-9_-]+$/;

// ── las 11 transformaciones (§6.3) ──────────────────────────────────────────────────
// Cada `apply` envuelve el trabajo peligroso (parse/decode/`new URL`) y devuelve
// `{ ok:false, error }` con un mensaje en español útil para la UI, nunca un stack.

function applyBase64Decode(input: string): TransformResult {
  const s = input.trim();
  if (s.length < 4) return fail('La entrada es demasiado corta para ser base64.');
  const isStd = BASE64_STD.test(s);
  const isUrl = BASE64_URL.test(s);
  if (!isStd && !isUrl) return fail('La entrada no usa un alfabeto base64 válido.');
  if (s.replace(/=+$/, '').length % 4 === 1) return fail('La longitud no es coherente con base64.');
  const decoded = Buffer.from(s, isStd ? 'base64' : 'base64url');
  if (decoded.length === 0) return fail('La entrada no decodifica a ningún byte.');
  return ok(decoded.toString('utf8'));
}

function applyJwtDecode(input: string, now: Date): TransformResult {
  const token = input.trim().replace(JWT_PREFIX_RE, '');
  const segments = token.split('.');
  if (segments.length !== 3 || segments.some((seg) => seg.length === 0)) {
    return fail('Un JWT debe tener tres segmentos separados por puntos.');
  }
  const [rawHeader, rawPayload, signature] = segments;
  const header = decodeSegmentJson(rawHeader);
  if (header === undefined) return fail('La cabecera del JWT no decodifica a JSON.');
  const payload = decodeSegmentJson(rawPayload);
  if (payload === undefined) return fail('El payload del JWT no decodifica a JSON.');
  // Salida COMPACTA a propósito (§6.5): así `json.format` sí aporta en el paso siguiente de la
  // cadena; si saliera ya indentado, el paso de formateo sería idempotente y terminal antes de tiempo.
  const output = JSON.stringify({ header, payload, signature });
  const exp = readExp(payload);
  if (exp === null) return ok(output);
  const expDate = new Date(exp * 1000);
  if (Number.isNaN(expDate.getTime())) return ok(output);
  const { tense, magnitude: mag } = relative(expDate, now);
  const note =
    tense === 'past'
      ? `exp: ${isoShort(expDate)} (caducó hace ${mag})`
      : tense === 'future'
        ? `exp: ${isoShort(expDate)} (caduca en ${mag})`
        : `exp: ${isoShort(expDate)} (caduca ahora)`;
  return ok(output, [note]);
}

// `exp` legible: número (segundos epoch) según el RFC 7519. Cualquier otra forma → sin nota.
function readExp(payload: unknown): number | null {
  if (payload === null || typeof payload !== 'object') return null;
  const exp = (payload as Record<string, unknown>).exp;
  return typeof exp === 'number' && Number.isFinite(exp) ? exp : null;
}

function reformatJson(input: string, render: (value: unknown) => string): TransformResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.trim());
  } catch {
    return fail('La entrada no es JSON válido.');
  }
  return ok(render(parsed));
}

// `json.minify` (§6.3) como función con nombre y EXPORTADA a propósito: es la única
// transformación que el catálogo de codificación de §6.6 (T6.4) reutiliza en vez de
// duplicar. Se importa desde `encode-transforms.ts`, de modo que ambas direcciones
// comparten LA MISMA función (identidad referencial, no dos copias equivalentes).
export function applyJsonMinify(input: string): TransformResult {
  return reformatJson(input, (v) => JSON.stringify(v));
}

function applyTimestampToIso(input: string): TransformResult {
  const date = parseTimestamp(input);
  if (date === null) return fail('La entrada no es un timestamp Unix de 10 o 13 dígitos.');
  // Conserva milisegundos (`.000Z`): es ISO 8601 UTC canónico y no hay forma corta impuesta
  // para esta transformación (a diferencia de la nota `exp` del §6.5, que sí la fija).
  return ok(date.toISOString());
}

function applyTimestampToRelative(input: string, now: Date): TransformResult {
  const date = parseTimestamp(input);
  if (date === null) return fail('La entrada no es un timestamp Unix de 10 o 13 dígitos.');
  const { tense, magnitude: mag } = relative(date, now);
  const text = tense === 'past' ? `hace ${mag}` : tense === 'future' ? `en ${mag}` : 'ahora mismo';
  return ok(text);
}

function applyUrlDecode(input: string): TransformResult {
  try {
    return ok(decodeURIComponent(input.trim()));
  } catch {
    return fail('La entrada tiene una secuencia percent-encoding malformada.');
  }
}

function applyUrlSplitQuery(input: string): TransformResult {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return fail('La entrada no es una URL válida.');
  }
  // `URLSearchParams` ya entrega los valores decodificados. Claves repetidas: gana la última.
  const params = Object.fromEntries(url.searchParams);
  return ok(JSON.stringify(params, null, 2));
}

function applyUuidDescribe(input: string): TransformResult {
  const m = UUID_RE.exec(input.trim());
  if (!m) return fail('La entrada no es un UUID canónico (8-4-4-4-12).');
  // Grupos del regex: 3 = nibble de versión, 5 = nibble de variante (ambos garantizados por
  // el match; el guard es para que el tipo se estreche sin aserción non-null, prohibida en prod).
  const [, , , versionHex, , variantHex] = m;
  if (versionHex === undefined || variantHex === undefined) {
    return fail('La entrada no es un UUID canónico (8-4-4-4-12).');
  }
  const version = parseInt(versionHex, 16);
  const variant = uuidVariant(parseInt(variantHex, 16));
  return ok(JSON.stringify({ version, variant }, null, 2));
}

function applyHashIdentify(input: string): TransformResult {
  const s = input.trim();
  if (!/^[0-9a-f]+$/i.test(s)) return fail('La entrada no es una cadena hexadecimal.');
  const candidates = HASH_CANDIDATES[s.length];
  if (!candidates) return fail('La longitud no coincide con ningún hash conocido (32, 40 o 64).');
  return ok(JSON.stringify({ length: s.length, candidates }, null, 2));
}

// ── factory: construye las 11 `Transform` cerrando sobre `now` (I4) ──────────────────

// Especificación estática de las 11 transformaciones. `build` recibe `now` y devuelve el
// `apply` puro; las que no dependen del tiempo simplemente lo ignoran.
interface TransformSpec {
  id: string;
  from: DataKind;
  label: string;
  build: (now: Date) => (input: string) => TransformResult;
}

const SPECS: TransformSpec[] = [
  {
    id: 'base64.decode',
    from: 'base64',
    label: 'Decodificar base64',
    build: () => applyBase64Decode,
  },
  {
    id: 'jwt.decode',
    from: 'jwt',
    label: 'Decodificar JWT',
    build: (now) => (input) => applyJwtDecode(input, now),
  },
  {
    id: 'json.format',
    from: 'json',
    label: 'Formatear JSON (2 espacios)',
    build: () => (input) => reformatJson(input, (v) => JSON.stringify(v, null, 2)),
  },
  {
    id: 'json.minify',
    from: 'json',
    label: 'Compactar JSON',
    build: () => applyJsonMinify,
  },
  {
    id: 'json.sort_keys',
    from: 'json',
    label: 'Ordenar claves del JSON',
    build: () => (input) => reformatJson(input, (v) => JSON.stringify(sortKeysDeep(v), null, 2)),
  },
  {
    id: 'timestamp.to_iso',
    from: 'unix_timestamp',
    label: 'Convertir a ISO 8601 (UTC)',
    build: () => applyTimestampToIso,
  },
  {
    id: 'timestamp.to_relative',
    from: 'unix_timestamp',
    label: 'Tiempo relativo',
    build: (now) => (input) => applyTimestampToRelative(input, now),
  },
  {
    id: 'url.decode',
    from: 'url',
    label: 'Decodificar URL (percent-encoding)',
    build: () => applyUrlDecode,
  },
  {
    id: 'url.split_query',
    from: 'url',
    label: 'Separar parámetros de la query',
    build: () => applyUrlSplitQuery,
  },
  { id: 'uuid.describe', from: 'uuid', label: 'Describir UUID', build: () => applyUuidDescribe },
  {
    id: 'hash.identify',
    from: 'hash',
    label: 'Identificar algoritmo de hash',
    build: () => applyHashIdentify,
  },
];

// Construye las 11 transformaciones con el `now` inyectado. SIN default: el reloj lo pasa el
// caller (el motor de cadena de T1.3), nunca lo fabrica el motor.
export function buildTransforms(now: Date): Transform[] {
  return SPECS.map(({ id, from, label, build }) => ({ id, from, label, apply: build(now) }));
}

// Índice por id sobre el resultado de `buildTransforms`, para el lookup del motor de cadena.
export function buildTransformIndex(now: Date): Map<string, Transform> {
  return new Map(buildTransforms(now).map((t) => [t.id, t]));
}

// Transformaciones aplicables a un `kind` (todas las que parten de él, §6.3): `{ id, label }`
// para el picker de desvío de O4 (T1.6). Se deriva del REGISTRO estático `SPECS` — la única
// fuente de verdad de "qué transforma qué" —, NUNCA de una lista a mano en la UI: así el picker
// no puede divergir del motor. No depende del `now` (id y label son estáticos), a diferencia de
// `apply`. Orden estable = orden de declaración en `SPECS` (determinismo, I5).
export function transformsForKind(kind: DataKind): { id: string; label: string }[] {
  return SPECS.filter((spec) => spec.from === kind).map(({ id, label }) => ({ id, label }));
}

// ── registro de la transformación por defecto de cada kind (§6.3) ────────────────────
// Fuente de verdad única del "qué aplica el motor solo". Valor = id fijo, o resolver por
// input para el único caso condicional (`url`: split_query si hay query, decode si no).
// `text` no tiene default: es terminal (I6).
type DefaultResolver = string | ((input: string) => string);

function urlHasQuery(input: string): boolean {
  try {
    return new URL(input.trim()).search.length > 0;
  } catch {
    return false;
  }
}

export const DEFAULT_TRANSFORM_BY_KIND: Record<DataKind, DefaultResolver | null> = {
  base64: 'base64.decode',
  jwt: 'jwt.decode',
  json: 'json.format',
  unix_timestamp: 'timestamp.to_iso',
  url: (input) => (urlHasQuery(input) ? 'url.split_query' : 'url.decode'),
  uuid: 'uuid.describe',
  hash: 'hash.identify',
  text: null,
};

// Resuelve el id de la transformación por defecto para un kind + input (aplica la regla
// condicional de `url`). `null` cuando el kind es terminal (`text`) — no hay nada que aplicar.
export function defaultTransformId(kind: DataKind, input: string): string | null {
  const resolver = DEFAULT_TRANSFORM_BY_KIND[kind];
  if (resolver === null) return null;
  return typeof resolver === 'function' ? resolver(input) : resolver;
}
