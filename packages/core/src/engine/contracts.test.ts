// Contratos del motor (§6.1): por cada schema, el fixture canónico valida y una tabla de
// mutaciones —una por regla de negocio— es rechazada (testing/unit-core.md §3). Las
// mutaciones parten de la factory válida y rompen exactamente una cosa.
import { describe, expect, it } from 'vitest';
import { makeChain, makeChainStep, makeDetection, makeTransform } from '@app/test-utils';
import {
  ChainSchema,
  ChainStepSchema,
  DetectionSchema,
  type Chain,
  type Detection,
  type Transform,
  TransformResultSchema,
  TransformSchema,
} from './contracts';

describe('DetectionSchema', () => {
  it('el fixture canónico valida', () => {
    expect(DetectionSchema.safeParse(makeDetection()).success).toBe(true);
  });

  const invalid: [string, () => unknown][] = [
    ['kind fuera del enum', () => makeDetection({ kind: 'teleported' as Detection['kind'] })],
    ['confidence > 1', () => makeDetection({ confidence: 1.5 })],
    ['confidence < 0', () => makeDetection({ confidence: -0.1 })],
    ['confidence no numérico', () => ({ ...makeDetection(), confidence: '0.5' })],
    ['sin kind', () => ({ confidence: 0.5 })],
  ];
  it.each(invalid)('rechaza: %s', (_name, mutate) => {
    expect(DetectionSchema.safeParse(mutate()).success).toBe(false);
  });

  it('meta es opcional', () => {
    expect(DetectionSchema.safeParse(makeDetection({ meta: { algo: 'sha256' } })).success).toBe(
      true,
    );
    const { meta: _omit, ...noMeta } = makeDetection();
    void _omit;
    expect(DetectionSchema.safeParse(noMeta).success).toBe(true);
  });
});

describe('TransformResultSchema', () => {
  it('la rama ok:true valida', () => {
    expect(TransformResultSchema.safeParse({ ok: true, output: 'x', notes: ['n'] }).success).toBe(
      true,
    );
  });
  it('la rama ok:false valida', () => {
    expect(TransformResultSchema.safeParse({ ok: false, error: 'boom' }).success).toBe(true);
  });

  const invalid: [string, unknown][] = [
    ['ok:true sin output', { ok: true, notes: [] }],
    ['ok:false sin error', { ok: false }],
    ['ok:true con error (rama cruzada)', { ok: true, error: 'boom' }],
    ['ok no booleano', { ok: 'yes', output: 'x' }],
    ['notes no es array de strings', { ok: true, output: 'x', notes: [1, 2] }],
  ];
  it.each(invalid)('rechaza: %s', (_name, value) => {
    expect(TransformResultSchema.safeParse(value).success).toBe(false);
  });
});

describe('TransformSchema', () => {
  it('el fixture canónico valida (apply es una función)', () => {
    expect(TransformSchema.safeParse(makeTransform()).success).toBe(true);
  });

  const invalid: [string, () => unknown][] = [
    ['apply no es función', () => ({ ...makeTransform(), apply: 'nope' })],
    ['id vacío', () => makeTransform({ id: '' })],
    ['from fuera del enum', () => makeTransform({ from: 'teleported' as Transform['from'] })],
    ['label vacío', () => makeTransform({ label: '' })],
  ];
  it.each(invalid)('rechaza: %s', (_name, mutate) => {
    expect(TransformSchema.safeParse(mutate()).success).toBe(false);
  });
});

describe('ChainStepSchema', () => {
  it('el fixture canónico valida', () => {
    expect(ChainStepSchema.safeParse(makeChainStep()).success).toBe(true);
  });
  it('applied/output null (paso terminal) valida', () => {
    expect(ChainStepSchema.safeParse(makeChainStep({ applied: null, output: null })).success).toBe(
      true,
    );
  });

  const invalid: [string, () => unknown][] = [
    ['index negativo', () => makeChainStep({ index: -1 })],
    ['index no entero', () => makeChainStep({ index: 1.5 })],
    ['detections no es array', () => ({ ...makeChainStep(), detections: 'nope' })],
    [
      'detection inválida dentro del array',
      () => makeChainStep({ detections: [{ kind: 'json', confidence: 9 }] }),
    ],
    ['applied numérico (ni string ni null)', () => ({ ...makeChainStep(), applied: 3 })],
  ];
  it.each(invalid)('rechaza: %s', (_name, mutate) => {
    expect(ChainStepSchema.safeParse(mutate()).success).toBe(false);
  });
});

describe('ChainSchema', () => {
  it('el fixture canónico valida', () => {
    expect(ChainSchema.safeParse(makeChain()).success).toBe(true);
  });

  const invalid: [string, () => unknown][] = [
    ['terminal fuera del enum', () => makeChain({ terminal: 'exploded' as Chain['terminal'] })],
    ['steps no es array', () => ({ ...makeChain(), steps: {} })],
    [
      'step inválido dentro del array',
      () => makeChain({ steps: [{ index: -1 } as Chain['steps'][number]] }),
    ],
  ];
  it.each(invalid)('rechaza: %s', (_name, mutate) => {
    expect(ChainSchema.safeParse(mutate()).success).toBe(false);
  });
});
