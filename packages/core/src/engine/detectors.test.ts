// Corpus de los 8 detectores (§6.2): positivos y negativos por detector, ejerciendo la
// función REAL (nada de mocks: es lógica pura). Incluye los dos controles negativos
// nombrados en la Verificación de T1.1 (R4 e I8) y el ejemplo trabajado del §6.5.
import { describe, expect, it } from 'vitest';
import {
  detect,
  detectBase64,
  detectHash,
  detectJson,
  detectJwt,
  detectText,
  detectUnixTimestamp,
  detectUrl,
  detectUuid,
  type DataKind,
} from './index';

// Ejemplo trabajado del §6.5 (Bearer + jwt HS256 con exp).
const JWT_BEARER = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ.abc';
const JWT_BARE = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ.abc';

const kinds = (input: string): DataKind[] => detect(input).map((d) => d.kind);

// ── detect(): forma de la salida por caso (kinds en orden de confianza desc) ──────────
describe('detect() — corpus por detector', () => {
  const corpus: [string, string, DataKind[]][] = [
    // jwt (CU1: tolera Bearer)
    ['jwt con prefijo Bearer', JWT_BEARER, ['jwt', 'text']],
    ['jwt pelado', JWT_BARE, ['jwt', 'text']],
    // json
    ['objeto json', '{"name":"ada","n":42}', ['json', 'text']],
    ['array json', '[1,2,3]', ['json', 'text']],
    // base64 (positivos: decodifica a texto imprimible o JSON)
    ['base64url de texto', 'aGVsbG8gd29ybGQ', ['base64', 'text']],
    ['base64 estándar de JSON', 'eyJhIjoxfQ==', ['base64', 'text']],
    // unix_timestamp (I8: conserva la alternativa text)
    ['timestamp de 10 dígitos', '1752624000', ['unix_timestamp', 'text']],
    ['timestamp de 13 dígitos', '1752624000000', ['unix_timestamp', 'text']],
    // url
    ['url con query', 'https://example.com/p?a=1&b=2', ['url', 'text']],
    ['url sin query', 'http://example.com', ['url', 'text']],
    // uuid
    ['uuid v4', '550e8400-e29b-41d4-a716-446655440000', ['uuid', 'text']],
    // hash
    ['md5 (32 hex)', '5d41402abc4b2a76b9719d911017c592', ['hash', 'text']],
    ['sha1 (40 hex)', 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d', ['hash', 'text']],
    [
      'sha256 (64 hex)',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      ['hash', 'text'],
    ],

    // Negativos: caen a [text] (el suelo), sin falsos positivos.
    ['cadena arbitraria (R4)', 'holaquetalestamos', ['text']],
    ['base64 válido pero decodifica a binario (R4)', '3q2+7wAAAAAAAAAA', ['text']],
    ['escalar json desnudo (no es json)', '123', ['text']],
    ['json roto', '{roto', ['text']],
    ['9 dígitos (no es timestamp)', '175262400', ['text']],
    ['11 dígitos (no es timestamp)', '17526240000', ['text']],
    ['http dentro de texto (no es url)', 'visita http://x.com pronto', ['text']],
    ['esquema no http (no es url)', 'ftp://example.com', ['text']],
    ['31 hex (longitud no es de hash)', '5d41402abc4b2a76b9719d911017c59', ['text']],
    ['dos segmentos (no es jwt)', 'eyJhbGciOiJIUzI1NiJ9.abc', ['text']],
    ['cadena vacía', '', ['text']],
  ];

  it.each(corpus)('%s → %j', (_name, input, expected) => {
    expect(kinds(input)).toEqual(expected);
  });
});

// ── Controles negativos NOMBRADOS en la Verificación ─────────────────────────────────
describe('control negativo R4 — base64 se valida por el DECODIFICADO, no solo por charset', () => {
  it('"holaquetalestamos" NO es base64 (base64 válido por charset, no por estructura)', () => {
    expect(detectBase64('holaquetalestamos')).toBeNull();
    expect(kinds('holaquetalestamos')).toEqual(['text']);
  });

  // Guard REAL de la regla de contenido (R4): esta cadena SÍ pasa charset+longitud
  // (16 chars, base64 estándar) pero decodifica a bytes binarios. Es el caso que se pone
  // ROJO si alguien borra la comprobación "imprimible o JSON" — "holaquetalestamos" no lo
  // haría (lo frena antes la regla de longitud mod 4 === 1), así que no basta por sí solo.
  it('base64 estructuralmente válido con decodificado binario NO es base64', () => {
    expect(detectBase64('3q2+7wAAAAAAAAAA')).toBeNull();
  });

  it('base64 estructuralmente válido con decodificado imprimible SÍ es base64', () => {
    expect(detectBase64('aGVsbG8gd29ybGQ')).not.toBeNull();
  });
});

describe('control negativo I8 — la ambigüedad no se oculta', () => {
  it('"1752624000" → [unix_timestamp, text] con la alternativa text presente', () => {
    const detections = detect('1752624000');
    // El orden importa: la elegida primero, la alternativa text conservada (no oculta).
    expect(detections.map((d) => d.kind)).toEqual(['unix_timestamp', 'text']);
  });
});

// ── Ejemplo trabajado del §6.5: confianzas y meta ────────────────────────────────────
describe('§6.5 ejemplo trabajado', () => {
  it('el jwt Bearer sale con confianza 0.95 y meta.alg', () => {
    const detections = detect(JWT_BEARER);
    expect(detections[0]).toEqual({ kind: 'jwt', confidence: 0.95, meta: { alg: 'HS256' } });
  });
});

// ── El prefijo de cabecera entera del criterio 14.1 / CU1 ─────────────────────────────
// CU1 dice que el usuario copia del panel Network y «lo pega ENTERO», y 14.1 nombra la
// cadena `Authorization: Bearer <JWT>`. Hasta aquí el corpus solo usaba `Bearer …` —una
// entrada MÁS FÁCIL que la que el criterio manda pegar— y por eso el recorrido de 14.1
// estuvo roto en producción con la suite en verde (T3.3). Estos casos usan la cabecera
// entera y sus variantes de espaciado/mayúsculas.
describe('detectJwt() — prefijo `Authorization:` opcional (criterio 14.1, CU1)', () => {
  const JWT_141 = `Authorization: ${JWT_BEARER}`; // la cadena LITERAL que nombra 14.1

  const variantes: [name: string, input: string][] = [
    ['la cadena literal de 14.1', JWT_141],
    ['sin espacio tras los dos puntos', `Authorization:${JWT_BEARER}`],
    ['espaciado generoso', 'Authorization:   Bearer   ' + JWT_BARE],
    ['nombre de cabecera en minúsculas', `authorization: ${JWT_BEARER}`],
    ['todo en mayúsculas', `AUTHORIZATION: BEARER ${JWT_BARE}`],
    ['con espacios alrededor', `   Authorization: ${JWT_BEARER}   `],
  ];

  it.each(variantes)('%s se detecta como jwt igual que el token pelado', (_name, input) => {
    expect(detectJwt(input)).toEqual(detectJwt(JWT_BARE));
    expect(detectJwt(input)).toEqual({ kind: 'jwt', confidence: 0.95, meta: { alg: 'HS256' } });
  });

  it('detect() ordena la cadena literal de 14.1 como [jwt, text], igual que el pelado', () => {
    expect(kinds(JWT_141)).toEqual(['jwt', 'text']);
  });

  // Los negativos que fijan el ALCANCE de la tolerancia: solo `Authorization:` + `Bearer`.
  it('NO recorta un `Authorization:` suelto, sin el esquema `Bearer` (el PRD no lo nombra)', () => {
    expect(detectJwt(`Authorization: ${JWT_BARE}`)).toBeNull();
  });

  it('NO recorta otras cabeceras: `Cookie:` / `X-Api-Key:` quedan fuera de alcance', () => {
    expect(detectJwt(`Cookie: Bearer ${JWT_BARE}`)).toBeNull();
    expect(detectJwt(`X-Api-Key: Bearer ${JWT_BARE}`)).toBeNull();
  });
});

// ── Discriminación fina (negativos que de verdad separan) ────────────────────────────
describe('discriminación entre detectores cercanos', () => {
  it('un uuid v4 NO se detecta como hash (los guiones lo separan del hex puro)', () => {
    expect(detectHash('550e8400-e29b-41d4-a716-446655440000')).toBeNull();
    expect(detectUuid('550e8400-e29b-41d4-a716-446655440000')).not.toBeNull();
  });

  it('un hex de 32 (hash) NO se detecta como uuid (falta el formato 8-4-4-4-12)', () => {
    expect(detectUuid('5d41402abc4b2a76b9719d911017c592')).toBeNull();
    expect(detectHash('5d41402abc4b2a76b9719d911017c592')).not.toBeNull();
  });

  it('uuid extrae la versión del nibble correcto', () => {
    expect(detectUuid('550e8400-e29b-11d4-a716-446655440000')?.meta).toEqual({ version: 1 });
    expect(detectUuid('550e8400-e29b-41d4-a716-446655440000')?.meta).toEqual({ version: 4 });
  });

  it('hash anota los candidatos según la longitud', () => {
    expect(detectHash('5d41402abc4b2a76b9719d911017c592')?.meta).toEqual({ candidates: ['md5'] });
    expect(detectHash('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d')?.meta).toEqual({
      candidates: ['sha1'],
    });
  });

  it('url anota si trae query string', () => {
    expect(detectUrl('https://example.com/p?a=1')?.meta).toEqual({ hasQuery: true });
    expect(detectUrl('https://example.com')?.meta).toEqual({ hasQuery: false });
  });

  it('json NO acepta escalares desnudos (load-bearing para I8)', () => {
    expect(detectJson('123')).toBeNull();
    expect(detectJson('"solo un string"')).toBeNull();
    expect(detectJson('true')).toBeNull();
    expect(detectJson('{"a":1}')).not.toBeNull();
  });

  it('unix_timestamp distingue segundos de milisegundos por longitud', () => {
    expect(detectUnixTimestamp('1752624000')?.meta).toEqual({ unit: 'seconds' });
    expect(detectUnixTimestamp('1752624000000')?.meta).toEqual({ unit: 'milliseconds' });
  });
});

// ── Invariantes de detect(): text como suelo, orden, determinismo ────────────────────
describe('detect() — invariantes', () => {
  it('text SIEMPRE presente como último recurso con confianza 0.01 (I6)', () => {
    for (const input of ['', 'holaquetalestamos', '{"a":1}', '1752624000', JWT_BEARER]) {
      const detections = detect(input);
      const text = detections.find((d) => d.kind === 'text');
      expect(text).toBeDefined();
      expect(text?.confidence).toBe(0.01);
    }
  });

  it('text aparece exactamente UNA vez (nunca duplicado)', () => {
    for (const input of ['1752624000', '{"a":1}', 'holaquetalestamos', JWT_BEARER]) {
      expect(detect(input).filter((d) => d.kind === 'text')).toHaveLength(1);
    }
  });

  it('detectText siempre devuelve el mismo suelo, independiente del input', () => {
    expect(detectText('cualquier cosa')).toEqual({ kind: 'text', confidence: 0.01 });
    expect(detectText('')).toEqual({ kind: 'text', confidence: 0.01 });
  });

  it('las detecciones salen ordenadas por confianza DESCENDENTE', () => {
    for (const input of [
      JWT_BEARER,
      '{"a":1}',
      '1752624000',
      'https://example.com/p?a=1',
      '5d41402abc4b2a76b9719d911017c592',
    ]) {
      const confidences = detect(input).map((d) => d.confidence);
      const sorted = [...confidences].sort((a, b) => b - a);
      expect(confidences).toEqual(sorted);
      expect(confidences[0]).toBe(Math.max(...confidences));
    }
  });

  it('es determinista: mismo input ⇒ misma salida (I5)', () => {
    for (const input of [JWT_BEARER, '1752624000', 'holaquetalestamos', '{"a":1}']) {
      expect(detect(input)).toEqual(detect(input));
    }
  });

  it('detectJwt no lanza ante entradas basura (puro y total)', () => {
    for (const input of ['', '.', '..', 'a.b', 'not.a.jwt', '...', 'ñ.ñ.ñ']) {
      expect(() => detectJwt(input)).not.toThrow();
    }
  });
});
