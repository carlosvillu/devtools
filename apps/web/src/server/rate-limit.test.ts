// Lógica pura de la ventana deslizante (§11). Con `now` inyectado el test es determinista
// sin fake timers: se prueba la LEY (admite hasta `limit`, luego bloquea; la ventana libera
// al expirar) en puntos lejos del trivial, no solo el umbral.
import { describe, expect, it } from 'vitest';
import { makeSlidingWindowRateLimiter } from './rate-limit';

describe('makeSlidingWindowRateLimiter', () => {
  it('admite exactamente `limit` peticiones en la ventana y bloquea la siguiente', () => {
    const t = 1_000;
    const rl = makeSlidingWindowRateLimiter({ limit: 3, windowMs: 1_000, now: () => t });

    expect(rl.check('ip-a')).toBe(true); // 1
    expect(rl.check('ip-a')).toBe(true); // 2
    expect(rl.check('ip-a')).toBe(true); // 3
    expect(rl.check('ip-a')).toBe(false); // 4 → bloqueada
    expect(rl.check('ip-a')).toBe(false); // sigue bloqueada dentro de la ventana
  });

  it('aísla el contador por clave: un cliente no consume la cuota de otro', () => {
    const t = 0;
    const rl = makeSlidingWindowRateLimiter({ limit: 2, windowMs: 1_000, now: () => t });

    expect(rl.check('ip-a')).toBe(true);
    expect(rl.check('ip-a')).toBe(true);
    expect(rl.check('ip-a')).toBe(false); // ip-a agotada
    expect(rl.check('ip-b')).toBe(true); // ip-b intacta
    expect(rl.check('ip-b')).toBe(true);
  });

  it('libera la cuota cuando las marcas salen de la ventana', () => {
    let t = 0;
    const rl = makeSlidingWindowRateLimiter({ limit: 2, windowMs: 1_000, now: () => t });

    expect(rl.check('ip-a')).toBe(true); // t=0
    expect(rl.check('ip-a')).toBe(true); // t=0
    expect(rl.check('ip-a')).toBe(false); // t=0 → bloqueada

    t = 1_001; // ambas marcas (t=0) quedan fuera de la ventana (> 1000 ms)
    expect(rl.check('ip-a')).toBe(true); // cuota liberada
  });
});
