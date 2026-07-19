// Unit del adaptador dominio → props del DS (testing/frontend.md): es lógica PURA con
// sustancia (una LEY de formateo por tramos), así que se prueba aquí y no vía el DOM.
//
// Los tramos se miden LEJOS del ancla a propósito (testing/SKILL.md, anti-patrón f): un
// solo punto justo en el borde de cada tramo dejaría pasar una fórmula equivocada.
import { describe, expect, it } from 'vitest';
import type { HistoryEntryView } from '@app/core/history';
import { chainKinds, relativeTime, toHistoryRowProps } from './history-entry-view';

const NOW = new Date('2026-07-18T12:00:00Z');
const ago = (ms: number): Date => new Date(NOW.getTime() - ms);
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('relativeTime', () => {
  it.each([
    ['hace un momento', 5_000],
    ['hace 1 min', MINUTE],
    ['hace 37 min', 37 * MINUTE], // lejos del borde: una fórmula rota daría otro número
    ['hace 1 h', HOUR],
    ['hace 5 h', 5 * HOUR],
    ['hace 23 h', 23 * HOUR],
    ['ayer', DAY],
    ['ayer', DAY + 5 * HOUR],
    ['hace 2 d', 2 * DAY],
    ['hace 17 d', 17 * DAY],
  ])('devuelve «%s» para %d ms de antigüedad', (expected, elapsed) => {
    expect(relativeTime(ago(elapsed), NOW)).toBe(expected);
  });

  it('no produce números negativos si la fila viene del futuro (skew de reloj)', () => {
    expect(relativeTime(new Date(NOW.getTime() + 10 * MINUTE), NOW)).toBe('hace un momento');
  });
});

const ENTRY: HistoryEntryView = {
  id: '11111111-1111-4111-8111-111111111111',
  preview: 'Bearer eyJhbGciOiJIUzI1NiJ9.….…',
  inputKind: 'jwt',
  chain: [
    { kind: 'jwt', transformId: 'jwt.decode' },
    { kind: 'json', transformId: null },
  ],
  createdAt: ago(3 * HOUR).toISOString(),
};

describe('chainKinds', () => {
  it('extrae los kinds en orden para el ChainSummary', () => {
    expect(chainKinds(ENTRY)).toEqual(['jwt', 'json']);
  });
});

describe('toHistoryRowProps', () => {
  it('traduce la entrada a props planas del DS', () => {
    expect(toHistoryRowProps(ENTRY, NOW)).toEqual({
      preview: 'Bearer eyJhbGciOiJIUzI1NiJ9.….…',
      kind: 'jwt',
      chain: ['jwt', 'json'],
      time: 'hace 3 h',
    });
  });

  it('D7: las props que llegan al DS solo llevan el preview redactado — ningún dato crudo', () => {
    const props = toHistoryRowProps(ENTRY, NOW);
    // El contrato ni siquiera tiene un campo con el dato original; este assert vigila que
    // nadie añada uno por la puerta de atrás del adaptador.
    expect(Object.keys(props).sort()).toEqual(['chain', 'kind', 'preview', 'time']);
    expect(props.preview).toBe(ENTRY.preview);
  });
});
