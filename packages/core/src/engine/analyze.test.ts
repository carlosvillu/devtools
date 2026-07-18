// Corpus del motor de cadena (PRD §6). Todo ejercita `analyze()` REAL (o `runChain()`, el
// mismo bucle de producción, para el guard de ciclos): nada de mocks de la lógica pura.
// Cubre: el ejemplo trabajado del §6.5 byte a byte (golden), un caso por cada `terminal`
// (`text`/`no_transform`/`max_depth`/`cycle`/`error`), el determinismo byte a byte (I5/14.6)
// y la cota de 8 pasos sin bucle (I2/I3/14.7). Los golden se regeneran con UPDATE_GOLDEN=1.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { makeTransform } from '@app/test-utils';
import { analyze, ChainSchema, type Detection, type Transform } from './index';
import { runChain } from './analyze'; // bucle interno: no forma parte de la API pública del motor

// `now` FIJO del §6.5: exp=1752624000 (=2025-07-16T00:00:00Z) + 4h ⇒ "caducó hace 4 horas".
const NOW = new Date('2025-07-16T04:00:00Z');

// Entrada canónica del §6.5 (contrato de comportamiento del motor).
const JWT_66 = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ.abc';

// Serialización estable para golden + comparación byte a byte (claves en orden de inserción,
// indent 2, newline final). El mismo JSON.stringify determinista es la base de I5.
const serialize = (value: unknown): string => JSON.stringify(value, null, 2) + '\n';

// Contenido golden esperado (byte a byte) de un fichero versionado; regenera con
// UPDATE_GOLDEN=1. El `expect(...).toBe(...)` vive en el test (no aquí) para que la aserción
// sea visible. fileURLToPath (nunca `.pathname`: percent-encodaría espacios → ENOENT falsos).
function goldenContent(actual: string, fileUrl: URL): string {
  const path = fileURLToPath(fileUrl);
  if (process.env.UPDATE_GOLDEN === '1') {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, actual);
    return actual;
  }
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`golden ausente: ${path} — regenera con UPDATE_GOLDEN=1`);
    }
    throw err;
  }
}

const golden = (name: string): URL => new URL(`./golden/analyze/${name}.json`, import.meta.url);

// Construye una entrada base64 anidada N veces sobre una semilla fija (determinista).
function nestBase64(seed: string, levels: number): string {
  let s = seed;
  for (let k = 0; k < levels; k++) s = Buffer.from(s, 'utf8').toString('base64');
  return s;
}
const MAX_DEPTH_INPUT = nestBase64(
  'seed string long enough to survive many base64 rounds abcdefghij',
  8,
);
// base64 de "http://example.com/%zz": decodifica a una URL válida (`new URL` la acepta) cuyo
// percent-encoding está roto, así que `url.decode` (decodeURIComponent) falla A MITAD de cadena.
const ERROR_MIDCHAIN_INPUT = 'aHR0cDovL2V4YW1wbGUuY29tLyV6eg==';

// El corpus completo (para las comprobaciones transversales: determinismo, cota, Zod).
const CORPUS: [name: string, input: string][] = [
  ['jwt-6.5', JWT_66],
  ['text', 'holaquetalestamos'],
  ['no-transform', '{\n  "a": 1\n}'],
  ['max-depth', MAX_DEPTH_INPUT],
  ['error-midchain', ERROR_MIDCHAIN_INPUT],
  ['timestamp', '1752624000'],
  ['uuid', '550e8400-e29b-41d4-a716-446655440000'],
  ['url-query', 'https://example.com/cb?state=a%20b&code=xyz'],
];

