// Tests del motor de COMPOSICIÓN (PRD §6.6, T6.6): el ejemplo trabajado del mockup, los
// invariantes I9–I12 y la IDA Y VUELTA contra el otro motor — el test que solo puede existir
// ahora que hay dos direcciones.
//
// `node:crypto` se usa AQUÍ como oráculo independiente de la firma (control cruzado de T6.5):
// un test puede usarlo aunque el motor no pueda (§5.3). La firma NUNCA se compara contra el
// literal `SIGNED` del artboard, que es DECORATIVO (es el HMAC canónico de jwt.io sobre otro
// payload, ver §6.6 y las desviaciones de F6 en planning.md).
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { analyze } from './analyze';
import { compose, runCompose, safeCompose } from './compose';
import { ComposeRecipeSchema, ComposeResultSchema } from './contracts';
import { buildEncodeIndex } from './encode-transforms';
import type { Chain, ComposeResult, ComposeStepSpec } from './contracts';

// El `now` del ejemplo trabajado del §6.6: de aquí sale el `iat` del token.
const NOW = new Date('2025-07-15T00:00:00Z');
const IAT = 1752537600;
const CTX = { now: NOW };

// Secreto de TEST, evidentemente falso (nunca un secreto real en el árbol).
const SECRET = 'test-hs256-secret-not-a-secret';
// Canario para los asserts de no-filtración (§11): una cadena que no puede aparecer por azar.
const CANARY = 'test-canary-zzqq-not-a-secret';

const run = (source: string, steps: ComposeStepSpec[]): ComposeResult =>
  compose(source, steps, CTX);

// ── el ejemplo del mockup, reproducido literalmente (§6.6) ──────────────────────────

// La fuente del artboard `ComposeClaro`, con la indentación del mockup.
const SOURCE = '{\n  "sub": "1",\n  "name": "carlos",\n  "role": "admin"\n}';
// El `MINIFIED` del artboard, literal.
const MINIFIED = '{"sub":"1","name":"carlos","role":"admin"}';
// Los dos primeros segmentos SÍ son literales exactos y reproducibles (§6.6).
const JWT_HEADER_SEGMENT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
const JWT_PAYLOAD_SEGMENT =
  'eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MjUzNzYwMH0';

const MOCKUP_RECIPE: ComposeStepSpec[] = [
  { transform: 'json.minify' },
  { transform: 'jwt.sign', options: { alg: 'HS256', secret: SECRET } },
];

