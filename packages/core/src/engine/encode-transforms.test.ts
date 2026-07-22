// Corpus del catálogo de CODIFICACIÓN (§6.6, T6.4) ejerciendo las funciones REALES. Cubre:
// la forma del catálogo (ids, grupos, contrato), la salida exacta sobre entradas válidas
// —incluidos no-ASCII y emoji, que es donde `btoa` se rompe—, `{ok:false}` SIN LANZAR sobre
// la entrada rota, la totalidad de las que no pueden fallar, la IDA Y VUELTA contra las
// transformaciones de §6.3 y la reutilización (no duplicación) de `json.minify`.
// El grep de `node:`/`Buffer`/`crypto.subtle` vive en su propia suite: client-only.test.ts.
import { describe, expect, it } from 'vitest';
import {
  buildEncodeIndex,
  buildEncodeTransforms,
  encodeCatalogByGroup,
  EncodeTransformSchema,
  buildTransformIndex,
  TransformResultSchema,
  type EncodeTransform,
  type Transform,
  type TransformResult,
} from './index';

// Instante fijo para todo el corpus (I4/I5). Ninguna de las 5 transformaciones de T6.4
// depende del reloj, pero las dos factories lo exigen —y con razón: el motor nunca fabrica su
// propio `now`—, así que se inyecta uno y todo queda determinista.
const NOW = new Date('2025-07-16T04:00:00Z');
const encodeIndex = buildEncodeIndex({ now: NOW });
const encodeTransforms = buildEncodeTransforms({ now: NOW });
const decodeIndex = buildTransformIndex(NOW);

// Un `apply` por id contra un índice concreto. Las dos direcciones se resuelven igual: lo
// único que cambia es el índice y el sustantivo del mensaje de error.
const applyFrom =
  (index: Map<string, EncodeTransform | Transform>, kind: string) =>
  (id: string, input: string): TransformResult => {
    const t = index.get(id);
    if (!t) throw new Error(`transform de ${kind} desconocida en el test: ${id}`);
    return t.apply(input);
  };

const apply = applyFrom(encodeIndex, 'codificación');
const decode = applyFrom(decodeIndex, 'decodificación');

const output = (id: string, input: string): string => {
  const res = apply(id, input);
  if (!res.ok) throw new Error(`esperaba ok pero falló: ${res.error}`);
  return res.output;
};

// Un surrogate SUELTO (medio par UTF-16): la única familia de entradas que rompe algo aquí.
const LONE_SURROGATE = '\uD800';

// ── forma del catálogo (§6.6) ───────────────────────────────────────────────────────

