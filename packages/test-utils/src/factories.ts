// Factories de dominio del motor (§6.1): cada una devuelve un objeto VÁLIDO según su
// schema Zod y acepta overrides parciales (testing/unit-core.md §1). Cuando el contrato
// evoluciona, se actualiza aquí una vez y no en cada test.
import type { Chain, ChainStep, Detection, Transform } from '@app/core/engine';

export function makeDetection(overrides: Partial<Detection> = {}): Detection {
  return { kind: 'json', confidence: 0.99, ...overrides };
}

export function makeTransform(overrides: Partial<Transform> = {}): Transform {
  return {
    id: 'base64.decode',
    from: 'base64',
    label: 'Decodificar base64',
    apply: () => ({ ok: true, output: 'decoded' }),
    ...overrides,
  };
}

export function makeChainStep(overrides: Partial<ChainStep> = {}): ChainStep {
  return {
    index: 0,
    input: 'eyJhIjoxfQ',
    detections: [
      makeDetection({ kind: 'base64', confidence: 0.7 }),
      makeDetection({ kind: 'text', confidence: 0.01 }),
    ],
    applied: 'base64.decode',
    output: '{"a":1}',
    ...overrides,
  };
}

export function makeChain(overrides: Partial<Chain> = {}): Chain {
  return {
    steps: [makeChainStep()],
    terminal: 'no_transform',
    ...overrides,
  };
}