describe('el ejemplo trabajado del §6.6 (artboard ComposeClaro)', () => {
  const result = run(SOURCE, MOCKUP_RECIPE);

  it('el `now` inyectado es el iat del ejemplo (I4: el motor no lee el reloj)', () => {
    expect(Math.floor(NOW.getTime() / 1000)).toBe(IAT);
  });

  it('el resultado cumple el contrato Zod del §6.6', () => {
    expect(() => ComposeResultSchema.parse(result)).not.toThrow();
  });

  it('la fuente se detecta como json y el resultado tiene exactamente 2 pasos', () => {
    expect(result.source).toBe(SOURCE);
    expect(result.sourceKind).toBe('json');
    expect(result.steps).toHaveLength(2);
    expect(result.terminal).toBe('ok');
  });

  it('paso 1 (json.minify) produce EXACTAMENTE el MINIFIED del artboard, kind json (I10)', () => {
    const [step] = result.steps;
    expect(step?.index).toBe(1);
    expect(step?.transform).toBe('json.minify');
    expect(step?.input).toBe(SOURCE);
    expect(step?.ok).toBe(true);
    expect(step?.output).toBe(MINIFIED);
    expect(step?.kind).toBe('json');
  });

  it('paso 2 (jwt.sign) encadena la salida del paso 1 como entrada', () => {
    expect(result.steps[1]?.input).toBe(MINIFIED);
  });

  it('el header y el payload del token son los literales del mockup', () => {
    const segments = (result.steps[1]?.output ?? '').split('.');
    expect(segments).toHaveLength(3);
    expect(segments[0]).toBe(JWT_HEADER_SEGMENT);
    expect(segments[1]).toBe(JWT_PAYLOAD_SEGMENT);
  });

  it('el header y el payload decodifican a lo que dice el §6.6 (con el iat del `now`)', () => {
    const segments = (result.steps[1]?.output ?? '').split('.');
    const decode = (seg: string): unknown =>
      JSON.parse(Buffer.from(seg, 'base64url').toString('utf8'));
    expect(decode(segments[0] ?? '')).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(decode(segments[1] ?? '')).toEqual({
      sub: '1',
      name: 'carlos',
      role: 'admin',
      iat: IAT,
    });
  });

  // CONTROL CRUZADO con `node:crypto`, NO con el literal decorativo del artboard.
  it('la firma coincide con el HMAC-SHA256 de node:crypto sobre header.payload', () => {
    const token = result.steps[1]?.output ?? '';
    const signingInput = token.slice(0, token.lastIndexOf('.'));
    const expected = createHmac('sha256', SECRET).update(signingInput).digest('base64url');
    expect(token.slice(token.lastIndexOf('.') + 1)).toBe(expected);
  });

  it('el kind del token se DETECTA como jwt (I10) y es el outputKind del resultado', () => {
    expect(result.steps[1]?.kind).toBe('jwt');
    expect(result.outputKind).toBe('jwt');
    expect(result.output).toBe(result.steps[1]?.output);
  });

  it('la nota del iat viaja al paso, y el SECRETO no aparece en NINGUNA parte del resultado', () => {
    expect(result.steps[1]?.notes?.[0]).toContain(String(IAT));
    // Canario: ni output, ni notas, ni errores, ni un prefijo o una longitud (§11).
    expect(JSON.stringify(result)).not.toContain(SECRET);
    expect(JSON.stringify(result)).not.toContain('secret');
  });
});

// ── I12: sin auto-conducción ────────────────────────────────────────────────────────

describe('I12 — compose() no añade, quita ni reordena nada', () => {
  it('con la lista de pasos VACÍA el resultado es la fuente tal cual', () => {
    const result = run(SOURCE, []);
    expect(result.steps).toEqual([]);
    expect(result.output).toBe(SOURCE); // idéntica, sin formatear ni minificar
    expect(result.outputKind).toBe(result.sourceKind);
    expect(result.terminal).toBe('ok');
  });

  it('con la lista vacía NO se aplica la transformación «por defecto» del kind detectado', () => {
    // El contraste con el OTRO motor es lo que hace este test. Se usa el JSON COMPACTO como
    // fuente porque sobre el indentado `json.format` es la identidad (§6.5: `no_transform`) y
    // el contraste no se vería: sobre el compacto, `analyze()` se auto-conduce y lo INDENTA.
    const analizado = chainOutput(analyze(MINIFIED, { now: NOW }));
    expect(analizado).not.toBe(MINIFIED); // analyze() sí lo toca…
    expect(analizado).toContain('\n'); // …indentándolo…
    expect(run(MINIFIED, []).sourceKind).toBe('json'); // …compose() detecta el mismo kind…
    expect(run(MINIFIED, []).output).toBe(MINIFIED); // …y no lo toca (I12).
  });

  it('el orden es el del usuario: invertir la receta da otro resultado', () => {
    const directo = run(MINIFIED, [{ transform: 'base64.encode' }, { transform: 'hash.sha256' }]);
    const inverso = run(MINIFIED, [{ transform: 'hash.sha256' }, { transform: 'base64.encode' }]);
    expect(directo.output).not.toBe(inverso.output);
    expect(directo.steps.map((s) => s.transform)).toEqual(['base64.encode', 'hash.sha256']);
    expect(inverso.steps.map((s) => s.transform)).toEqual(['hash.sha256', 'base64.encode']);
  });

  it('un paso que no cambia nada SE EJECUTA igual (no hay «no aporta» como en §6.5)', () => {
    // `json.minify` sobre JSON ya compacto es la identidad; `analyze()` lo llamaría terminal
    // (`no_transform`), `compose()` lo registra como un paso ok más. El usuario mandó.
    const result = run(MINIFIED, [{ transform: 'json.minify' }, { transform: 'json.minify' }]);
    expect(result.steps).toHaveLength(2);
    expect(result.output).toBe(MINIFIED);
    expect(result.terminal).toBe('ok');
  });
});

