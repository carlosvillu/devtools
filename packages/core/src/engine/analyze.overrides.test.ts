// Replay-con-overrides del motor (PRD O4/O5, T1.6). El desvío de la cadena se implementa como
// un REPLAY desde el inicio con reencaminamientos por paso, NO como un recorte en cliente. Este
// corpus prueba que:
//   - un override fuerza la transformación/kind correcto en el paso correcto (O4 y O5),
//   - `kind:'text'` para un paso ⇒ terminal (así se «elige la alternativa text» de 14.3),
//   - los pasos < N quedan BYTE-idénticos a la cadena por defecto (determinismo I5),
//   - el determinismo se conserva con overrides,
//   - y —control de I2/14.7— una recalculación NUNCA supera 8 pasos, algo que un recorte en
//     cliente (sub-cadena con presupuesto FRESCO de 8) SÍ podría violar.
import { describe, expect, it } from 'vitest';
import { makeTransform } from '@app/test-utils';
import { analyze, type Detection, type Transform } from './index';
import { runChain } from './analyze';

const NOW = new Date('2025-07-16T04:00:00Z');
const serialize = (value: unknown): string => JSON.stringify(value, null, 2);

// ── O4: forzar un id de transformación concreto ────────────────────────────────────────────
describe('analyze() con overrides — desvío por id de transformación (O4)', () => {
  it('fuerza timestamp.to_relative en el paso 0 en vez de la por defecto (to_iso)', () => {
    // Por defecto `1752624000` → timestamp.to_iso (ISO). El desvío pide la lectura relativa.
    const def = analyze('1752624000', { now: NOW });
    expect(def.steps[0]?.applied).toBe('timestamp.to_iso');
    expect(def.steps[0]?.output).toBe('2025-07-16T00:00:00.000Z');

    const chain = analyze('1752624000', {
      now: NOW,
      overrides: [{ step: 0, transform: 'timestamp.to_relative' }],
    });
    expect(chain.steps[0]?.applied).toBe('timestamp.to_relative');
    expect(chain.steps[0]?.output).toBe('hace 4 horas'); // NOW = exp + 4h
  });

  it('un id que no resuelve a ninguna transformación cierra el paso como text (defensa)', () => {
    const chain = analyze('1752624000', {
      now: NOW,
      overrides: [{ step: 0, transform: 'no.existe' }],
    });
    expect(chain.terminal).toBe('text');
    expect(chain.steps).toHaveLength(1);
    expect(chain.steps[0]?.applied).toBeNull();
  });
});

// ── O5: elegir una alternativa de detección (por kind); text ⇒ terminal ─────────────────────
describe('analyze() con overrides — elegir alternativa de detección (O5)', () => {
  it('kind:"text" en el paso 0 detiene la cadena: se interpreta como texto (criterio 14.3)', () => {
    const chain = analyze('1752624000', { now: NOW, overrides: [{ step: 0, kind: 'text' }] });
    expect(chain.terminal).toBe('text');
    expect(chain.steps).toHaveLength(1);
    // La DETECCIÓN sigue siendo timestamp (el motor no miente sobre lo que ve); lo que cambia
    // es que NO se aplica nada (applied null) porque el usuario eligió leerlo como texto.
    expect(chain.steps[0]?.detections[0]?.kind).toBe('unix_timestamp');
    expect(chain.steps[0]?.applied).toBeNull();
    expect(chain.steps[0]?.output).toBeNull();
  });

  it('kind:"unix_timestamp" resuelve a SU por defecto en ese input (server-side)', () => {
    // Equivalente a no desviar en el paso 0 (la por defecto de unix_timestamp es to_iso).
    const chain = analyze('1752624000', {
      now: NOW,
      overrides: [{ step: 0, kind: 'unix_timestamp' }],
    });
    expect(chain.steps[0]?.applied).toBe('timestamp.to_iso');
  });
});