// ── El ejemplo trabajado del §6.5 es el contrato de comportamiento ────────────────────────
describe('analyze() — ejemplo trabajado del §6.5 (contrato exacto)', () => {
  const chain = analyze(JWT_66, { now: NOW });

  it('produce EXACTAMENTE la cadena documentada: jwt → json → terminal no_transform', () => {
    expect(chain.terminal).toBe('no_transform');
    expect(chain.steps).toHaveLength(3);
    // applied de cada paso: jwt.decode, json.format, null (paso terminal).
    expect(chain.steps.map((s) => s.applied)).toEqual(['jwt.decode', 'json.format', null]);
    // El kind elegido ([0]) por paso: jwt, json, json.
    expect(chain.steps.map((s) => s.detections[0]?.kind)).toEqual(['jwt', 'json', 'json']);
  });

  it('la nota de expiración del paso 0 es byte-idéntica a la del §6.5', () => {
    expect(chain.steps[0]?.notes).toEqual(['exp: 2025-07-16T00:00:00Z (caducó hace 4 horas)']);
    // Los pasos sin transformación aplicada no llevan notas.
    expect(chain.steps[2]?.notes).toBeUndefined();
  });

  it('golden byte a byte de la Chain completa', () => {
    expect(serialize(chain)).toBe(goldenContent(serialize(chain), golden('jwt-6.5')));
  });
});

// ── Un caso por cada `terminal` ───────────────────────────────────────────────────────────
describe('analyze() — los cinco finales de la cadena', () => {
  it('text: una entrada no reconocida termina en text con un único paso terminal', () => {
    const chain = analyze('holaquetalestamos', { now: NOW });
    expect(chain.terminal).toBe('text');
    expect(chain.steps).toHaveLength(1);
    expect(chain.steps[0]).toMatchObject({ index: 0, applied: null, output: null });
    expect(chain.steps[0]?.detections[0]?.kind).toBe('text');
    expect(serialize(chain)).toBe(goldenContent(serialize(chain), golden('text')));
  });

  it('no_transform: json ya formateado no se re-aplica (regla §6.5)', () => {
    const chain = analyze('{\n  "a": 1\n}', { now: NOW });
    expect(chain.terminal).toBe('no_transform');
    expect(chain.steps).toHaveLength(1);
    expect(chain.steps[0]).toMatchObject({ applied: null, output: null });
    expect(serialize(chain)).toBe(goldenContent(serialize(chain), golden('no-transform')));
  });

  it('max_depth: base64 anidada x8 se capa en 8 pasos (I2, final legítimo)', () => {
    const chain = analyze(MAX_DEPTH_INPUT, { now: NOW });
    expect(chain.terminal).toBe('max_depth');
    expect(chain.steps).toHaveLength(8);
    // El paso final de max_depth conserva su transformación REAL aplicada (no es un error):
    // es el único terminal cuyo último paso lleva applied ≠ null y output ≠ null (§6.1).
    expect(chain.steps.every((s) => s.applied === 'base64.decode')).toBe(true);
    expect(chain.steps.at(-1)?.output).not.toBeNull();
    // Cada paso encoge (base64.decode es estrictamente reductor: por eso NO cicla).
    for (const s of chain.steps) {
      expect((s.output ?? '').length).toBeLessThan(s.input.length);
    }
  });

  it('error: una transformación que falla a mitad de cadena termina en error y conserva los previos', () => {
    const chain = analyze(ERROR_MIDCHAIN_INPUT, { now: NOW });
    expect(chain.terminal).toBe('error');
    expect(chain.steps).toHaveLength(2);
    // Paso 0 productivo (base64 → URL), paso 1 terminal por fallo de url.decode.
    expect(chain.steps[0]).toMatchObject({ index: 0, applied: 'base64.decode' });
    expect(chain.steps[0]?.output).toBe('http://example.com/%zz');
    expect(chain.steps[1]).toMatchObject({ index: 1, applied: null, output: null });
    expect(chain.steps[1]?.detections[0]?.kind).toBe('url');
    expect(serialize(chain)).toBe(goldenContent(serialize(chain), golden('error-midchain')));
  });
});