// ── I9: un paso roto no borra el trabajo del usuario ───────────────────────────────

describe('I9 — pureza y totalidad: el fallo es un dato, no una excepción', () => {
  const result = run(SOURCE, [
    { transform: 'json.minify' }, // ok
    { transform: 'base64.encode' }, // ok (la salida ya no es JSON)
    { transform: 'json.minify' }, // IMPOSIBLE: la entrada es base64, no JSON
    { transform: 'hash.sha256' }, // nunca se ejecuta
  ]);

  it('no lanza y devuelve terminal error', () => {
    expect(result.terminal).toBe('error');
  });

  it('conserva los pasos previos CON su salida y corta en el primero que falla', () => {
    expect(result.steps).toHaveLength(3); // los 2 ok + el que falló; el 4º no se ejecuta
    expect(result.steps[0]?.ok).toBe(true);
    expect(result.steps[0]?.output).toBe(MINIFIED);
    expect(result.steps[1]?.ok).toBe(true);
    expect(result.steps[1]?.output).not.toBeNull();
    expect(result.steps.map((s) => s.transform)).not.toContain('hash.sha256');
  });

  it('el paso fallido lleva ok:false, output null, kind null y un error legible', () => {
    const failed = result.steps[2];
    expect(failed?.ok).toBe(false);
    expect(failed?.output).toBeNull();
    expect(failed?.kind).toBeNull();
    expect(failed?.error).toBeTruthy();
    expect(failed?.input).toBe(result.steps[1]?.output); // se le pasó lo que produjo el anterior
  });

  it('`output` es la salida del ÚLTIMO PASO OK, no null: el trabajo previo no se pierde', () => {
    expect(result.output).toBe(result.steps[1]?.output);
    expect(result.outputKind).toBe(result.steps[1]?.kind);
  });

  // El caso literal de la Verificación de T6.6.
  it('`json.minify` sobre «no soy json» falla como dato en el primer paso', () => {
    const first = run('no soy json', [{ transform: 'json.minify' }]);
    expect(first.terminal).toBe('error');
    expect(first.steps).toHaveLength(1);
    expect(first.steps[0]?.ok).toBe(false);
    // Sin ningún paso ok no hay «último paso ok»: `output` es null (§6.6), pero la FUENTE sigue
    // en el resultado — nada del usuario se pierde.
    expect(first.output).toBeNull();
    expect(first.outputKind).toBeNull();
    expect(first.source).toBe('no soy json');
    expect(first.sourceKind).toBe('text');
  });

  it('un id que no existe en el catálogo es un fallo del paso, no un salto (I12)', () => {
    const result = run(SOURCE, [{ transform: 'json.minify' }, { transform: 'no.existe' }]);
    expect(result.terminal).toBe('error');
    expect(result.steps).toHaveLength(2);
    expect(result.steps[1]?.ok).toBe(false);
    expect(result.steps[1]?.error).toContain('no.existe');
    expect(result.output).toBe(MINIFIED);
  });

  it('`jwt.sign` sin secreto falla como dato y conserva el paso anterior', () => {
    const result = run(SOURCE, [{ transform: 'json.minify' }, { transform: 'jwt.sign' }]);
    expect(result.terminal).toBe('error');
    expect(result.steps[0]?.output).toBe(MINIFIED);
    expect(result.steps[1]?.error).toContain('secreto');
  });

  // §11 EN EL CAMINO DE ERROR. El canario del bloque del mockup solo vigila la ejecución OK;
  // un mensaje de error es justo donde es fácil filtrar material sensible sin darse cuenta
  // («no pude firmar con "<secreto>"»). Se barren los caminos de fallo de `jwt.sign` con el
  // canario metido en TODAS las opciones —incluida `alg`, que SÍ se cita en su error— y se
  // asserta sobre el `JSON.stringify` del resultado ENTERO: output, notas y errores.
  const LEAK_CASES: [name: string, payload: string, options: Record<string, unknown>, now: Date][] =
    [
      ['payload no-JSON', 'no soy json', { secret: CANARY }, NOW],
      ['payload escalar', '42', { secret: CANARY }, NOW],
      ['payload array', '[1,2]', { secret: CANARY }, NOW],
      ['alg no soportado', MINIFIED, { alg: 'RS256', secret: CANARY }, NOW],
      ['alg de tipo raro', MINIFIED, { alg: 42, secret: CANARY }, NOW],
      ['secreto vacío', MINIFIED, { secret: '', otro: CANARY }, NOW],
      ['sin secreto', MINIFIED, { nota: CANARY }, NOW],
      // `now` inválido: la 4.ª razón de fallo de `jwt.sign` (no se puede calcular el `iat`), y la
      // única que ocurre DESPUÉS de haber leído el secreto.
      ['now inválido', MINIFIED, { secret: CANARY }, new Date(Number.NaN)],
    ];

  it.each(LEAK_CASES)(
    'el secreto no se filtra cuando jwt.sign FALLA: %s',
    (_name, payload, options, now) => {
      const result = compose(payload, [{ transform: 'jwt.sign', options }], { now });
      expect(result.terminal).toBe('error');
      expect(result.steps[0]?.error).toBeTruthy();
      expect(JSON.stringify(result)).not.toContain(CANARY);
    },
  );

  // LA EXCEPCIÓN, explícita para que nadie la confunda con una fuga: `alg` SÍ se repite en el
  // mensaje de error, a propósito (T6.5) — es un valor de `kind: 'choice'` que el usuario
  // eligió de una lista, no material sensible, y el mensaje es inútil sin él («algoritmo no
  // soportado» sin decir cuál). El único campo `kind: 'secret'` del catálogo es `secret`, y ese
  // es el que los asserts de arriba vigilan. Distinguirlos es el punto: si algún día `alg`
  // dejara de citarse o `secret` empezara a citarse, uno de los dos tests se pondría rojo.
  it('`alg` sí se cita en el error (no es secreto); `secret` nunca (§11)', () => {
    const result = run(MINIFIED, [
      { transform: 'jwt.sign', options: { alg: 'RS256', secret: CANARY } },
    ]);
    expect(result.steps[0]?.error).toContain('RS256');
    expect(JSON.stringify(result)).not.toContain(CANARY);
  });

  it('el secreto tampoco viaja cuando falla un paso POSTERIOR a la firma', () => {
    const result = run(SOURCE, [
      { transform: 'json.minify' },
      { transform: 'jwt.sign', options: { secret: CANARY } },
      { transform: 'json.minify' }, // el token no es JSON: falla
    ]);
    expect(result.terminal).toBe('error');
    expect(result.steps).toHaveLength(3);
    expect(JSON.stringify(result)).not.toContain(CANARY);
  });

  // Defensa en profundidad: si una transformación LANZARA (no debería: son totales por
  // contrato), `runCompose` lo traduce a un paso fallido en vez de propagar la excepción al
  // navegador. Se inyecta un catálogo hostil, que es la única forma de llegar a esa rama.
  it('una transformación que lanza se traduce a un paso fallido (no propaga)', () => {
    const hostile = new Map(buildEncodeIndex(CTX));
    hostile.set('boom', {
      id: 'boom',
      label: 'boom',
      group: 'json',
      apply: () => {
        throw new Error('kaboom');
      },
    });
    const result = runCompose(
      MINIFIED,
      [{ transform: 'json.minify' }, { transform: 'boom' }],
      hostile,
    );
    expect(result.terminal).toBe('error');
    expect(result.steps).toHaveLength(2);
    expect(result.steps[1]?.ok).toBe(false);
    expect(result.steps[1]?.error).not.toContain('kaboom'); // ni stacks ni internals a la UI
  });
});

