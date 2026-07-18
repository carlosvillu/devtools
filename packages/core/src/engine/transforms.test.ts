// Corpus de las 11 transformaciones (§6.3) ejerciendo las funciones REALES (lógica pura,
// nada de mocks). Cubre: salida exacta sobre entradas VÁLIDAS, `{ok:false}` sin lanzar sobre
// entradas ROTAS, el control negativo de totalidad (I1), el determinismo con `now` fijo (I5)
// y el registro de transformaciones por defecto (§6.3). El grep de `Date.now()`/`new Date()`
// vive en su propia suite (no-clock.test.ts).
import { describe, expect, it } from 'vitest';
import {
  buildTransforms,
  buildTransformIndex,
  defaultTransformId,
  transformsForKind,
  TransformResultSchema,
  TransformSchema,
  DATA_KINDS,
  type TransformResult,
} from './index';

// `now` fijo para todo el corpus (I4/I5). Cualquier assert dependiente del tiempo se calcula
// contra ESTE instante, nunca contra el reloj real.
const NOW = new Date('2025-07-16T04:00:00Z');

const index = buildTransformIndex(NOW);
const apply = (id: string, input: string): TransformResult => {
  const t = index.get(id);
  if (!t) throw new Error(`transform desconocida en el test: ${id}`);
  return t.apply(input);
};
const output = (id: string, input: string): string => {
  const res = apply(id, input);
  if (!res.ok) throw new Error(`esperaba ok pero falló: ${res.error}`);
  return res.output;
};

// El ejemplo trabajado del §6.5 (mismo token que usa T1.1). exp = 1752624000 = 2025-07-16.
const JWT_BEARER = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ.abc';

// ── forma del registro: exactamente las 11, válidas contra el contrato §6.1 ──────────
describe('buildTransforms — las 11 transformaciones del §6.3', () => {
  const EXPECTED_IDS = [
    'base64.decode',
    'jwt.decode',
    'json.format',
    'json.minify',
    'json.sort_keys',
    'timestamp.to_iso',
    'timestamp.to_relative',
    'url.decode',
    'url.split_query',
    'uuid.describe',
    'hash.identify',
  ];

  const transforms = buildTransforms(NOW);

  it('construye exactamente las 11 ids esperadas del §6.3', () => {
    expect(transforms.map((t) => t.id)).toEqual(EXPECTED_IDS);
  });

  it('cada transformación valida contra TransformSchema (contrato §6.1)', () => {
    for (const t of transforms) {
      expect(TransformSchema.safeParse(t).success).toBe(true);
    }
  });

  it('cada `from` es un DataKind conocido', () => {
    for (const t of transforms) {
      expect(DATA_KINDS).toContain(t.from);
    }
  });
});