// ── Ciclo (I3): control negativo con el BUCLE REAL y un grafo de transformaciones inyectado ──
// terminal:'cycle' es INALCANZABLE con las transformaciones reales de v1 — todas encogen
// (base64) o convergen a un punto fijo de json.format (no_transform); ninguna pareja de
// defaults es inversa, así que no existe ciclo de periodo ≥2. El guard I3 se ejercita con
// `runChain()` (el MISMO bucle que corre `analyze`) inyectando `detect` + índice controlados
// que sí se auto-alimentan (A→B→A). Sin el guard, esto correría hasta max_depth (8 pasos):
// el assert `cycle` + `2 pasos` se pone ROJO si se elimina la detección de ciclos.
describe('runChain() — guard de ciclos (I3)', () => {
  // Grafo mínimo que revisita un input previo: base64.decode mapea 'A'↔'B'.
  const cyclingDetect = (input: string): Detection[] =>
    input === 'A' || input === 'B'
      ? [
          { kind: 'base64', confidence: 0.7 },
          { kind: 'text', confidence: 0.01 },
        ]
      : [{ kind: 'text', confidence: 0.01 }];
  const cyclingIndex = new Map<string, Transform>([
    [
      'base64.decode',
      makeTransform({ apply: (input) => ({ ok: true, output: input === 'A' ? 'B' : 'A' }) }),
    ],
  ]);

  it('corta con terminal:cycle cuando un output ya apareció como input previo, y conserva los pasos', () => {
    const chain = runChain('A', cyclingDetect, cyclingIndex);
    expect(chain.terminal).toBe('cycle');
    expect(chain.steps).toHaveLength(2);
    // Los pasos previos quedan intactos (I1): paso 0 A→B, paso 1 B→A (el que cierra el ciclo).
    expect(chain.steps[0]).toMatchObject({
      index: 0,
      input: 'A',
      applied: 'base64.decode',
      output: 'B',
    });
    expect(chain.steps[1]).toMatchObject({
      index: 1,
      input: 'B',
      applied: 'base64.decode',
      output: 'A',
    });
    // El paso del ciclo conserva applied+output (a diferencia de text/no_transform/error).
    expect(chain.steps.at(-1)?.output).toBe('A');
  });
});

// ── Determinismo byte a byte (I5 / criterio 14.6) ─────────────────────────────────────────
describe('analyze() — determinismo (I5, 14.6)', () => {
  it.each(CORPUS)('mismo input + mismo now ⇒ Chain idéntica byte a byte: %s', (_name, input) => {
    const a = analyze(input, { now: NOW });
    const b = analyze(input, { now: NOW });
    expect(serialize(a)).toBe(serialize(b));
  });
});

// ── Cota de profundidad y ausencia de bucle sobre el corpus (I2/I3 / criterio 14.7) ───────
describe('analyze() — cota de 8 pasos sin bucle (14.7)', () => {
  it.each(CORPUS)('%s: ≤ 8 pasos, índices consecutivos, terminal válido', (_name, input) => {
    const chain = analyze(input, { now: NOW });
    expect(chain.steps.length).toBeGreaterThan(0);
    expect(chain.steps.length).toBeLessThanOrEqual(8);
    // índices consecutivos desde 0 (la cadena no "salta" pasos).
    chain.steps.forEach((s, i) => {
      expect(s.index).toBe(i);
    });
  });

  // Propiedad tomada, no accidental: NINGUNA entrada real produce 'cycle' con las
  // transformaciones de v1 (todas encogen o convergen a un punto fijo de json.format). El
  // guard I3 existe por diseño defensivo y se ejercita aparte con un grafo inyectado.
  it.each(CORPUS)('%s: las transformaciones reales de v1 nunca ciclan', (_name, input) => {
    expect(analyze(input, { now: NOW }).terminal).not.toBe('cycle');
  });
});

// ── El motor emite Chains que validan contra el contrato Zod (§6.1) ───────────────────────
describe('analyze() — la salida valida contra ChainSchema', () => {
  it.each(CORPUS)('%s: ChainSchema.safeParse().success', (_name, input) => {
    expect(ChainSchema.safeParse(analyze(input, { now: NOW })).success).toBe(true);
  });
});