describe('el catálogo de codificación sin secreto (§6.6)', () => {
  it('cada entrada valida contra EncodeTransformSchema', () => {
    for (const t of encodeTransforms) {
      expect(EncodeTransformSchema.safeParse(t).success, `${t.id} no valida`).toBe(true);
    }
  });

  // Fija a la vez las 5 ids del §6.6 que no necesitan secreto, su orden (el de la paleta del
  // artboard), su label (el id literal, como en el mockup) y su grupo.
  it('las 5 entradas: id, label del mockup y grupo de la paleta del §7, en orden', () => {
    expect(encodeTransforms.map((t) => [t.id, t.label, t.group])).toEqual([
      ['json.minify', 'json.minify', 'json'],
      ['json.stringify', 'json.stringify', 'json'],
      ['base64.encode', 'base64.encode', 'binario'],
      ['base64url.encode', 'base64url.encode', 'binario'],
      ['url.encode', 'url.encode', 'binario'],
    ]);
  });

  it('el índice por id cubre todo el catálogo', () => {
    expect(encodeIndex.size).toBe(encodeTransforms.length);
    expect([...encodeIndex.keys()]).toEqual(encodeTransforms.map((t) => t.id));
  });

  // El contexto entra por la FACTORY (`now`, per-ejecución) y las opciones por la LLAMADA
  // (per-paso): es lo que permitirá a `jwt.sign` (T6.5) entrar en el catálogo sin reescribirlo
  // ni convertirse en un caso especial dentro de `compose()` (I12). Las 5 de T6.4 ignoran
  // ambos, y eso también se fija: pasar opciones no cambia su salida.
  it('las 5 de T6.4 ignoran el contexto y las opciones (mismo resultado con y sin ellas)', () => {
    const otro = buildEncodeIndex({ now: new Date('1999-12-31T23:59:59Z') });
    for (const { id } of encodeTransforms) {
      const conOpciones = encodeIndex.get(id)?.apply('{"a":1}', { secret: 'da igual' });
      expect(conOpciones, `${id} con opciones`).toEqual(apply(id, '{"a":1}'));
      expect(otro.get(id)?.apply('{"a":1}'), `${id} con otro now`).toEqual(apply(id, '{"a":1}'));
    }
  });

  // El catálogo es dato del MOTOR, no de la UI (misma lección que KINDS_COEXISTING_WITH_TEXT):
  // la paleta agrupada de /compose (T6.7) se deriva de aquí, no de una lista a mano.
  it('encodeCatalogByGroup agrupa para la paleta y omite los grupos aún vacíos', () => {
    expect(encodeCatalogByGroup()).toEqual([
      {
        group: 'json',
        items: [
          { id: 'json.minify', label: 'json.minify' },
          { id: 'json.stringify', label: 'json.stringify' },
        ],
      },
      {
        group: 'binario',
        items: [
          { id: 'base64.encode', label: 'base64.encode' },
          { id: 'base64url.encode', label: 'base64url.encode' },
          { id: 'url.encode', label: 'url.encode' },
        ],
      },
    ]);
  });

  // «Componer nunca elige sola» (I12): aquí no existe el concepto de default del §6.3.
  it('el catálogo de codificación NO comparte entradas nuevas con el registro de §6.3', () => {
    const decodeIds = [...decodeIndex.keys()];
    const soloCodificacion = encodeTransforms
      .map((t) => t.id)
      .filter((id) => !decodeIds.includes(id));
    expect(soloCodificacion).toEqual([
      'json.stringify',
      'base64.encode',
      'base64url.encode',
      'url.encode',
    ]);
  });

  // REUTILIZACIÓN, no duplicación: la prueba es la IDENTIDAD REFERENCIAL. Un test de igualdad
  // de comportamiento pasaría igual con una copia pegada; esto solo pasa si es LA MISMA función.
  it('json.minify es LA MISMA función del registro de decodificación (§6.3), no una copia', () => {
    const enCodificacion = encodeIndex.get('json.minify');
    const enDecodificacion = decodeIndex.get('json.minify');
    expect(enCodificacion?.apply).toBe(enDecodificacion?.apply);
  });
});

// ── salida exacta sobre entradas válidas ────────────────────────────────────────────

describe('json.stringify — envuelve el texto como string JSON escapado', () => {
  // DECISIÓN documentada junto al código: la entrada es TEXTO OPACO. No reformatea JSON
  // (eso ya es json.format/json.minify): envuelve para empotrar en otro JSON.
  const cases: [name: string, input: string, expected: string][] = [
    ['texto simple', 'hola', '"hola"'],
    ['comillas y barras', 'di "hola"\\', '"di \\"hola\\"\\\\"'],
    ['salto de línea y tabulador', 'a\nb\tc', '"a\\nb\\tc"'],
    ['no-ASCII', 'año', '"año"'],
    ['emoji', '🙂', '"🙂"'],
    ['JSON de entrada: se ESCAPA, no se reformatea', '{"a":1}', '"{\\"a\\":1}"'],
    ['cadena vacía', '', '""'],
  ];
  it.each(cases)('%s', (_name, input, expected) => {
    expect(output('json.stringify', input)).toBe(expected);
  });

  it('ida y vuelta: JSON.parse de la salida devuelve el texto original', () => {
    for (const [, input] of cases) {
      expect(JSON.parse(output('json.stringify', input))).toBe(input);
    }
  });
});