// ── el borde de los 8 pasos ────────────────────────────────────────────────────────

describe('límite de 8 pasos (§6.6, el mismo de I2): se rechaza en el BORDE', () => {
  const step: ComposeStepSpec = { transform: 'json.stringify' };

  it('8 pasos se ejecutan', () => {
    const result = run(
      MINIFIED,
      Array.from({ length: 8 }, () => step),
    );
    expect(result.steps).toHaveLength(8);
    expect(result.terminal).toBe('ok');
  });

  // No se ejecuta a medias: se rechaza. Es una regla del ESQUEMA, previa a la ejecución, así
  // que lanzar aquí no contradice I9 (que gobierna los pasos).
  //
  // Se asserta `ZodError` y NO un `.toThrow()` pelado: con el pelado, el día que esto reventara
  // por otro motivo —un `TypeError` porque `steps` dejó de ser un array, p. ej.— el test seguiría
  // verde diciendo «se rechaza correctamente» sobre un fallo que no es el que vigila.
  it('9 pasos se RECHAZAN con ZodError y no se ejecuta NINGUNO', () => {
    const nueve = Array.from({ length: 9 }, () => step);
    expect(() => run(MINIFIED, nueve)).toThrow(ZodError);
    // «No se ejecuta a medias» (§6.6): la segunda mitad del título, que el `.toThrow()` no
    // cubría. Un espía en el catálogo prueba que ninguna transformación llegó a correr.
    let llamadas = 0;
    const espiado = new Map(buildEncodeIndex(CTX));
    espiado.set('json.stringify', {
      id: 'json.stringify',
      label: 'json.stringify',
      group: 'json',
      apply: (input: string) => {
        llamadas += 1;
        return { ok: true, output: input };
      },
    });
    // `runCompose` no valida (es el bucle interno); la validación es de `compose()`, así que se
    // comprueba que el throw ocurre ANTES de tocar el catálogo: si `compose()` ejecutara y luego
    // rechazara, `llamadas` sería > 0.
    expect(() => compose(MINIFIED, nueve, CTX)).toThrow(ZodError);
    expect(llamadas).toBe(0);
    expect(runCompose(MINIFIED, nueve, espiado).steps).toHaveLength(9); // el bucle sí ejecutaría
    expect(llamadas).toBe(9); // …luego el 0 de arriba prueba que el rechazo fue previo
  });

  // El cap no es lo ÚNICO que rechaza el esquema, y el comentario de `compose.ts` lo dice para
  // que T6.10 no se lleve la sorpresa: una receta corrupta del historial (§9) también lanza, así
  // que la frontera de persistencia debe usar `safeParse`, no llamar a `compose()` a ciegas.
  it.each([
    ['transform vacío', [{ transform: '' }]],
    ['transform no-string', [{ transform: 42 }]],
    ['paso null', [null]],
    ['options no-objeto', [{ transform: 'json.minify', options: 'nope' }]],
  ])('el esquema también rechaza recetas corruptas: %s', (_name, receta) => {
    expect(() => run(MINIFIED, receta as unknown as ComposeStepSpec[])).toThrow(ZodError);
    // Y la vía que T6.10 DEBE usar: rechazo como dato, sin excepción.
    expect(ComposeRecipeSchema.safeParse(receta).success).toBe(false);
  });
});

