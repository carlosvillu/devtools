// Los 8 detectores de v1 (PRD §6.2) como funciones PURAS y TOTALES: mismo input →
// mismo output, nunca lanzan, no leen reloj ni estado global. Cada detector aplica su
// regla y devuelve `Detection | null` (`detectText` es el único que devuelve siempre).
// `detect(input)` los orquesta y devuelve `Detection[]` ordenado por confianza desc.
//
// Confianzas (§6.2 es cualitativa; §6.5 fija tres valores exactos). Interpretación fijada
// en esta tarea, preservando el orden cualitativo Alta > Media-alta > Media > Baja-media >
// Mínima:  json 0.99 y jwt 0.95 (§6.5) · url/uuid 0.9 (Alta) · base64 0.7 (Media-alta) ·
// unix_timestamp 0.6 (Media) · hash 0.4 (Baja-media) · text 0.01 (Mínima, §6.5/I6).
import type { DataKind, Detection } from './contracts';

const CONFIDENCE = {
  json: 0.99,
  jwt: 0.95,
  url: 0.9,
  uuid: 0.9,
  base64: 0.7,
  unix_timestamp: 0.6,
  hash: 0.4,
  text: 0.01,
} as const satisfies Record<DataKind, number>;

// Kinds cuya identificación NO prueba que el dato deje de ser texto: `unix_timestamp` y `hash`
// «siempre conviven con la alternativa text» (§6.2). La confianza de `text` (0.01, el suelo I6)
// queda por debajo del umbral de ambigüedad de I8 (≥0.3), así que esta coexistencia intrínseca
// NO es derivable de las confianzas ni de la mera presencia de `text` (que es el suelo de TODO
// input): es un hecho de estos detectores y se declara aquí, junto a ellos, para que la capa de
// presentación (alternativas de O5) lo lea de UNA sola fuente y no lo re-codifique. Añadir un
// detector «solo-identifica» futuro basta con sumarlo aquí. Anotación de contrato (§6.2/§6.4 I8)
// que el bucle ratifica en el PRD.
export const KINDS_COEXISTING_WITH_TEXT: ReadonlySet<DataKind> = new Set<DataKind>([
  'unix_timestamp',
  'hash',
]);

// ── helpers puros ────────────────────────────────────────────────────────────

// Texto imprimible: sin controles C0 (salvo tab/LF/CR), sin DEL, sin controles C1, y sin
// U+FFFD (el carácter de reemplazo delata bytes que no eran UTF-8 válido → binario).
function isPrintableText(text: string): boolean {
  if (text.length === 0) return false;
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if (c === undefined) return false;
    if (c === 0xfffd) return false;
    if (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) return false;
    if (c === 0x7f) return false;
    if (c >= 0x80 && c <= 0x9f) return false;
  }
  return true;
}

// JSON cuyo valor raíz NO es un escalar desnudo (un `123` o `"x"` sueltos no son JSON a
// efectos del producto, §6.2). Esta exclusión es load-bearing para I8: mantiene a
// `1752624000` fuera de `json` para que quede como `[unix_timestamp, text]`.
function parseJsonObject(text: string): unknown {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
    return undefined;
  } catch {
    return undefined;
  }
}

// ── detectores ───────────────────────────────────────────────────────────────

// Prefijo tolerado ANTES del token (CU1 / criterio 14.1). El gesto real del caso de uso es
// copiar del panel Network la cabecera ENTERA y pegarla «entera»: `Authorization: Bearer eyJ…`.
// Por eso se tolera el nombre de cabecera `Authorization:` OPCIONAL —case-insensitive y con
// espaciado libre (`Authorization:Bearer x`, `AUTHORIZATION:   Bearer   x`)— seguido SIEMPRE
// del esquema `Bearer`. Un `Authorization:` suelto (sin `Bearer`) NO se recorta, ni ninguna
// otra cabecera (`Cookie:`, `X-Api-Key:`): el PRD nombra esta y solo esta.
// Fuente ÚNICA del recorte: la consumen `detectJwt`, la transformación `jwt.decode`
// (transforms.ts) y la redacción del historial (history/redact.ts). Si vive en tres sitios,
// se desincronizan — que es exactamente cómo nació el fallo de 14.1 que esto arregla.
export const JWT_PREFIX_RE = /^(?:Authorization:\s*)?Bearer\s+/i;

// jwt: tres segmentos base64url separados por `.`; el header decodifica a JSON con `alg`
// y el payload decodifica a JSON. Tolera el prefijo de `JWT_PREFIX_RE` (CU1).
export function detectJwt(input: string): Detection | null {
  const token = input.trim().replace(JWT_PREFIX_RE, '');
  const segments = token.split('.');
  if (segments.length !== 3) return null;
  if (segments.some((s) => s.length === 0)) return null;
  const [rawHeader, rawPayload] = segments;
  const header = decodeSegmentJson(rawHeader);
  if (header === undefined) return null;
  if (typeof header !== 'object' || header === null) return null;
  if (!('alg' in header)) return null;
  const payload = decodeSegmentJson(rawPayload);
  if (payload === undefined) return null; // el payload debe decodificar a JSON
  const alg = (header as Record<string, unknown>).alg;
  return {
    kind: 'jwt',
    confidence: CONFIDENCE.jwt,
    meta: typeof alg === 'string' ? { alg } : {},
  };
}