describe('base64.encode — UTF-8 → base64 estándar con padding', () => {
  // Vectores de la RFC 4648 §10 (los canónicos de base64).
  const rfc4648: [input: string, expected: string][] = [
    ['', ''],
    ['f', 'Zg=='],
    ['fo', 'Zm8='],
    ['foo', 'Zm9v'],
    ['foob', 'Zm9vYg=='],
    ['fooba', 'Zm9vYmE='],
    ['foobar', 'Zm9vYmFy'],
  ];
  it.each(rfc4648)('vector RFC 4648: %j → %s', (input, expected) => {
    expect(output('base64.encode', input)).toBe(expected);
  });

  // El caso que de verdad importa: `btoa` LANZA aquí (solo acepta Latin-1). Que estas
  // aserciones pasen es la prueba de que se codifica UTF-8 a mano, sin `Buffer` ni `btoa`.
  const utf8: [name: string, input: string, expected: string][] = [
    ['acento (2 bytes)', 'año', 'YcOxbw=='],
    ['ñ sola', 'ñ', 'w7E='],
    ['emoji (4 bytes, par surrogate)', '🙂', '8J+Zgg=='],
    ['CJK (3 bytes)', '日本語', '5pel5pys6Kqe'],
    ['frase mixta', 'Hola, mundo', 'SG9sYSwgbXVuZG8='],
  ];
  it.each(utf8)('%s', (_name, input, expected) => {
    expect(output('base64.encode', input)).toBe(expected);
  });
});

describe('base64url.encode — base64url sin padding y con alfabeto -_', () => {
  const cases: [name: string, input: string, expected: string][] = [
    ['sin padding (1 byte)', 'f', 'Zg'],
    ['sin padding (2 bytes)', 'fo', 'Zm8'],
    ['múltiplo de 3: igual que el estándar', 'foobar', 'Zm9vYmFy'],
    ['emoji: usa `-` donde el estándar usa `+`', '🙂', '8J-Zgg'],
    ['acento', 'año', 'YcOxbw'],
    // El payload del mockup (`variant-compose.jsx`, BuildStep de base64url.encode): dato REAL
    // y reproducible del artboard —a diferencia del JWT firmado, que es decorativo—.
    [
      'payload del artboard ComposeClaro',
      '{"sub":"1","name":"carlos","role":"admin"}',
      'eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsInJvbGUiOiJhZG1pbiJ9',
    ],
  ];
  it.each(cases)('%s', (_name, input, expected) => {
    expect(output('base64url.encode', input)).toBe(expected);
  });

  it('nunca emite `+`, `/` ni `=`', () => {
    for (const input of ['🙂', 'año', 'f', 'fo', '???>>>~~~', 'ÿþý']) {
      expect(output('base64url.encode', input)).toMatch(/^[A-Za-z0-9_-]*$/);
    }
  });
});

describe('url.encode — percent-encoding', () => {
  const cases: [name: string, input: string, expected: string][] = [
    ['espacio y coma', 'Hola, mundo', 'Hola%2C%20mundo'],
    ['acento', 'año', 'a%C3%B1o'],
    ['emoji', '🙂', '%F0%9F%99%82'],
    ['ya percent-encoded: se re-escapa el %', '%20', '%2520'],
    ['reservados de query', 'a=1&b=2', 'a%3D1%26b%3D2'],
    ['no reserva: los seguros pasan tal cual', "-_.!~*'()", "-_.!~*'()"],
  ];
  it.each(cases)('%s', (_name, input, expected) => {
    expect(output('url.encode', input)).toBe(expected);
  });
});

// ── totalidad y control negativo (I1/I9): ningún `apply` LANZA jamás ────────────────