// ── safeCompose: un solo canal de fallo para la UI ─────────────────────────────────

describe('safeCompose — la receta inválida es un DATO, no una excepción', () => {
  // El caso concreto que tumbaría la pantalla de §7, que recompone en cada pulsación: la
  // afordancia «añadir paso» deja un instante un paso con `transform: ''` antes de que el
  // usuario elija en el Select.
  it("el paso a medio añadir (`transform: ''`) NO lanza: devuelve ok:false", () => {
    const aMedias = [{ transform: 'json.minify' }, { transform: '' }];
    expect(() => compose(MINIFIED, aMedias, CTX)).toThrow(ZodError); // la entrada estricta sí
    const safe = safeCompose(MINIFIED, aMedias, CTX); // …esta no
    expect(safe.ok).toBe(false);
    expect(safe.ok ? null : safe.issue).toBeInstanceOf(ZodError);
  });

  it.each([
    ['9 pasos', Array.from({ length: 9 }, () => ({ transform: 'json.minify' }))],
    ['no es un array', 'nope'],
    ['paso null', [null]],
    ['transform no-string', [{ transform: 42 }]],
    ['options no-objeto', [{ transform: 'json.minify', options: 'nope' }]],
  ])('nunca lanza ante una receta inválida: %s', (_name, receta) => {
    expect(() => safeCompose(MINIFIED, receta, CTX)).not.toThrow();
    expect(safeCompose(MINIFIED, receta, CTX).ok).toBe(false);
  });

  it('con receta válida devuelve EXACTAMENTE lo mismo que compose()', () => {
    const safe = safeCompose(SOURCE, MOCKUP_RECIPE, CTX);
    expect(safe.ok).toBe(true);
    expect(JSON.stringify(safe.ok ? safe.result : null)).toBe(
      JSON.stringify(compose(SOURCE, MOCKUP_RECIPE, CTX)),
    );
  });

  it('un paso que FALLA sigue siendo ok:true con terminal error (son dos cosas distintas)', () => {
    // La validación de la receta y el fallo de un paso son canales separados: `safeCompose`
    // solo absorbe el primero. Confundirlos haría que la UI tratara «receta irreproducible»
    // igual que «este paso no se pudo aplicar», que son dos mensajes distintos para el usuario.
    const safe = safeCompose('no soy json', [{ transform: 'json.minify' }], CTX);
    expect(safe.ok).toBe(true);
    expect(safe.ok ? safe.result.terminal : null).toBe('error');
  });
});

