// Corpus del catálogo de CODIFICACIÓN (§6.6, T6.4) ejerciendo las funciones REALES. Cubre:
// la forma del catálogo (ids, grupos, contrato), la salida exacta sobre entradas válidas
// —incluidos no-ASCII y emoji, que es donde `btoa` se rompe—, `{ok:false}` SIN LANZAR sobre
// la entrada rota, la totalidad de las que no pueden fallar, la IDA Y VUELTA contra las
// transformaciones de §6.3 y la reutilización (no duplicación) de `json.minify`.
// El grep de `node:`/`Buffer`/`crypto.subtle` vive en su propia suite: client-only.test.ts.
// `node:crypto` y `Buffer` se usan SOLO desde el test (T6.5): son el oráculo independiente
// contra el que se cruza `jwt.sign`. El motor no puede usarlos (§5.3) y el grep de
// `client-only.test.ts` lo vigila — pero solo sobre los ficheros de PRODUCCIÓN, no sobre este.
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  buildEncodeIndex,
  buildEncodeTransforms,
  detect,
  encodeCatalogByGroup,
  EncodeOptionSpecSchema,
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

  // Fija a la vez las 8 ids de la tabla del §6.6, su orden (el de la paleta del artboard), su
  // label (el id literal, como en el mockup) y su grupo. T6.5 añade las 3 últimas.
  it('las 8 entradas: id, label del mockup y grupo de la paleta del §7, en orden', () => {
    expect(encodeTransforms.map((t) => [t.id, t.label, t.group])).toEqual([
      ['json.minify', 'json.minify', 'json'],
      ['json.stringify', 'json.stringify', 'json'],
      ['base64.encode', 'base64.encode', 'binario'],
      ['base64url.encode', 'base64url.encode', 'binario'],
      ['url.encode', 'url.encode', 'binario'],
      ['hash.sha256', 'hash.sha256', 'hash'],
      ['hash.md5', 'hash.md5', 'hash'],
      ['jwt.sign', 'jwt.sign', 'firma'],
    ]);
  });

  it('el índice por id cubre todo el catálogo', () => {
    expect(encodeIndex.size).toBe(encodeTransforms.length);
    expect([...encodeIndex.keys()]).toEqual(encodeTransforms.map((t) => t.id));
  });

  // El contexto entra por la FACTORY (`now`, per-ejecución) y las opciones por la LLAMADA
  // (per-paso): es lo que permitió a `jwt.sign` (T6.5) entrar en el catálogo sin reescribirlo
  // ni convertirse en un caso especial dentro de `compose()` (I12).
  // El bucle va sobre una lista EXPLÍCITA de las 7 sin secreto, no sobre `encodeTransforms`:
  // desde T6.5 el catálogo incluye `jwt.sign`, que sí depende del `now` (iat) y de las
  // opciones (secreto) — recorrer el catálogo entero convertiría este test en falso. Que
  // `jwt.sign` NO sea insensible a ninguno de los dos se comprueba en su propia suite.
  it('las 7 sin secreto ignoran el contexto y las opciones (mismo resultado con y sin ellas)', () => {
    const otro = buildEncodeIndex({ now: new Date('1999-12-31T23:59:59Z') });
    const sinSecreto = [
      'json.minify',
      'json.stringify',
      'base64.encode',
      'base64url.encode',
      'url.encode',
      'hash.sha256',
      'hash.md5',
    ];
    expect(sinSecreto).toEqual(encodeTransforms.map((t) => t.id).filter((id) => id !== 'jwt.sign'));
    for (const id of sinSecreto) {
      const conOpciones = encodeIndex.get(id)?.apply('{"a":1}', { secret: 'da igual' });
      expect(conOpciones, `${id} con opciones`).toEqual(apply(id, '{"a":1}'));
      expect(otro.get(id)?.apply('{"a":1}'), `${id} con otro now`).toEqual(apply(id, '{"a":1}'));
    }
  });

  // El catálogo es dato del MOTOR, no de la UI (misma lección que KINDS_COEXISTING_WITH_TEXT):
  // la paleta agrupada de /compose (T6.7) se deriva de aquí, no de una lista a mano.
  // T6.5 puebla `hash` y `firma`, que T6.4 dejó declarados y vacíos: desde aquí la paleta
  // pinta los CUATRO grupos del §6.6. No es una regresión del filtro, es su consecuencia.
  it('encodeCatalogByGroup agrupa para la paleta en el orden de ENCODE_GROUPS', () => {
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
      {
        group: 'hash',
        items: [
          { id: 'hash.sha256', label: 'hash.sha256' },
          { id: 'hash.md5', label: 'hash.md5' },
        ],
      },
      {
        group: 'firma',
        items: [
          {
            id: 'jwt.sign',
            label: 'jwt.sign',
            // El descriptor viaja hasta la paleta: es lo que permite a T6.7/T6.8 pintar el
            // panel del secreto recorriendo un array, sin `if (id === 'jwt.sign')`.
            options: [
              {
                key: 'alg',
                label: 'Algoritmo',
                kind: 'choice',
                choices: ['HS256'],
                required: false,
              },
              { key: 'secret', label: 'Secreto de firma', kind: 'secret', required: true },
            ],
          },
        ],
      },
    ]);
  });

  // ── el descriptor de opciones (§6.6, T6.5) ────────────────────────────────────────
  // Sin él, «esta transformación pide un secreto» solo lo sabe el cuerpo de `applyJwtSign`, y
  // los tres consumidores previstos (panel de T6.7/T6.8 y allowlist de persistencia de T6.10)
  // tendrían que hardcodear el id — un `if` que el typechecker NO vigila, porque `id` es
  // `z.string()` y no una unión.
  it('solo jwt.sign declara opciones; las otras 7 omiten el campo', () => {
    const conOpciones = encodeTransforms.filter((t) => t.options !== undefined).map((t) => t.id);
    expect(conOpciones).toEqual(['jwt.sign']);
  });

  it('cada descriptor de opción valida contra EncodeOptionSpecSchema', () => {
    for (const option of encodeIndex.get('jwt.sign')?.options ?? []) {
      expect(EncodeOptionSpecSchema.safeParse(option).success, `${option.key} no valida`).toBe(
        true,
      );
    }
  });

  // LA propiedad de la que depende T6.10: el descriptor identifica el campo sensible, y la
  // allowlist de persistencia se deriva de `kind !== 'secret'` en vez de mantenerse a mano.
  it('el campo sensible es derivable del descriptor (fuente de la allowlist de T6.10)', () => {
    const options = encodeIndex.get('jwt.sign')?.options ?? [];
    expect(options.filter((o) => o.kind === 'secret').map((o) => o.key)).toEqual(['secret']);
    expect(options.filter((o) => o.kind !== 'secret').map((o) => o.key)).toEqual(['alg']);
  });

  // El descriptor NO es un validador: la autoridad sobre qué se acepta sigue siendo la
  // función. Se fija aquí para que nadie mueva la validación al catálogo creyendo que
  // "ya está declarada": `required: true` en `secret` no impide llamar sin él — quien lo
  // impide es el `{ok:false}` de `applyJwtSign`.
  it('el descriptor describe, no valida: la función sigue siendo la autoridad', () => {
    const alg = encodeIndex.get('jwt.sign')?.options?.find((o) => o.key === 'alg');
    expect(alg?.choices).toEqual(['HS256']);
    expect(alg?.required).toBe(false); // ausente ⇒ HS256, no es un olvido
    const res = encodeIndex.get('jwt.sign')?.apply(PAYLOAD_MOCKUP, {});
    expect(res).toEqual({
      ok: false,
      error: 'jwt.sign necesita un secreto: escríbelo en las opciones del paso.',
    });
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
      'hash.sha256',
      'hash.md5',
      'jwt.sign',
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
  // Entradas adversariales: cada una se pasa a TODO el catálogo envolviendo la llamada en
  // try/catch. El assert es doble: no lanza, Y el resultado valida contra el contrato.
  // `jwt.sign` entra aquí sin opciones (y por tanto sin secreto): su respuesta correcta a
  // cualquiera de estas entradas es `{ok:false}`, que también es un TransformResult válido.
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
    '%s: ninguna de las 8 lanza y todas devuelven un TransformResult',
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

  // ── el corpus adversarial, otra vez, PERO CON OPCIONES ────────────────────────────
  //
  // El bucle de arriba llama a las 8 SIN `options`, así que `jwt.sign` sale siempre por su
  // PRIMERA guarda (falta de secreto) y su totalidad más allá de ese `return` no se ejercita
  // jamás: el corpus lo recorre en apariencia y no toca ni el parseo del payload, ni la
  // validación de `alg`, ni la firma. Estas tres pasadas cierran ese hueco, y la tercera es la
  // que caza el fallo real: `JSON.stringify(alg)` LANZA con BigInt, ciclos y `toJSON` roto.
  const badAlgs: [name: string, alg: unknown][] = [
    ['string desconocido', 'RS512'],
    ['null', null],
    ['número', 256],
    ['BigInt (JSON.stringify LANZA)', 10n],
    ['símbolo (JSON.stringify da undefined)', Symbol('HS256')],
    ['función (JSON.stringify da undefined)', () => 1],
    ['array', ['HS256']],
    [
      'objeto con toJSON que lanza',
      {
        toJSON: (): never => {
          throw new Error('boom');
        },
      },
    ],
  ];

  // Estructura circular: se construye aparte porque no se puede escribir como literal.
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  badAlgs.push(['estructura circular (JSON.stringify LANZA)', circular]);

  it.each(adversarial)(
    '%s: jwt.sign CON secreto tampoco lanza (pasa de la primera guarda)',
    (_name, input) => {
      const t = encodeIndex.get('jwt.sign');
      let result: TransformResult;
      try {
        result = t?.apply(input, { secret: TEST_SECRET }) ?? { ok: false, error: 'sin jwt.sign' };
      } catch (err) {
        throw new Error(`jwt.sign LANZÓ con secreto (viola I1/I9): ${String(err)}`);
      }
      expect(TransformResultSchema.safeParse(result).success).toBe(true);
    },
  );

  it.each(badAlgs)(
    'jwt.sign con alg %s no lanza y devuelve {ok:false} con un mensaje útil',
    (_name, alg) => {
      let result: TransformResult;
      try {
        result =
          encodeIndex.get('jwt.sign')?.apply(PAYLOAD_MOCKUP, { secret: TEST_SECRET, alg }) ??
          ({ ok: false, error: 'sin jwt.sign' } satisfies TransformResult);
      } catch (err) {
        throw new Error(`jwt.sign LANZÓ al describir el alg (viola I1/I9): ${String(err)}`);
      }
      expect(result.ok).toBe(false);
      const error = result.ok ? 'SIN ERROR' : result.error;
      expect(error).toContain('solo HS256');
      // El mensaje NUNCA puede decir «Recibido: undefined.»: `alg` ausente es un caso VÁLIDO
      // (significa HS256), así que confundir un error con un acierto es peor que no informar.
      expect(error).not.toContain('undefined');
    },
  );

  // Un payload VÁLIDO con contenido adversarial: aquí `jwt.sign` llega hasta el final y firma.
  it.each([
    ['claves y valores con emoji', '{"🙂":"año","sub":"🙂"}'],
    ['surrogate suelto en un valor', `{"sub":"a${LONE_SURROGATE}b"}`],
    ['bytes de control en un valor', '{"sub":"\\u0000\\u001f"}'],
    ['objeto vacío', '{}'],
    ['anidamiento profundo', `{"a":${'['.repeat(50)}1${']'.repeat(50)}}`],
    ['valor muy largo', `{"sub":"${'ñ'.repeat(5000)}"}`],
  ])('jwt.sign firma un payload válido con contenido adversarial: %s', (_name, input) => {
    const res = signWith(NOW_MOCKUP, input, { secret: TEST_SECRET });
    // Si falla, el assert enseña el error en vez de un `false` mudo (ternario, no `if`: el
    // lint prohíbe los expect condicionales).
    expect(res.ok ? 'OK' : `FALLÓ: ${res.error}`).toBe('OK');
    expect(res.ok ? res.output.split('.') : []).toHaveLength(3);
  });

  // Las que NO pueden fallar: no se les inventa un error imposible, se demuestra que son
  // totales de verdad sobre todo el corpus adversarial.
  it.each(['json.stringify', 'base64.encode', 'base64url.encode', 'hash.sha256', 'hash.md5'])(
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

// ════════════════════════════════════════════════════════════════════════════════════
// T6.5 — hash.sha256, hash.md5 y jwt.sign (§6.6)
// ════════════════════════════════════════════════════════════════════════════════════
//
// Las primitivas puras (SHA-256/MD5/HMAC) se verifican contra los vectores publicados en
// `hash.test.ts`. Aquí se verifica LA TRANSFORMACIÓN: que el catálogo las expone bien, que la
// salida es el hex de §6.6 y que `jwt.sign` construye el token exacto.

describe('hash.sha256 / hash.md5 — el hex de §6.6 a través del catálogo', () => {
  // Los MISMOS vectores publicados de `hash.test.ts` (FIPS 180-4 / RFC 1321), pero ejercidos
  // por el camino de PRODUCCIÓN: `apply` del catálogo, con su paso a UTF-8 incluido. Que las
  // primitivas sean correctas no prueba que la transformación las llame bien.
  const sha256Vectors: [name: string, input: string, expected: string][] = [
    ['cadena vacía', '', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    [
      '"abc" (FIPS 180-4 B.1)',
      'abc',
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    ],
    [
      'el de 448 bits (FIPS 180-4 B.2)',
      'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    ],
  ];
  it.each(sha256Vectors)('hash.sha256 %s', (_name, input, expected) => {
    expect(output('hash.sha256', input)).toBe(expected);
  });

  const md5Vectors: [name: string, input: string, expected: string][] = [
    ['cadena vacía', '', 'd41d8cd98f00b204e9800998ecf8427e'],
    ['"abc" (RFC 1321 §A.5)', 'abc', '900150983cd24fb0d6963f7d28e17f72'],
    ['"message digest" (RFC 1321 §A.5)', 'message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
  ];
  it.each(md5Vectors)('hash.md5 %s', (_name, input, expected) => {
    expect(output('hash.md5', input)).toBe(expected);
  });

  // La entrada se hashea como TEXTO UTF-8 opaco: ni `trim` ni normalización. El vector es de
  // la RFC 1321 (`"a"`), y el assert de al lado prueba que el espacio SÍ cambia el digest —
  // que es lo que un `trim()` silencioso rompería.
  it('no recorta ni normaliza la entrada: " a " y "a" dan digests distintos', () => {
    expect(output('hash.md5', 'a')).toBe('0cc175b9c0f1b6a831c399e269772661');
    expect(output('hash.md5', ' a ')).not.toBe(output('hash.md5', 'a'));
    expect(output('hash.sha256', ' a ')).not.toBe(output('hash.sha256', 'a'));
  });

  it('la entrada se toma como UTF-8 (no Latin-1): el emoji hashea sus 4 bytes', () => {
    // 🙂 = F0 9F 99 82. El digest se compara contra el de la secuencia de bytes equivalente.
    expect(output('hash.sha256', '🙂')).toBe(output('hash.sha256', '\u{1F642}'));
    expect(output('hash.sha256', '🙂')).toHaveLength(64);
  });

  it('las salidas son hex en minúsculas de la longitud del algoritmo', () => {
    expect(output('hash.sha256', 'devtools')).toMatch(/^[0-9a-f]{64}$/);
    expect(output('hash.md5', 'devtools')).toMatch(/^[0-9a-f]{32}$/);
  });
});

// ── jwt.sign ────────────────────────────────────────────────────────────────────────

// El secreto de test que nombra la Verificación de T6.5. Literal de test evidente: no es una
// credencial de nada.
const TEST_SECRET = 'test-signing-secret-not-a-secret';

// El instante del ejemplo trabajado del §6.6. `iat` = 1752537600 (transcrito del PRD, NO
// recalculado en el test: si el motor y el test derivaran el epoch de la misma forma, un error
// compartido pasaría desapercibido).
const NOW_MOCKUP = new Date('2025-07-15T00:00:00Z');
const IAT_MOCKUP = 1752537600;
const PAYLOAD_MOCKUP = '{"sub":"1","name":"carlos","role":"admin"}';

const signWith = (now: Date, input: string, options?: Record<string, unknown>): TransformResult => {
  const t = buildEncodeIndex({ now }).get('jwt.sign');
  if (!t) throw new Error('jwt.sign no está en el catálogo');
  return t.apply(input, options);
};

const signOk = (now: Date, input: string, options?: Record<string, unknown>): string => {
  const res = signWith(now, input, options);
  if (!res.ok) throw new Error(`esperaba ok pero falló: ${res.error}`);
  return res.output;
};

// Las dos piezas de un JWT que los cross-checks contra `node:crypto` necesitan una y otra vez:
// la firma (tercer segmento) y el «signing input» (los dos primeros unidos por un punto, que
// es literalmente lo que se pasa al HMAC según el RFC 7515).
const sigOf = (token: string): string => token.split('.')[2] ?? '';
const signingInputOf = (token: string): string => token.split('.').slice(0, 2).join('.');

describe('jwt.sign — el token exacto del ejemplo trabajado (§6.6)', () => {
  // ANCLA EXTERNA nº1: los dos primeros segmentos son LITERALES del PRD §6.6, escritos allí a
  // mano. Fijan de una vez la serialización del header, el orden de las claves del payload, la
  // posición de `iat` (al final) y su valor. Un test que recalculara estos segmentos con el
  // mismo código del motor no probaría ninguna de las cuatro cosas.
  const HEADER_SEG = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
  const PAYLOAD_SEG =
    'eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MjUzNzYwMH0';

  it('header y payload son los literales del PRD §6.6', () => {
    const [header, payload, signature] = signOk(NOW_MOCKUP, PAYLOAD_MOCKUP, {
      secret: TEST_SECRET,
      alg: 'HS256',
    }).split('.');
    expect(header).toBe(HEADER_SEG);
    expect(payload).toBe(PAYLOAD_SEG);
    expect(signature).toMatch(/^[A-Za-z0-9_-]+$/); // base64url sin padding
  });

  it('el header decodifica a {"alg":"HS256","typ":"JWT"} exacto', () => {
    expect(Buffer.from(HEADER_SEG, 'base64url').toString('utf8')).toBe(
      '{"alg":"HS256","typ":"JWT"}',
    );
  });

  // ANCLA EXTERNA nº2: el `iat` que el PRD escribe para ese `now`.
  it('el iat del ejemplo trabajado es 1752537600 y va el ÚLTIMO', () => {
    const payload: unknown = JSON.parse(Buffer.from(PAYLOAD_SEG, 'base64url').toString('utf8'));
    expect(payload).toEqual({ sub: '1', name: 'carlos', role: 'admin', iat: IAT_MOCKUP });
    expect(Object.keys(payload as object)).toEqual(['sub', 'name', 'role', 'iat']);
  });

  // ANCLA EXTERNA nº3 (control cruzado de la Verificación): el token entero, byte a byte,
  // contra una implementación INDEPENDIENTE. El test puede usar `node:crypto`; el motor no
  // (§5.3, vigilado por client-only.test.ts).
  it('el token es byte-idéntico al que produce node:crypto para la misma entrada', () => {
    const token = signOk(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret: TEST_SECRET, alg: 'HS256' });
    const b64url = (s: string): string => Buffer.from(s, 'utf8').toString('base64url');
    const signingInput = `${b64url('{"alg":"HS256","typ":"JWT"}')}.${b64url(
      `{"sub":"1","name":"carlos","role":"admin","iat":${String(IAT_MOCKUP)}}`,
    )}`;
    const expected = `${signingInput}.${createHmac('sha256', TEST_SECRET)
      .update(signingInput)
      .digest('base64url')}`;
    expect(token).toBe(expected);
  });

  // Control de que el oráculo MUERDE: con otro secreto, `node:crypto` produce otra firma. Sin
  // esto, un cross-check que comparase dos constantes iguales pasaría en vacío.
  it('el control cruzado distingue: otro secreto ⇒ otra firma en ambas implementaciones', () => {
    const a = signOk(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret: TEST_SECRET });
    const b = signOk(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret: `${TEST_SECRET}-otro` });
    expect(sigOf(a)).not.toBe(sigOf(b));
    expect(a.split('.').slice(0, 2)).toEqual(b.split('.').slice(0, 2)); // solo cambia la firma
  });

  // El secreto se pasa a bytes con `TextEncoder` (UTF-8). Un secreto con acentos, emoji o
  // griego es EXACTAMENTE lo que una "simplificación" futura a `charCodeAt` rompería en
  // silencio: los tokens ASCII seguirían coincidiendo y solo fallarían los usuarios con
  // secretos no-ASCII. `node:crypto` (que codifica UTF-8 igual) lo deja bloqueado.
  it.each([
    ['acentos y emoji', 'clave-ñ-🙂-Ω'],
    ['CJK', '秘密のかぎ'],
    ['Latin-1 alto', 'ÿþý-clave'],
  ])('un secreto no-ASCII (%s) coincide con node:crypto (UTF-8, no charCodeAt)', (_n, secret) => {
    const token = signOk(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret });
    const signingInput = signingInputOf(token);
    expect(sigOf(token)).toBe(
      createHmac('sha256', secret).update(signingInput).digest('base64url'),
    );
    // Control de que el caso MUERDE: se calcula la firma que daría la implementación ROTA
    // (un bucle de `charCodeAt` truncando cada code unit a un byte = Latin-1) y se comprueba
    // que NO coincide. Sin este assert, el caso pasaría igual con la implementación rota
    // siempre que `node:crypto` hiciera lo mismo — y aquí no lo hace, que es el punto.
    const latin1Bytes = Buffer.from(secret, 'latin1'); // exactamente `charCodeAt(i) & 0xff`
    expect(latin1Bytes.toString('hex')).not.toBe(Buffer.from(secret, 'utf8').toString('hex'));
    expect(createHmac('sha256', latin1Bytes).update(signingInput).digest('base64url')).not.toBe(
      sigOf(token),
    );
  });

  // Clave más larga que el bloque HMAC (64 bytes): el caso que revienta a las implementaciones
  // que no hashean la clave larga (RFC 2104), ejercido por el camino de producción.
  it('un secreto de 131 bytes también coincide con node:crypto (clave > bloque)', () => {
    const longSecret = 'x'.repeat(131);
    const token = signOk(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret: longSecret });
    expect(sigOf(token)).toBe(
      createHmac('sha256', longSecret).update(signingInputOf(token)).digest('base64url'),
    );
  });
});

describe('jwt.sign — ida y vuelta contra jwt.decode (§6.3) y determinismo (I5/I11)', () => {
  it('jwt.decode reabre el token y devuelve el payload firmado', () => {
    const token = signOk(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret: TEST_SECRET });
    const back = decode('jwt.decode', token);
    // Se asserta sobre la SALIDA del motor real de §6.3, sin reimplementar el decode aquí.
    const decoded: unknown = JSON.parse(
      back.ok ? back.output : `{"error":${JSON.stringify(back)}}`,
    );
    expect(decoded).toEqual({
      header: { alg: 'HS256', typ: 'JWT' },
      payload: { sub: '1', name: 'carlos', role: 'admin', iat: IAT_MOCKUP },
      signature: sigOf(token),
    });
  });

  it('el detector de §6.2 reconoce la salida como un JWT (I10)', () => {
    const token = signOk(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret: TEST_SECRET });
    // `detect` devuelve las detecciones ordenadas por confianza; I10 toma la primera.
    expect(detect(token)[0]?.kind).toBe('jwt');
  });

  it('mismo now + mismo payload + mismo secreto ⇒ el mismo token dos veces (I5)', () => {
    expect(signOk(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret: TEST_SECRET })).toBe(
      signOk(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret: TEST_SECRET }),
    );
  });

  // La otra mitad del determinismo, y la que prueba que el `now` inyectado SE USA de verdad:
  // medido LEJOS del punto fijo (un año de diferencia), no en un instante donde ambas
  // implementaciones darían lo mismo.
  it('otro now ⇒ otro iat y otro token (el reloj se inyecta, no se lee)', () => {
    const otro = new Date('2026-07-15T00:00:00Z');
    const a = signOk(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret: TEST_SECRET });
    const b = signOk(otro, PAYLOAD_MOCKUP, { secret: TEST_SECRET });
    expect(b).not.toBe(a);
    const claims: unknown = JSON.parse(
      Buffer.from(b.split('.')[1] ?? '', 'base64url').toString('utf8'),
    );
    expect(claims).toMatchObject({ iat: Math.floor(otro.getTime() / 1000) });
  });

  // La indentación de la entrada NO cambia el token: el payload se re-serializa compacto.
  // Es lo que hace que `json.minify → jwt.sign` y `jwt.sign` a secas den lo mismo (§6.6).
  it('el payload se re-serializa compacto: la indentación de la entrada da igual', () => {
    const indentado = '{\n  "sub": "1",\n  "name": "carlos",\n  "role": "admin"\n}';
    expect(signOk(NOW_MOCKUP, indentado, { secret: TEST_SECRET })).toBe(
      signOk(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret: TEST_SECRET }),
    );
    // Y la cadena del ejemplo trabajado del §6.6, paso 1 → paso 2, cierra igual.
    expect(signOk(NOW_MOCKUP, output('json.minify', indentado), { secret: TEST_SECRET })).toBe(
      signOk(NOW_MOCKUP, indentado, { secret: TEST_SECRET }),
    );
  });

  it('nota del iat añadido, en el TransformResult', () => {
    const res = signWith(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret: TEST_SECRET });
    expect(res.ok ? res.notes : ['NO OK']).toEqual([
      'iat: 1752537600 (añadido a partir del instante inyectado)',
    ]);
  });

  // DECISIÓN documentada junto al código: un `iat` que ya venga en el payload se RESPETA.
  it('si el payload ya trae iat, se respeta el suyo y se avisa con una nota', () => {
    const res = signWith(NOW_MOCKUP, '{"sub":"1","iat":111}', { secret: TEST_SECRET });
    expect(res.ok ? res.notes : ['NO OK']).toEqual([
      'El payload ya traía `iat`: se respeta el suyo y no se sobrescribe.',
    ]);
    const claims: unknown = JSON.parse(
      Buffer.from((res.ok ? res.output : '').split('.')[1] ?? '', 'base64url').toString('utf8'),
    );
    expect(claims).toEqual({ sub: '1', iat: 111 });
  });
});