describe('pureza y totalidad (I1/I9): ningún apply lanza, un fallo es un dato', () => {
  // Entradas adversariales: cada una se pasa a las 5 transformaciones envolviendo la llamada
  // en try/catch. El assert es doble: no lanza, Y el resultado valida contra el contrato.
  const adversarial: [name: string, input: string][] = [
    ['cadena vacía', ''],
    ['solo espacios', '   '],
    ['texto que no es JSON', 'no soy json'],
    ['JSON truncado', '{"a":'],
    ['escalar desnudo', '123'],
    ['emoji', '🙂'],
    ['surrogate suelto', LONE_SURROGATE],
    ['surrogate suelto entre texto', `a${LONE_SURROGATE}b`],
    ['bytes de control', '\u0000\u001f'],
    ['percent malformado', '%zz%'],
    ['muy largo', 'ñ🙂'.repeat(5000)],
  ];

  it.each(adversarial)(
    '%s: ninguna de las 5 lanza y todas devuelven un TransformResult',
    (_name, input) => {
      for (const t of encodeTransforms) {
        let result: TransformResult;
        try {
          result = t.apply(input);
        } catch (err) {
          throw new Error(`${t.id} LANZÓ (viola I1/I9): ${String(err)}`);
        }
        expect(
          TransformResultSchema.safeParse(result).success,
          `${t.id} no devolvió un TransformResult`,
        ).toBe(true);
      }
    },
  );

  // Las que NO pueden fallar: no se les inventa un error imposible, se demuestra que son
  // totales de verdad sobre todo el corpus adversarial.
  it.each(['json.stringify', 'base64.encode', 'base64url.encode'])(
    '%s es TOTAL: ok:true para toda entrada adversarial',
    (id) => {
      for (const [, input] of adversarial) {
        expect(apply(id, input).ok, `${id} falló con ${JSON.stringify(input.slice(0, 20))}`).toBe(
          true,
        );
      }
    },
  );

  // Las que SÍ pueden fallar, con la entrada exacta que las rompe.
  it('json.minify devuelve {ok:false} sobre lo que no es JSON', () => {
    const res = apply('json.minify', 'no soy json');
    expect(res).toEqual({ ok: false, error: 'La entrada no es JSON válido.' });
  });

  it('url.encode devuelve {ok:false} sobre un surrogate suelto (URIError capturado)', () => {
    // Control de que el escenario es real: `encodeURIComponent` LANZA con esta entrada.
    expect(() => encodeURIComponent(LONE_SURROGATE)).toThrow();
    const res = apply('url.encode', LONE_SURROGATE);
    expect(res.ok).toBe(false);
    // Sin `if` (el lint prohíbe expects condicionales): en la rama ok el valor es un
    // marcador que NUNCA contiene 'UTF-16', así que el assert sigue mordiendo.
    expect(res.ok ? 'SIN ERROR' : res.error).toContain('UTF-16');
  });

  // base64.encode NO falla con el surrogate suelto: TextEncoder lo sustituye por U+FFFD.
  // Con pérdida, pero sin excepción — se fija aquí para que nadie lo "arregle" lanzando.
  it('base64.encode sustituye el surrogate suelto por U+FFFD en vez de lanzar', () => {
    expect(output('base64.encode', LONE_SURROGATE)).toBe(output('base64.encode', '\uFFFD'));
  });
});

// ── IDA Y VUELTA contra las transformaciones de decodificación (§6.3) ───────────────

// Corpus compartido de la ida y vuelta. Tiene DOS exclusiones, y ninguna es un descuido:
//
//   (a) la CADENA VACÍA no está en el corpus: `base64.encode('')` da `''` y `base64.decode` lo
//       RECHAZA ("demasiado corta"), que es su comportamiento correcto como detector de la
//       dirección de decodificar (0 bytes no es un dato que reabrir);
//   (b) para `base64url.encode` se excluyen además las entradas de 1–2 BYTES (ver
//       `ROUND_TRIP_B64URL` más abajo).
const ROUND_TRIP: [name: string, value: string][] = [
  ['ascii', 'hola'],
  ['una letra', 'a'],
  ['dos letras', 'ab'],
  ['frase con espacios y coma', 'Hola, mundo'],
  ['acentos', 'añoñóáéíóú'],
  ['emoji', '🙂'],
  ['emoji entre texto', 'carlos 🙂 dice año'],
  ['CJK', '日本語のテキスト'],
  ['JSON', '{"sub":"1","name":"carlos","role":"admin"}'],
  ['saltos de línea', 'línea1\nlínea2\r\nlínea3'],
  ['espacios al borde', '  espacios  '],
  ['reservados de URL', 'a=1&b=2?c#d/e+f'],
  ['ya percent-encoded', '%20%C3%B1'],
  ['bytes altos Latin-1', 'ÿþý'],
];