// Decodifica un segmento base64url a su valor JSON, o `undefined` si el segmento no es
// base64url válido o no decodifica a JSON. Exportado para reuso INTRA-módulo (lo consume
// `jwt.decode` en transforms.ts, §6.5); no forma parte de la API pública (index.ts).
export function decodeSegmentJson(segment: string | undefined): unknown {
  if (segment === undefined || !/^[A-Za-z0-9_-]+$/.test(segment)) return undefined;
  try {
    const text = Buffer.from(segment, 'base64url').toString('utf8');
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

// json: parsea como JSON y el resultado no es un escalar desnudo (§6.2).
export function detectJson(input: string): Detection | null {
  const parsed = parseJsonObject(input.trim());
  if (parsed === undefined) return null;
  return { kind: 'json', confidence: CONFIDENCE.json };
}

// base64: alfabeto base64/base64url válido, longitud coherente, y —clave (R4)— el
// resultado de decodificar es texto imprimible o JSON. Sin la comprobación del contenido
// media Internet parecería base64.
export function detectBase64(input: string): Detection | null {
  const s = input.trim();
  // "longitud coherente" (§6.2): al menos un cuanto base64 completo (4 chars → 3 bytes).
  // Por debajo no hay nada que decodificar con sentido. Es el único umbral que el PRD no
  // fija literalmente; se elige el mínimo estructural, no un número arbitrario.
  if (s.length < 4) return null;
  const isStd = /^[A-Za-z0-9+/]+={0,2}$/.test(s);
  const isUrl = /^[A-Za-z0-9_-]+$/.test(s);
  if (!isStd && !isUrl) return null;
  // longitud coherente: un grupo base64 nunca deja 1 carácter suelto (mod 4 === 1 es imposible).
  if (s.replace(/=+$/, '').length % 4 === 1) return null;
  let decoded: Buffer;
  try {
    decoded = Buffer.from(s, isStd ? 'base64' : 'base64url');
  } catch {
    return null;
  }
  if (decoded.length === 0) return null;
  const text = decoded.toString('utf8');
  // R4: solo cuenta como base64 si el decodificado es texto imprimible O JSON.
  if (!isPrintableText(text) && parseJsonObject(text) === undefined) return null;
  return { kind: 'base64', confidence: CONFIDENCE.base64 };
}

// unix_timestamp: entero de 10 (segundos) o 13 (milisegundos) dígitos. Todo entero de esa
// longitud cae en un rango plausible (10 dígitos → 2001..2286; 13 → íd. en ms) y el PRD no
// fija cotas explícitas, así que la regla se reduce al recuento de dígitos. NO lee el reloj
// (I4): el rango se comprueba estructuralmente, no contra `Date.now()`. Convive con `text`.
export function detectUnixTimestamp(input: string): Detection | null {
  const s = input.trim();
  if (!/^\d+$/.test(s)) return null;
  if (s.length !== 10 && s.length !== 13) return null;
  return {
    kind: 'unix_timestamp',
    confidence: CONFIDENCE.unix_timestamp,
    meta: { unit: s.length === 10 ? 'seconds' : 'milliseconds' },
  };
}

// url: parsea con `URL` y tiene esquema http/https. Anota si trae query string.
export function detectUrl(input: string): Detection | null {
  const s = input.trim();
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return {
    kind: 'url',
    confidence: CONFIDENCE.url,
    meta: { hasQuery: url.search.length > 0 },
  };
}

// uuid: formato canónico 8-4-4-4-12; la versión sale del primer nibble del 3.er grupo.
const UUID_RE =
  /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f])([0-9a-f]{3})-([0-9a-f]{4})-([0-9a-f]{12})$/i;
export function detectUuid(input: string): Detection | null {
  const s = input.trim();
  const m = UUID_RE.exec(s);
  if (!m) return null;
  const versionHex = m[3];
  if (versionHex === undefined) return null;
  return {
    kind: 'uuid',
    confidence: CONFIDENCE.uuid,
    meta: { version: parseInt(versionHex, 16) },
  };
}

// hash: cadena hex pura de longitud 32/40/64 → candidatos md5 / sha1 / sha256. La longitud
// no prueba nada (solo identifica), así que convive siempre con `text`.
const HASH_CANDIDATES: Record<number, string[]> = {
  32: ['md5'],
  40: ['sha1'],
  64: ['sha256'],
};
export function detectHash(input: string): Detection | null {
  const s = input.trim();
  if (!/^[0-9a-f]+$/i.test(s)) return null;
  const candidates = HASH_CANDIDATES[s.length];
  if (!candidates) return null;
  return { kind: 'hash', confidence: CONFIDENCE.hash, meta: { candidates } };
}

// text: SIEMPRE presente como último recurso, confianza mínima. Es el kind terminal (I6):
// garantiza que nunca haya "nada detectado".
export function detectText(input: string): Detection {
  void input; // el suelo no depende del contenido: siempre el mismo Detection
  return { kind: 'text', confidence: CONFIDENCE.text };
}

// Detectores que pueden no disparar, en orden de declaración. `text` NO va aquí: se añade
// exactamente una vez en `detect()` como suelo, para no duplicarlo.
const OPTIONAL_DETECTORS: ((input: string) => Detection | null)[] = [
  detectJwt,
  detectJson,
  detectBase64,
  detectUnixTimestamp,
  detectUrl,
  detectUuid,
  detectHash,
];

// Orquestador: corre todos los detectores y devuelve las detecciones ordenadas por
// confianza DESCENDENTE. `text` es el suelo (siempre presente, exactamente una vez).
// Empates: orden estable (Array.prototype.sort es estable desde ES2019), así que a igual
// confianza gana el orden de declaración de `OPTIONAL_DETECTORS` → salida determinista (I5).
export function detect(input: string): Detection[] {
  const detections: Detection[] = [];
  for (const detector of OPTIONAL_DETECTORS) {
    const detection = detector(input);
    if (detection !== null) detections.push(detection);
  }
  detections.push(detectText(input));
  return detections.sort((a, b) => b.confidence - a.confidence);
}