describe('jwt.sign — fallos como dato, nunca excepción ni fallback silencioso (I1/I9)', () => {
  const failures: [
    name: string,
    input: string,
    options: Record<string, unknown> | undefined,
    error: string,
  ][] = [
    [
      'sin opciones',
      PAYLOAD_MOCKUP,
      undefined,
      'jwt.sign necesita un secreto: escríbelo en las opciones del paso.',
    ],
    [
      'secreto ausente',
      PAYLOAD_MOCKUP,
      { alg: 'HS256' },
      'jwt.sign necesita un secreto: escríbelo en las opciones del paso.',
    ],
    [
      'secreto vacío: NO se firma con cadena vacía en silencio',
      PAYLOAD_MOCKUP,
      { secret: '' },
      'jwt.sign necesita un secreto: escríbelo en las opciones del paso.',
    ],
    [
      'secreto que no es string',
      PAYLOAD_MOCKUP,
      { secret: 12345 },
      'jwt.sign necesita un secreto: escríbelo en las opciones del paso.',
    ],
    [
      'alg RS256: no cae de vuelta a HS256',
      PAYLOAD_MOCKUP,
      { secret: TEST_SECRET, alg: 'RS256' },
      'Algoritmo no soportado: solo HS256. Recibido: "RS256".',
    ],
    [
      'alg none: el ataque clásico, rechazado',
      PAYLOAD_MOCKUP,
      { secret: TEST_SECRET, alg: 'none' },
      'Algoritmo no soportado: solo HS256. Recibido: "none".',
    ],
    [
      'payload que no es JSON',
      'no soy json',
      { secret: TEST_SECRET },
      'El payload de un JWT debe ser JSON válido.',
    ],
    [
      'payload array',
      '[1,2,3]',
      { secret: TEST_SECRET },
      'El payload de un JWT debe ser un objeto JSON de claims, no un valor suelto.',
    ],
    [
      'payload escalar',
      '42',
      { secret: TEST_SECRET },
      'El payload de un JWT debe ser un objeto JSON de claims, no un valor suelto.',
    ],
    [
      'payload null',
      'null',
      { secret: TEST_SECRET },
      'El payload de un JWT debe ser un objeto JSON de claims, no un valor suelto.',
    ],
  ];

  it.each(failures)('%s', (_name, input, options, error) => {
    expect(signWith(NOW_MOCKUP, input, options)).toEqual({ ok: false, error });
  });

  // El `now` inválido va en su propio `it` y NO en la tabla de arriba: cuando lo estaba, el
  // fixture se elegía con `name === 'now inválido'`, es decir, la tabla tenía una COLUMNA
  // IMPLÍCITA escondida en el título. Renombrar el caso —algo que nadie considera un cambio de
  // comportamiento— habría desactivado el fixture en silencio: el test habría pasado a firmar
  // con `NOW_MOCKUP` y a fallar por un motivo que el título ya no nombra.
  it('now inválido: {ok:false}, no un iat NaN', () => {
    expect(signWith(new Date('no es una fecha'), PAYLOAD_MOCKUP, { secret: TEST_SECRET })).toEqual({
      ok: false,
      error: 'El instante inyectado no es una fecha válida y no se puede calcular el iat.',
    });
  });

  // `alg` ausente SÍ significa HS256 (es el único valor del catálogo): documentado junto al
  // código, y fijado aquí para que no se confunda con un fallback silencioso desde otro alg.
  it('alg ausente = HS256 (mismo token que declarándolo)', () => {
    expect(signOk(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret: TEST_SECRET })).toBe(
      signOk(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret: TEST_SECRET, alg: 'HS256' }),
    );
  });

  it('opciones desconocidas se ignoran sin romper', () => {
    expect(signOk(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret: TEST_SECRET, kid: 'x', exp: 999 })).toBe(
      signOk(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret: TEST_SECRET }),
    );
  });
});