// ── las dos trampas de cableado que el contrato documenta (para T6.7) ──────────────

describe('contrato de cara a la UI: `output != null` no significa éxito', () => {
  it('con terminal error, `output` trae el PARCIAL: el éxito es `terminal === "ok"`', () => {
    const result = run(SOURCE, [{ transform: 'json.minify' }, { transform: 'jwt.sign' }]);
    expect(result.output).not.toBeNull(); // hay parcial…
    expect(result.terminal).toBe('error'); // …pero NO es un éxito
  });

  it('`steps.length` cuenta el paso fallido; los pasos logrados son `steps.filter(ok)`', () => {
    const result = run(SOURCE, [{ transform: 'json.minify' }, { transform: 'jwt.sign' }]);
    expect(result.steps).toHaveLength(2);
    expect(result.steps.filter((s) => s.ok)).toHaveLength(1); // el «· N pasos ·» del artboard
  });

  it('con receta vacía `output === source`: la barra de resultado duplicaría la fuente', () => {
    const result = run(SOURCE, []);
    expect(result.output).toBe(result.source);
    expect(result.outputKind).toBe(result.sourceKind);
    expect(result.steps).toHaveLength(0); // el gate que la UI necesita además de `output`
  });
});

// ── I11: determinismo ──────────────────────────────────────────────────────────────

