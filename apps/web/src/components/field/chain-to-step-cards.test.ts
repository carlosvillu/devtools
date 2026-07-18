import { expect, test } from 'vitest';
import type { Chain, ChainStep } from '@app/core/engine';
import {
  alternativesForStep,
  chainKinds,
  chainToStepCards,
  isUnrecognized,
} from './chain-to-step-cards';

// Cadena tipo JWT como la produce el motor: jwt.decode → json.format → paso terminal sin
// transformación (applied/output null). Modela la forma real que devuelve `analyze`.
const jwtChain: Chain = {
  terminal: 'no_transform',
  steps: [
    {
      index: 0,
      input: 'Bearer eyJ…',
      detections: [
        { kind: 'jwt', confidence: 0.95 },
        { kind: 'text', confidence: 0.01 },
      ],
      applied: 'jwt.decode',
      output: '{"header":{"alg":"HS256"}}',
      notes: ['exp: 2025-07-16T00:00:00Z (caducó hace 1 año)'],
    },
    {
      index: 1,
      input: '{"header":{"alg":"HS256"}}',
      detections: [{ kind: 'json', confidence: 0.99 }],
      applied: 'json.format',
      output: '{\n  "header": {\n    "alg": "HS256"\n  }\n}',
    },
    {
      index: 2,
      input: '{\n  "header": {\n    "alg": "HS256"\n  }\n}',
      detections: [{ kind: 'json', confidence: 0.99 }],
      applied: null,
      output: null,
    },
  ],
};

test('chainToStepCards produce un view por paso con la detección elegida', () => {
  const cards = chainToStepCards(jwtChain);
  expect(cards).toHaveLength(3);
  expect(cards[0]).toMatchObject({
    index: 0,
    kind: 'jwt',
    confidence: 0.95,
    applied: 'jwt.decode',
    output: '{"header":{"alg":"HS256"}}',
  });
  // La detección elegida es siempre `detections[0]` (el motor ordena por confianza desc).
  expect(cards[0]!.kind).toBe('jwt');
});

test('el motivo terminal se pinta SOLO en el último paso', () => {
  const cards = chainToStepCards(jwtChain);
  expect(cards[0]!.terminal).toBeUndefined();
  expect(cards[1]!.terminal).toBeUndefined();
  expect(cards[2]!.terminal).toBe('no_transform');
});

test('applied/output null se traducen a undefined; las notas se conservan', () => {
  const cards = chainToStepCards(jwtChain);
  expect(cards[2]!.applied).toBeUndefined();
  expect(cards[2]!.output).toBeUndefined();
  expect(cards[0]!.notes).toEqual(['exp: 2025-07-16T00:00:00Z (caducó hace 1 año)']);
  expect(cards[1]!.notes).toBeUndefined();
});

// ── alternativas de detección (O5/I8): descartadas ≥ 0.3 + text si el kind convive con text ──
const step = (detections: ChainStep['detections']): ChainStep => ({
  index: 0,
  input: 'x',
  detections,
  applied: null,
  output: null,
});

test('un timestamp ofrece la alternativa text aunque su confianza (0.01) esté bajo el umbral', () => {
  // Caso literal de 14.3: `1752624000` → [unix_timestamp 0.6, text 0.01]. text SÍ se ofrece.
  expect(
    alternativesForStep(
      step([
        { kind: 'unix_timestamp', confidence: 0.6 },
        { kind: 'text', confidence: 0.01 },
      ]),
    ),
  ).toEqual(['text']);
});

test('un hash también convive siempre con text (§6.2)', () => {
  expect(
    alternativesForStep(
      step([
        { kind: 'hash', confidence: 0.4 },
        { kind: 'text', confidence: 0.01 },
      ]),
    ),
  ).toEqual(['text']);
});

test('un jwt NO ensucia con text: su alternativa text (0.01) queda bajo el umbral y no convive', () => {
  expect(
    alternativesForStep(
      step([
        { kind: 'jwt', confidence: 0.95 },
        { kind: 'text', confidence: 0.01 },
      ]),
    ),
  ).toEqual([]);
});

test('una detección descartada con confianza ≥ 0.3 se muestra; text se añade sin duplicar', () => {
  // Kind elegido base64 (0.7) con hash descartado (0.4 ≥ 0.3): hash se muestra. base64 no
  // convive con text, así que text NO se añade.
  expect(
    alternativesForStep(
      step([
        { kind: 'base64', confidence: 0.7 },
        { kind: 'hash', confidence: 0.4 },
        { kind: 'text', confidence: 0.01 },
      ]),
    ),
  ).toEqual(['hash']);
});

test('chainToStepCards adjunta alternativas y opciones de transformación del registro del motor', () => {
  const cards = chainToStepCards(jwtChain);
  // jwt: una sola transformación (jwt.decode) → el StepCard no mostrará picker (>1).
  expect(cards[0]!.transforms.map((t) => t.value)).toEqual(['jwt.decode']);
  // json: tres transformaciones (format/minify/sort_keys) → el picker aparece en el paso json.
  expect(cards[1]!.transforms.map((t) => t.value)).toEqual([
    'json.format',
    'json.minify',
    'json.sort_keys',
  ]);
  // jwt no ofrece alternativas (text bajo umbral y no convive).
  expect(cards[0]!.alternatives).toEqual([]);
});

test('chainKinds colapsa kinds repetidos consecutivos (jwt → json, no jwt → json → json)', () => {
  expect(chainKinds(jwtChain)).toEqual(['jwt', 'json']);
});

test('isUnrecognized es false cuando algún paso aplicó una transformación', () => {
  expect(isUnrecognized(jwtChain)).toBe(false);
});

test('isUnrecognized es true cuando ningún paso transformó (texto plano)', () => {
  const textChain: Chain = {
    terminal: 'text',
    steps: [
      {
        index: 0,
        input: 'holaquetalestamos',
        detections: [{ kind: 'text', confidence: 0.01 }],
        applied: null,
        output: null,
      },
    ],
  };
  expect(isUnrecognized(textChain)).toBe(true);
  expect(chainKinds(textChain)).toEqual(['text']);
});
