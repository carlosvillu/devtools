// CAPA: unit puro (core). Protege la FRONTERA DE PERSISTENCIA de una receta (T6.10, §9/§11): la
// obligación 🔴 de seguridad de la fase. Dos líneas, cada una con su propia vara:
//   1. `HistoryComposeBodySchema` (`.strict()`) — el cuerpo de `POST /api/history` RECHAZA con un
//      error cualquier campo que no sea la receta (allowlist, no blacklist). Es el control
//      negativo del Zod estricto en su capa más barata.
//   2. `buildComposeHistoryRecord` — al construir la fila se leen SOLO `transform_id` + `kind`;
//      aunque un paso llegara con un `secret`/`options`, no hay por dónde copiarlo a la BD.
//
// El secreto canario es el literal de la Verificación del planning: NO es un secreto real.
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import {
  HistoryComposeBodySchema,
  buildComposeHistoryRecord,
  buildComposePreview,
  type HistoryComposeStep,
} from './index';

const CANARY_SECRET = 'test-signing-secret-not-a-secret';

const RECIPE: HistoryComposeStep[] = [
  { transform_id: 'json.minify', kind: 'json' },
  { transform_id: 'jwt.sign', kind: 'jwt' },
];

describe('HistoryComposeBodySchema — allowlist estricta (el cuerpo de POST /api/history)', () => {
  it('acepta una receta bien formada (solo transform_id + kind)', () => {
    const parsed = HistoryComposeBodySchema.parse({ steps: RECIPE });
    expect(parsed.steps).toEqual(RECIPE);
  });

  it.each([
    ['source', { steps: RECIPE, source: '{"sub":"1","name":"carlos"}' }],
    ['output', { steps: RECIPE, output: 'eyJhbGciOi…' }],
    ['secret', { steps: RECIPE, secret: CANARY_SECRET }],
    ['preview', { steps: RECIPE, preview: 'compuesto · 2 pasos' }],
    ['userId', { steps: RECIPE, userId: '00000000-0000-4000-8000-000000000000' }],
  ])('🔴 RECHAZA un cuerpo con el campo extra «%s» (400, no se ignora en silencio)', (_n, body) => {
    const r = HistoryComposeBodySchema.safeParse(body);
    expect(r.success).toBe(false);
  });

  it('🔴 RECHAZA un paso que lleve `options` con el secreto (el camino por el que se colaría)', () => {
    const r = HistoryComposeBodySchema.safeParse({
      steps: [{ transform_id: 'jwt.sign', kind: 'jwt', options: { secret: CANARY_SECRET } }],
    });
    // `.strict()` a NIVEL DE PASO: un paso con más que {transform_id, kind} no pasa.
    expect(r.success).toBe(false);
  });

  it('RECHAZA un transform_id que no está en el catálogo del motor (no una lista suelta)', () => {
    const r = HistoryComposeBodySchema.safeParse({
      steps: [{ transform_id: 'jwt.forge', kind: 'jwt' }],
    });
    expect(r.success).toBe(false);
  });

  it('RECHAZA un kind fuera del enum DataKind', () => {
    const r = HistoryComposeBodySchema.safeParse({
      steps: [{ transform_id: 'json.minify', kind: 'secreto' }],
    });
    expect(r.success).toBe(false);
  });

  it('RECHAZA una receta vacía (nada que persistir) y una de más de 8 pasos', () => {
    expect(HistoryComposeBodySchema.safeParse({ steps: [] }).success).toBe(false);
    const nine = Array.from({ length: 9 }, () => ({ transform_id: 'json.minify', kind: 'json' }));
    expect(HistoryComposeBodySchema.safeParse({ steps: nine }).success).toBe(false);
  });
});

describe('buildComposeHistoryRecord — SOLO la receta llega a la fila (allowlist por construcción)', () => {
  it('construye la fila con preview sintético, input_kind del primer paso y chain de ids', () => {
    expect(buildComposeHistoryRecord(RECIPE)).toEqual({
      preview: 'compuesto · 2 pasos',
      inputKind: 'json',
      chain: [
        { kind: 'json', transformId: 'json.minify' },
        { kind: 'jwt', transformId: 'jwt.sign' },
      ],
      direction: 'compose',
    });
  });

  it('🔴 aunque un paso arrastrara un secreto en campos extra, NO aparece en la fila', () => {
    // Un paso adulterado con `secret`/`options`/`source` (lo que `.strict()` ya rechaza antes,
    // pero esta es la SEGUNDA línea: la función lee por allowlist, no copia el objeto entero).
    const tainted = [
      {
        transform_id: 'jwt.sign',
        kind: 'jwt',
        secret: CANARY_SECRET,
        options: { secret: CANARY_SECRET },
        source: '{"name":"carlos"}',
      },
    ] as unknown as HistoryComposeStep[];

    const record = buildComposeHistoryRecord(tainted);
    const dump = JSON.stringify(record);
    // Ninguna forma del dato del usuario sobrevive al borde.
    expect(dump).not.toContain(CANARY_SECRET);
    expect(dump).not.toContain('carlos');
    expect(dump).not.toContain('secret');
    expect(dump).not.toContain('options');
    // Lo que SÍ está (control positivo: el borde no es un `return {}` vacío que "pasa" el grep).
    expect(dump).toContain('jwt.sign');
    expect(record.chain).toEqual([{ kind: 'jwt', transformId: 'jwt.sign' }]);
  });

  it('lanza ante una receta vacía en vez de escribir un input_kind inventado', () => {
    expect(() => buildComposeHistoryRecord([])).toThrow();
    expect(() => buildComposeHistoryRecord([])).not.toThrow(ZodError);
  });
});

describe('buildComposePreview — etiqueta sintética, cero dato del usuario', () => {
  it('singulariza «paso» y pluraliza «pasos»', () => {
    expect(buildComposePreview(1)).toBe('compuesto · 1 paso');
    expect(buildComposePreview(3)).toBe('compuesto · 3 pasos');
  });
});