// ── entradas VÁLIDAS → salida EXACTA ─────────────────────────────────────────────────
describe('salidas exactas sobre entradas válidas', () => {
  it('base64.decode decodifica base64 estándar y base64url a UTF-8', () => {
    expect(output('base64.decode', 'aGVsbG8gd29ybGQ')).toBe('hello world');
    expect(output('base64.decode', 'eyJhIjoxfQ==')).toBe('{"a":1}');
  });

  it('json.format indenta a 2 espacios', () => {
    expect(output('json.format', '{"b":1,"a":2}')).toBe('{\n  "b": 1,\n  "a": 2\n}');
  });

  it('json.minify compacta', () => {
    expect(output('json.minify', '{\n  "a": 1,\n  "b": [1, 2]\n}')).toBe('{"a":1,"b":[1,2]}');
  });

  it('json.sort_keys ordena claves RECURSIVAMENTE (objetos anidados y dentro de arrays)', () => {
    const input = '{"b":1,"a":{"z":1,"m":2},"c":[{"y":1,"x":2}]}';
    expect(output('json.sort_keys', input)).toBe(
      '{\n  "a": {\n    "m": 2,\n    "z": 1\n  },\n  "b": 1,\n  "c": [\n    {\n      "x": 2,\n      "y": 1\n    }\n  ]\n}',
    );
  });

  it('json.sort_keys NO reordena los elementos de un array (solo claves de objetos)', () => {
    expect(output('json.sort_keys', '[3,1,2]')).toBe('[\n  3,\n  1,\n  2\n]');
  });

  it('timestamp.to_iso convierte segundos (10 díg) y milisegundos (13 díg) a ISO 8601 UTC', () => {
    expect(output('timestamp.to_iso', '1752624000')).toBe('2025-07-16T00:00:00.000Z');
    expect(output('timestamp.to_iso', '1752624000000')).toBe('2025-07-16T00:00:00.000Z');
    // Los milisegundos importan en la entrada de 13 dígitos.
    expect(output('timestamp.to_iso', '1752624000123')).toBe('2025-07-16T00:00:00.123Z');
  });

  it('timestamp.to_relative da español natural con "hace X" (pasado) y "en X" (futuro)', () => {
    // NOW = 2025-07-16T04:00:00Z. 4h antes → "hace 4 horas".
    expect(output('timestamp.to_relative', '1752624000')).toBe('hace 4 horas');
    // 2 días después de NOW → "en 2 días".
    const twoDaysAfter = String(Math.floor(NOW.getTime() / 1000) + 2 * 86400);
    expect(output('timestamp.to_relative', twoDaysAfter)).toBe('en 2 días');
    // Singular: 1 hora antes.
    const oneHourBefore = String(Math.floor(NOW.getTime() / 1000) - 3600);
    expect(output('timestamp.to_relative', oneHourBefore)).toBe('hace 1 hora');
  });

  // La magnitud es una LEY con 6 unidades y plurales (uno de ellos IRREGULAR: mes→meses).
  // No basta con medir en horas/días (§6.3): cada rama es código enviado y alcanzable. Se mide
  // cada unidad lejos de sus vecinas, incluidos los bordes singular/plural. Timestamps derivados
  // de NOW con las mismas constantes que producción (mes = 30 días, año = 365 días).
  const nowSec = Math.floor(NOW.getTime() / 1000);
  const relativeCases: [name: string, offsetSec: number, expected: string][] = [
    ['segundos (pasado)', -45, 'hace 45 segundos'],
    ['1 minuto (borde singular)', -60, 'hace 1 minuto'],
    ['minutos (futuro)', 300, 'en 5 minutos'],
    ['meses (plural irregular)', -60 * 86400, 'hace 2 meses'],
    ['1 año (borde singular)', -400 * 86400, 'hace 1 año'],
    ['ahora mismo (|diff| < 1s)', 0, 'ahora mismo'],
  ];

  it.each(relativeCases)('timestamp.to_relative — %s', (_name, offsetSec, expected) => {
    expect(output('timestamp.to_relative', String(nowSec + offsetSec))).toBe(expected);
  });

  it('url.decode aplica percent-decoding', () => {
    expect(output('url.decode', 'https://x.com/a%20b?q=hola%20mundo')).toBe(
      'https://x.com/a b?q=hola mundo',
    );
  });

  it('url.split_query devuelve los parámetros con valores DECODIFICADOS', () => {
    expect(output('url.split_query', 'https://example.com/p?a=hola%20mundo&b=2')).toBe(
      '{\n  "a": "hola mundo",\n  "b": "2"\n}',
    );
  });

  it('uuid.describe extrae versión y variante', () => {
    // nibble de variante `a` (grupo 4 empieza por `a`) → RFC 4122; versión 4.
    expect(output('uuid.describe', '550e8400-e29b-41d4-a716-446655440000')).toBe(
      '{\n  "version": 4,\n  "variant": "RFC 4122"\n}',
    );
    // versión 1.
    expect(output('uuid.describe', '550e8400-e29b-11d4-a716-446655440000')).toBe(
      '{\n  "version": 1,\n  "variant": "RFC 4122"\n}',
    );
  });

  it('uuid.describe deriva variantes fuera de 8..b (ejercita las ramas NCS y Microsoft)', () => {
    // nibble de variante `0` → NCS.
    expect(output('uuid.describe', '550e8400-e29b-41d4-0716-446655440000')).toBe(
      '{\n  "version": 4,\n  "variant": "NCS (retrocompatibilidad)"\n}',
    );
    // nibble de variante `c` → Microsoft.
    expect(output('uuid.describe', '550e8400-e29b-41d4-c716-446655440000')).toBe(
      '{\n  "version": 4,\n  "variant": "Microsoft (reservado)"\n}',
    );
    // nibble de variante `f` → reservado (futuro).
    expect(output('uuid.describe', '550e8400-e29b-41d4-f716-446655440000')).toBe(
      '{\n  "version": 4,\n  "variant": "reservado (futuro)"\n}',
    );
  });

  it('hash.identify lista los candidatos por longitud (32/40/64)', () => {
    expect(output('hash.identify', '5d41402abc4b2a76b9719d911017c592')).toBe(
      '{\n  "length": 32,\n  "candidates": [\n    "md5"\n  ]\n}',
    );
    expect(output('hash.identify', 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d')).toBe(
      '{\n  "length": 40,\n  "candidates": [\n    "sha1"\n  ]\n}',
    );
    expect(
      output('hash.identify', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
    ).toBe('{\n  "length": 64,\n  "candidates": [\n    "sha256"\n  ]\n}');
  });
});

// ── jwt.decode: contrato de comportamiento del §6.5 ──────────────────────────────────
describe('jwt.decode — contrato §6.5', () => {
  it('produce JSON COMPACTO con { header, payload, signature } (para que json.format aporte luego)', () => {
    const res = apply('jwt.decode', JWT_BEARER);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // Compacto: sin saltos de línea → el siguiente paso (json.format) NO es idempotente.
    expect(res.output).toBe(
      '{"header":{"alg":"HS256"},"payload":{"sub":"1","exp":1752624000},"signature":"abc"}',
    );
    // header y payload decodificados a objeto; signature es el segmento crudo.
    const parsed = JSON.parse(res.output) as Record<string, unknown>;
    expect(parsed.header).toEqual({ alg: 'HS256' });
    expect(parsed.payload).toEqual({ sub: '1', exp: 1752624000 });
    expect(parsed.signature).toBe('abc');
  });

  it('anota la expiración legible con `now` inyectado (formato exacto del §6.5)', () => {
    const res = apply('jwt.decode', JWT_BEARER);
    if (!res.ok) throw new Error('esperaba ok');
    // NOW = exp + 4h → "caducó hace 4 horas". La fecha se DERIVA de exp (2025-07-16, no 2026:
    // el `2026` del literal del PRD es ilustrativo y no cuadra con el epoch 1752624000).
    expect(res.notes).toEqual(['exp: 2025-07-16T00:00:00Z (caducó hace 4 horas)']);
  });

  it('anota "caduca en X" cuando exp está en el futuro respecto a now', () => {
    const futureExp = Math.floor(NOW.getTime() / 1000) + 2 * 86400; // +2 días
    const header = Buffer.from('{"alg":"HS256"}').toString('base64url');
    const payload = Buffer.from(JSON.stringify({ exp: futureExp })).toString('base64url');
    const res = apply('jwt.decode', `${header}.${payload}.sig`);
    if (!res.ok) throw new Error('esperaba ok');
    expect(res.notes).toEqual([
      `exp: ${new Date(futureExp * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')} (caduca en 2 días)`,
    ]);
  });

  it('sin `exp` en el payload no añade nota de expiración', () => {
    const header = Buffer.from('{"alg":"none"}').toString('base64url');
    const payload = Buffer.from('{"sub":"1"}').toString('base64url');
    const res = apply('jwt.decode', `${header}.${payload}.sig`);
    if (!res.ok) throw new Error('esperaba ok');
    expect(res.notes).toBeUndefined();
  });
});

// ── entradas ROTAS → {ok:false} sin lanzar ───────────────────────────────────────────
describe('entradas rotas → {ok:false}', () => {
  const broken: [id: string, input: string][] = [
    ['base64.decode', ''],
    ['base64.decode', '!!!!'],
    ['base64.decode', 'abcde'], // longitud mod 4 === 1
    ['jwt.decode', 'no.es.jwt'],
    ['jwt.decode', 'solodos.segmentos'],
    ['json.format', '{roto'],
    ['json.minify', 'no es json'],
    ['json.sort_keys', '{"a":}'],
    ['timestamp.to_iso', 'noesnumero'],
    ['timestamp.to_iso', '123'], // ni 10 ni 13 dígitos
    ['timestamp.to_relative', ''],
    ['url.decode', '%'], // percent malformado
    ['url.split_query', 'no es una url'],
    ['uuid.describe', 'no-es-uuid'],
    ['hash.identify', 'xyz'],
    ['hash.identify', 'abc'], // hex pero longitud no válida
  ];

  it.each(broken)('%s sobre %j → ok:false', (id, input) => {
    const res = apply(id, input);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.length).toBeGreaterThan(0);
  });
});

// ── CONTROL NEGATIVO de totalidad (I1): ninguna `apply` lanza jamás ──────────────────
describe('control negativo de totalidad — ninguna `apply` lanza con basura real', () => {
  const garbage = [
    '',
    ' ',
    '\n\t',
    'ñññ',
    '{',
    '[',
    '%%%',
    '....',
    'Bearer ',
    '000000000000000000000000000000000000',
    '💥🔥',
    ' ',
    'a'.repeat(10000),
    'https://',
    '%E0%A4%A',
    'null',
    'undefined',
    '-1',
    '9'.repeat(13),
  ];

  const transforms = buildTransforms(NOW);

  it('cada apply, con cada basura, NO lanza y devuelve un TransformResult válido', () => {
    for (const t of transforms) {
      for (const input of garbage) {
        // Si algo lanza, este test FALLA (no hay catch que lo trague) — I1.
        expect(() => t.apply(input)).not.toThrow();
        // La salida SIEMPRE encaja en el contrato discriminado (ok:true|false).
        expect(TransformResultSchema.safeParse(t.apply(input)).success).toBe(true);
      }
    }
  });
});

// ── determinismo con `now` fijo (I5) ─────────────────────────────────────────────────
describe('determinismo (I5)', () => {
  it('timestamp.to_relative con el mismo `now` da el mismo texto en dos ejecuciones', () => {
    const a = buildTransformIndex(NOW).get('timestamp.to_relative')!;
    const b = buildTransformIndex(NOW).get('timestamp.to_relative')!;
    expect(a.apply('1752624000')).toEqual(b.apply('1752624000'));
    expect(a.apply('1752624000')).toEqual({ ok: true, output: 'hace 4 horas' });
  });

  it('jwt.decode con el mismo `now` produce la misma nota de exp', () => {
    const first = buildTransformIndex(NOW).get('jwt.decode')?.apply(JWT_BEARER);
    const second = buildTransformIndex(NOW).get('jwt.decode')?.apply(JWT_BEARER);
    expect(first).toEqual(second);
  });
});

// ── registro por defecto de cada kind (§6.3), incluida la regla condicional de url ──
describe('defaultTransformId — la por defecto de cada kind (§6.3)', () => {
  it('mapea cada kind a su transformación por defecto', () => {
    expect(defaultTransformId('base64', 'aGk')).toBe('base64.decode');
    expect(defaultTransformId('jwt', 'a.b.c')).toBe('jwt.decode');
    expect(defaultTransformId('json', '{}')).toBe('json.format');
    expect(defaultTransformId('unix_timestamp', '1752624000')).toBe('timestamp.to_iso');
    expect(defaultTransformId('uuid', '550e8400-e29b-41d4-a716-446655440000')).toBe(
      'uuid.describe',
    );
    expect(defaultTransformId('hash', '5d41402abc4b2a76b9719d911017c592')).toBe('hash.identify');
  });

  it('url: split_query SI hay query, decode si NO (regla condicional)', () => {
    expect(defaultTransformId('url', 'https://example.com/p?a=1')).toBe('url.split_query');
    expect(defaultTransformId('url', 'https://example.com/path')).toBe('url.decode');
  });

  it('text es terminal: no tiene transformación por defecto (I6)', () => {
    expect(defaultTransformId('text', 'lo que sea')).toBeNull();
  });

  it('la por defecto de cada kind existe en el registro construido', () => {
    for (const kind of DATA_KINDS) {
      const id = defaultTransformId(kind, 'https://example.com/p?a=1');
      if (id === null) continue; // text
      expect(index.get(id)).toBeDefined();
    }
  });
});

// ── opciones del picker de desvío (O4/T1.6): transformaciones aplicables a un kind ──────────
describe('transformsForKind — opciones del picker (O4)', () => {
  it('devuelve TODAS las transformaciones cuyo `from` es el kind, con id + label', () => {
    // json es el kind con más opciones (§6.3): format, minify, sort_keys.
    const jsonOpts = transformsForKind('json');
    expect(jsonOpts.map((o) => o.id)).toEqual(['json.format', 'json.minify', 'json.sort_keys']);
    expect(jsonOpts.every((o) => typeof o.label === 'string' && o.label.length > 0)).toBe(true);

    // unix_timestamp: to_iso + to_relative (por eso el picker aparece en el paso de 14.3).
    expect(transformsForKind('unix_timestamp').map((o) => o.id)).toEqual([
      'timestamp.to_iso',
      'timestamp.to_relative',
    ]);
    // url: decode + split_query.
    expect(transformsForKind('url').map((o) => o.id)).toEqual(['url.decode', 'url.split_query']);
  });

  it('un kind con una sola transformación devuelve exactamente una (sin picker en la UI)', () => {
    expect(transformsForKind('jwt').map((o) => o.id)).toEqual(['jwt.decode']);
    expect(transformsForKind('base64').map((o) => o.id)).toEqual(['base64.decode']);
    expect(transformsForKind('uuid').map((o) => o.id)).toEqual(['uuid.describe']);
    expect(transformsForKind('hash').map((o) => o.id)).toEqual(['hash.identify']);
  });

  it('text no tiene transformaciones (I6: es el suelo, no se transforma desde él)', () => {
    expect(transformsForKind('text')).toEqual([]);
  });

  it('cada id ofrecido existe en el índice del motor (no divergen del registro)', () => {
    for (const kind of DATA_KINDS) {
      for (const opt of transformsForKind(kind)) {
        expect(index.get(opt.id)).toBeDefined();
      }
    }
  });
});