// ── EL SECRETO NO SALE (§11): centinela con sus dos patas ───────────────────────────

describe('jwt.sign no filtra el secreto en el resultado (§11)', () => {
  // Un canario que NO puede aparecer por accidente ni sobrevivir a una codificación: es ASCII
  // literal, así que si se serializara en cualquier campo del resultado, el grep lo vería.
  const CANARY = 'CANARIO-QUE-NO-DEBE-SALIR-8f3a';

  it('el canario no aparece en NINGÚN campo del TransformResult serializado', () => {
    const res = signWith(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret: CANARY, alg: 'HS256' });
    const serialized = JSON.stringify(res);
    // (a) CONTROL POSITIVO: el canal observado lleva datos y el patrón apunta bien. Sin esto,
    // un resultado vacío o un `undefined` harían pasar el assert de ausencia en vacío.
    expect(serialized.length).toBeGreaterThan(100);
    expect(serialized).toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'); // el header del token
    expect(serialized).toContain('iat'); // las notas también viajan por este canal
    expect(serialized.includes(CANARY.slice(0, 8))).toBe(false); // ni siquiera un prefijo
    // (b) el assert de ausencia propiamente dicho.
    expect(serialized).not.toContain(CANARY);
  });

  it('tampoco aparece en el mensaje de error de un fallo posterior al secreto', () => {
    // El payload roto se detecta DESPUÉS de leer el secreto: es el punto donde un mensaje
    // "útil" tentaría a incluir el contexto entero.
    const res = signWith(NOW_MOCKUP, 'no soy json', { secret: CANARY });
    expect(JSON.stringify(res)).not.toContain(CANARY);
    expect(res).toEqual({ ok: false, error: 'El payload de un JWT debe ser JSON válido.' });
  });

  it('el canario tampoco aparece codificado en base64url dentro del token', () => {
    const token = signOk(NOW_MOCKUP, PAYLOAD_MOCKUP, { secret: CANARY });
    // La forma DERIVADA del canario por el canal real: un grep del literal no vería un
    // secreto que hubiera viajado codificado en un segmento.
    expect(token).not.toContain(Buffer.from(CANARY, 'utf8').toString('base64url'));
    expect(token).not.toContain(Buffer.from(CANARY, 'utf8').toString('base64'));
    // Control positivo del mismo canal: lo que SÍ debe aparecer, aparece.
    expect(token).toContain(Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'));
  });
});