describe('I11 — determinismo: mismo source + mismos steps + mismo `now` ⇒ mismo resultado', () => {
  it('dos ejecuciones dan el mismo ComposeResult byte a byte', () => {
    const a = JSON.stringify(compose(SOURCE, MOCKUP_RECIPE, { now: new Date(NOW) }));
    const b = JSON.stringify(compose(SOURCE, MOCKUP_RECIPE, { now: new Date(NOW) }));
    expect(a).toBe(b);
  });

  it('el `now` es lo ÚNICO que mueve el resultado (no el reloj del sistema)', () => {
    const otro = compose(SOURCE, MOCKUP_RECIPE, { now: new Date('2026-01-01T00:00:00Z') });
    expect(otro.output).not.toBe(compose(SOURCE, MOCKUP_RECIPE, CTX).output);
    // …y solo por el iat: header idéntico, payload distinto solo en ese claim.
    expect((otro.output ?? '').split('.')[0]).toBe(JWT_HEADER_SEGMENT);
  });

  it('el catálogo completo sobre el mismo input es determinista', () => {
    const ids = [
      'json.minify',
      'json.stringify',
      'base64.encode',
      'base64url.encode',
      'url.encode',
      'hash.sha256',
      'hash.md5',
    ];
    const once = (): string => JSON.stringify(ids.map((id) => run(MINIFIED, [{ transform: id }])));
    expect(once()).toBe(once());
  });
});

// ── IDA Y VUELTA contra el otro motor (analyze) ────────────────────────────────────
//
// La joya de la corona: `analyze(compose(x).output)` vuelve a `x`. Solo es posible ahora que
// existen las dos direcciones, y caza desalineaciones entre codificar y decodificar que ningún
// test unitario ve.
//
// ── QUÉ SIGNIFICA EXACTAMENTE «vuelve a x» (léelo antes de ampliar el corpus) ───────
// `analyze()` NO para cuando llega a `x`: se auto-conduce hasta un final legítimo. Así que la
// igualdad solo puede pedirse donde `x` es el SUELO de la cadena (kind `text`, I6). De ahí las
// exclusiones, todas documentadas y ninguna por descuido:
//
//   (a) **Solo `base64.encode` y `base64url.encode`** dirigen la vuelta entera. `url.encode`
//       NO: su salida (`Hola%2C%20mundo`) no tiene esquema http/https, así que `detectUrl`
//       —correctamente— la llama `text` y `analyze()` no aplica `url.decode`. La ida y vuelta
//       de `url.encode` está cubierta A NIVEL DE TRANSFORMACIÓN en `encode-transforms.test.ts`;
//       lo que aquí no cierra es la DETECCIÓN, y arreglarlo exigiría que `detectUrl` aceptara
//       cualquier texto percent-encoded, que es justo lo que §6.2 evita.
//   (b) **`x` debe ser `text`**: un `x` que sea JSON vuelve como JSON *formateado* (analyze
//       encadena `json.format`), y uno que sea a su vez base64 sigue decodificando. Se excluyen
//       por escrito, no se disimulan.
//   (c) **1–2 bytes con `base64url.encode`**: sin padding producen 2–3 caracteres y
//       `base64.decode`/`detectBase64` rechazan por debajo de 4 (`length < 4`). T6.4 dejó el
//       hueco anotado para esta tarea; **T6.6 decide NO tocar ese guard**: relajarlo haría que
//       cadenas cortísimas como `QQ` se detectaran como base64 (decodifica a la `A` imprimible)
//       en vez de como texto, degradando la detección de §6.2 —código de F1 verificado— para
//       ganar un caso de borde que la UI no produce. La exclusión queda AQUÍ por escrito y los
//       dos tests de `encode-transforms.test.ts` que la fijan siguen verdes, intactos.
//   (d) La **cadena vacía**: `base64.encode('')` es `''` y no hay nada que reabrir.

// La salida FINAL de una `Chain`: el output del último paso productivo, o el input del paso
// terminal (que es el mismo valor). Es lo que la UI enseña como resultado de `analyze()`.
function chainOutput(chain: Chain): string {
  const last = chain.steps[chain.steps.length - 1];
  return last?.output ?? last?.input ?? '';
}

// Corpus de textos que son SUELO de la cadena (kind `text`): ver exclusiones (b).
const ROUND_TRIP: [name: string, value: string][] = [
  ['ascii', 'hola'],
  ['una letra', 'a'],
  ['dos letras', 'ab'],
  ['frase con espacios y coma', 'Hola, mundo'],
  ['acentos', 'añoñóáéíóú'],
  ['emoji', '🙂'],
  ['emoji entre texto', 'carlos 🙂 dice año'],
  ['CJK', '日本語のテキスト'],
  ['saltos de línea', 'línea1\nlínea2\r\nlínea3'],
  ['reservados de URL', 'a=1&b=2?c#d/e+f'],
  ['ya percent-encoded', '%20%C3%B1'],
  ['bytes altos Latin-1', 'ÿþý'],
];