// ── prefijo intacto + determinismo ──────────────────────────────────────────────────────────
describe('analyze() con overrides — pasos previos intactos y determinismo', () => {
  // base64 que decodifica a JSON: base64.decode → json.format → no_transform (3 pasos).
  const jsonInput = '{"b":2,"a":1}';
  const b64 = Buffer.from(jsonInput, 'utf8').toString('base64');

  it('desviar el paso 1 deja el paso 0 BYTE-idéntico a la cadena por defecto', () => {
    const def = analyze(b64, { now: NOW });
    expect(def.steps[0]?.applied).toBe('base64.decode');
    expect(def.steps[1]?.applied).toBe('json.format');

    const chain = analyze(b64, {
      now: NOW,
      overrides: [{ step: 1, transform: 'json.sort_keys' }],
    });
    // Paso 0 idéntico byte a byte (mismo input + now + defaults previos ⇒ prefijo igual, I5).
    expect(serialize(chain.steps[0])).toBe(serialize(def.steps[0]));
    // El paso 1 SÍ cambia: ahora ordena claves.
    expect(chain.steps[1]?.applied).toBe('json.sort_keys');
    expect(chain.steps[1]?.output).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it('mismo input + mismo now + mismos overrides ⇒ Chain byte-idéntica (I5)', () => {
    const overrides = [{ step: 1, transform: 'json.minify' as const }];
    const a = analyze(b64, { now: NOW, overrides });
    const b = analyze(b64, { now: NOW, overrides });
    expect(serialize(a)).toBe(serialize(b));
  });
});

// ── control de I2/14.7: la recalculación NUNCA supera 8 pasos (lo que un splice SÍ haría) ────
describe('runChain() con overrides — cota de 8 pasos en el camino desviado (I2/14.7)', () => {
  // Grafo inyectado sobre el BUCLE REAL: cada input se detecta como base64 (siempre productivo);
  // dos transformaciones que CRECEN monótonamente (nunca ciclan, nunca son punto fijo), así que
  // la cadena solo puede terminar por el tope de profundidad (max_depth).
  const detectAll = (_input: string): Detection[] => [
    { kind: 'base64', confidence: 0.7 },
    { kind: 'text', confidence: 0.01 },
  ];
  const growIndex = new Map<string, Transform>([
    // Por defecto de `base64` (DEFAULT_TRANSFORM_BY_KIND): crece +1.
    ['base64.decode', makeTransform({ apply: (input) => ({ ok: true, output: input + 'a' }) })],
    // Transformación alternativa (el desvío de O4): crece +2, distinta pero igual de larga.
    ['grow2', makeTransform({ apply: (input) => ({ ok: true, output: input + 'bb' }) })],
  ]);

  it('sin desvío la cadena satura en 8 pasos (max_depth)', () => {
    const full = runChain('seed', detectAll, growIndex);
    expect(full.steps).toHaveLength(8);
    expect(full.terminal).toBe('max_depth');
  });

  it('un desvío en el paso 5 sigue capado en 8 pasos, aunque un splice daría 13', () => {
    const diverted = runChain('seed', detectAll, growIndex, [{ step: 5, transform: 'grow2' }]);
    // La recalculación completa respeta I2: NUNCA más de 8 pasos.
    expect(diverted.steps).toHaveLength(8);
    expect(diverted.terminal).toBe('max_depth');
    // El desvío se aplicó en el paso 5 (id distinto del default), prefijo 0..4 intacto (default).
    expect(diverted.steps[5]?.applied).toBe('grow2');
    expect(diverted.steps.slice(0, 5).every((s) => s.applied === 'base64.decode')).toBe(true);

    // CONTROL de splice: si el desvío se hiciera troceando en cliente (analizar el input del
    // paso 5 con presupuesto FRESCO y pegar el prefijo), la sub-cadena volvería a saturar en 8,
    // dando prefijo(5) + cola(8) = 13 > 8. El replay-con-overrides lo evita porque es el MISMO
    // bucle único con UN solo presupuesto. Este assert se pondría ROJO con un splice.
    const step5Input = diverted.steps[5]?.input ?? '';
    const freshTail = runChain(step5Input, detectAll, growIndex);
    expect(5 + freshTail.steps.length).toBeGreaterThan(8);
  });
});
