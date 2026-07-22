import { afterEach, expect, test } from 'vitest';
import {
  MODE_ROUTE,
  markModeSwitch,
  parseComposeDraft,
  saveDraft,
  serializeComposeDraft,
  takeSwitchedDraft,
} from './work-mode';

// La decisión de T6.7 sobre QUÉ SE CONSERVA al conmutar de modo, fijada como test: conmutar
// conserva lo escrito; recargar o entrar directo NO. Es la mitad del comportamiento que el
// usuario percibe del conmutador y no se puede ver en un render — se ve aquí.

afterEach(() => {
  window.sessionStorage.clear();
});

test('sin haber conmutado de modo no se restaura nada (recarga / enlace directo)', () => {
  saveDraft('compose', serializeComposeDraft({ source: '{"a":1}', transforms: ['json.minify'] }));
  // No hay flag: quien monta la pantalla arranca limpio aunque el borrador exista.
  expect(takeSwitchedDraft('compose')).toBeNull();
  expect(takeSwitchedDraft('decode')).toBeNull();
});

test('tras conmutar, el modo de destino recupera su borrador', () => {
  saveDraft('decode', 'Bearer eyJhbGciOi…');
  saveDraft('compose', serializeComposeDraft({ source: '{"a":1}', transforms: ['json.minify'] }));

  markModeSwitch();
  expect(takeSwitchedDraft('compose')).toBe(
    '{"source":"{\\"a\\":1}","transforms":["json.minify"]}',
  );
});

test('el flag es de UN SOLO USO: la siguiente visita (recarga) ya no restaura', () => {
  saveDraft('decode', 'algo escrito');
  markModeSwitch();
  expect(takeSwitchedDraft('decode')).toBe('algo escrito');
  // Segunda lectura sin conmutar de nuevo: pantalla limpia.
  expect(takeSwitchedDraft('decode')).toBeNull();
});

test('el borrador de componer viaja con la fuente y los ids, y NUNCA con las opciones', () => {
  const draft = { source: '{"sub":"1"}', transforms: ['json.minify', 'jwt.sign'] };
  const raw = serializeComposeDraft(draft);
  // Allowlist: se serializa lo que se enumera. Aunque alguien colara `options` en el objeto,
  // no habría por dónde escribirlas — el secreto de firma (T6.8) no puede acabar aquí.
  expect(JSON.parse(raw)).toEqual(draft);
  expect(raw).not.toContain('options');
  expect(parseComposeDraft(raw)).toEqual(draft);
});

test('vaciar el campo BORRA la clave del borrador (decisión de retención de T6.7)', () => {
  saveDraft('decode', 'algo escrito');
  expect(window.sessionStorage.getItem('devtools:draft:decode')).toBe('algo escrito');
  // El gesto del usuario («lo he borrado») borra también lo guardado: no queda un hueco vacío
  // ni el valor anterior esperando a que alguien vuelva.
  saveDraft('decode', '');
  expect(window.sessionStorage.getItem('devtools:draft:decode')).toBeNull();
  markModeSwitch();
  expect(takeSwitchedDraft('decode')).toBeNull();
});

test('🔴 las `options` de un paso NUNCA entran en el borrador (el guard del que depende T6.8)', () => {
  // Se modela lo que hace la pantalla: sus pasos llevan `options` (donde vivirá el secreto de
  // firma) y al guardar SOLO se proyectan los ids. La allowlist es la serialización misma.
  const steps = [
    { transform: 'json.minify' },
    {
      transform: 'jwt.sign',
      options: { alg: 'HS256', secret: 'test-signing-secret-not-a-secret' },
    },
  ];
  const raw = serializeComposeDraft({
    source: '{"sub":"1"}',
    transforms: steps.map((step) => step.transform),
  });

  expect(raw).not.toContain('secret');
  expect(raw).not.toContain('test-signing-secret-not-a-secret');
  expect(raw).not.toContain('options');
  saveDraft('compose', raw);
  // Control POSITIVO en la misma pasada: la receta sí está guardada (el grep apunta bien).
  const stored = window.sessionStorage.getItem('devtools:draft:compose') ?? '';
  expect(stored).toContain('jwt.sign');
  expect(stored).not.toContain('not-a-secret');
});

test('al leer, se descartan los pasos que el catálogo no reconoce', () => {
  // Un borrador puede sobrevivir a un despliegue que renombre o retire una transformación, y un
  // id vacío o desconocido dejaría la pantalla sin forma honesta de representarlo.
  const raw = JSON.stringify({
    source: '{"a":1}',
    transforms: ['json.minify', '', 'transformacion.retirada', 'base64url.encode'],
  });
  expect(parseComposeDraft(raw)).toEqual({
    source: '{"a":1}',
    transforms: ['json.minify', 'base64url.encode'],
  });
});

test('un borrador corrupto no rompe la pantalla: se descarta', () => {
  expect(parseComposeDraft(null)).toBeNull();
  expect(parseComposeDraft('esto no es json')).toBeNull();
  expect(parseComposeDraft('null')).toBeNull();
  expect(parseComposeDraft('{"source":5,"transforms":[]}')).toBeNull();
  expect(parseComposeDraft('{"source":"x","transforms":[1,2]}')).toBeNull();
  expect(parseComposeDraft('{"source":"x"}')).toBeNull();
});

test('cada modo tiene su ruta y son distintas', () => {
  expect(MODE_ROUTE.decode).toBe('/analyze');
  expect(MODE_ROUTE.compose).toBe('/compose');
});