// Exclusión (c): base64url sin padding necesita ≥ 3 bytes para producir ≥ 4 caracteres.
const ROUND_TRIP_B64URL = ROUND_TRIP.filter(
  ([, value]) => new TextEncoder().encode(value).length >= 3,
);

describe('ida y vuelta: analyze(compose(x).output) vuelve a x', () => {
  // Premisa del corpus, comprobada en vez de asumida: si algún valor dejara de ser suelo de la
  // cadena, los asserts de abajo fallarían por una razón que no es la que este bloque prueba.
  it.each(ROUND_TRIP)('el corpus es de textos SUELO: analyze() deja %s intacto (I6)', (_n, v) => {
    expect(chainOutput(analyze(v, { now: NOW }))).toBe(v);
  });

  it.each(ROUND_TRIP)('base64.encode → analyze: %s', (_name, value) => {
    const composed = run(value, [{ transform: 'base64.encode' }]);
    expect(composed.terminal).toBe('ok');
    expect(chainOutput(analyze(composed.output ?? '', { now: NOW }))).toBe(value);
  });

  it.each(ROUND_TRIP_B64URL)('base64url.encode → analyze: %s', (_name, value) => {
    const composed = run(value, [{ transform: 'base64url.encode' }]);
    expect(chainOutput(analyze(composed.output ?? '', { now: NOW }))).toBe(value);
  });

  it('la exclusión de 1–2 bytes de base64url es EXACTAMENTE esa y sigue siendo real', () => {
    const excluidas = ROUND_TRIP.filter((c) => !ROUND_TRIP_B64URL.includes(c)).map(([n]) => n);
    expect(excluidas).toEqual(['una letra', 'dos letras']);
    // Y el motivo, fijado: el guard `length < 4` de §6.2/§6.3 NO se tocó en T6.6.
    const corto = run('a', [{ transform: 'base64url.encode' }]);
    expect(corto.output).toBe('YQ');
    expect(chainOutput(analyze('YQ', { now: NOW }))).toBe('YQ'); // se queda en `text`, no decodifica
  });

  // Encadenado de dos codificaciones: la vuelta también es de dos pasos, dirigida sola.
  it('base64.encode → base64.encode → analyze deshace las dos capas', () => {
    const composed = run('hola', [{ transform: 'base64.encode' }, { transform: 'base64.encode' }]);
    expect(composed.steps).toHaveLength(2);
    expect(chainOutput(analyze(composed.output ?? '', { now: NOW }))).toBe('hola');
  });

  // El caso del JWT, que NO vuelve a la fuente y el §6.6 lo dice: `jwt.decode` devuelve
  // `{header,payload,signature}`, así que lo que cierra el círculo es que el PAYLOAD reabierto
  // sea el del paso 1 con su `iat`.
  it('jwt.sign → analyze reabre el token y devuelve el payload del paso 1 (§6.6)', () => {
    const composed = run(SOURCE, MOCKUP_RECIPE);
    const chain = analyze(composed.output ?? '', { now: NOW });
    const reopened = JSON.parse(chainOutput(chain)) as { payload: unknown; header: unknown };
    expect(reopened.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(reopened.payload).toEqual({ ...JSON.parse(MINIFIED), iat: IAT });
  });

  it('el kind que compose() detecta es el mismo que detecta analyze() (I10: una sola verdad)', () => {
    const composed = run(SOURCE, MOCKUP_RECIPE);
    const chain = analyze(composed.output ?? '', { now: NOW });
    expect(composed.outputKind).toBe('jwt');
    expect(chain.steps[0]?.detections[0]?.kind).toBe('jwt');
  });
});