// Subcorpus para `base64url.encode → base64.decode`: el mismo, SIN las entradas de 1 y 2
// bytes UTF-8. Motivo (asimetría real, no capricho del test): base64url va SIN padding, así
// que 1–2 bytes producen 2–3 caracteres, y `base64.decode` (transforms.ts) rechaza toda
// entrada de longitud < 4 antes de mirar nada. La codificación es correcta; la que no reabre
// es la dirección de decodificar. §6.6 afirma que `base64.decode` reabre lo que produce
// `base64url.encode`, así que el hueco queda anotado para **T6.6** (round-trip de corpus
// completo contra `analyze()`), que es quien puede tocar el guard sin salirse de su alcance.
// El filtro se calcula con `TextEncoder` (bytes reales), no con `.length` (code units).
const ROUND_TRIP_B64URL = ROUND_TRIP.filter(
  ([, value]) => new TextEncoder().encode(value).length >= 3,
);

describe('ida y vuelta: lo que codifica esta dirección lo reabre la de §6.3', () => {
  it('el subcorpus de base64url excluye solo las entradas de 1–2 bytes', () => {
    const excluidas = ROUND_TRIP.filter((c) => !ROUND_TRIP_B64URL.includes(c)).map(([n]) => n);
    expect(excluidas).toEqual(['una letra', 'dos letras']);
    expect(ROUND_TRIP_B64URL.length).toBeGreaterThan(0);
  });

  it.each(ROUND_TRIP)('base64.encode → base64.decode devuelve el original: %s', (_name, value) => {
    const encoded = output('base64.encode', value);
    const back = decode('base64.decode', encoded);
    // Ternario en vez de `if` (lint: no-conditional-expect). Si el decode falla, el assert
    // compara el mensaje de error contra el original y falla enseñándolo.
    expect(back.ok ? back.output : `FALLÓ: ${back.error}`).toBe(value);
  });

  it.each(ROUND_TRIP_B64URL)(
    'base64url.encode → base64.decode devuelve el original: %s',
    (_name, value) => {
      const encoded = output('base64url.encode', value);
      const back = decode('base64.decode', encoded);
      expect(back.ok ? back.output : `FALLÓ: ${back.error}`).toBe(value);
    },
  );

  // La asimetría que justifica el filtro anterior, fijada como comportamiento CONOCIDO en vez
  // de escondida: la codificación es correcta (byte a byte contra el estándar), quien no
  // reabre es `base64.decode`. Si T6.6 relaja ese guard, este test se pone rojo y obliga a
  // mover la exclusión de arriba — que es exactamente lo que se quiere que pase.
  it('base64url de 1–2 bytes: `base64.decode` lo rechaza por corto (hueco para T6.6)', () => {
    expect(output('base64url.encode', 'a')).toBe('YQ');
    expect(output('base64url.encode', 'ab')).toBe('YWI');
    expect(decode('base64.decode', 'YQ')).toEqual({
      ok: false,
      error: 'La entrada es demasiado corta para ser base64.',
    });
    expect(decode('base64.decode', 'YWI')).toEqual({
      ok: false,
      error: 'La entrada es demasiado corta para ser base64.',
    });
  });

  it.each(ROUND_TRIP)('url.encode → url.decode devuelve el original: %s', (_name, value) => {
    const encoded = output('url.encode', value);
    const back = decode('url.decode', encoded);
    expect(back.ok ? back.output : `FALLÓ: ${back.error}`).toBe(value);
  });

  // Determinismo (I5/I11): mismas entradas ⇒ mismas salidas byte a byte.
  it('dos ejecuciones del catálogo completo sobre el corpus dan lo mismo', () => {
    const run = (): string[] =>
      ROUND_TRIP.flatMap(([, v]) => encodeTransforms.map((t) => JSON.stringify(t.apply(v))));
    expect(run()).toEqual(run());
  });
});
