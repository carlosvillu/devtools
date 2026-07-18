import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('hashPassword / verifyPassword', () => {
  it('round-trip: la contraseña correcta verifica', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hashPassword('super-secret-1');
    expect(await verifyPassword('super-secret-2', hash)).toBe(false);
  });

  it('emite el formato PHC-like con prefijo, params, salt y derivado', async () => {
    const hash = await hashPassword('whatever-123');
    const parts = hash.split('$');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('scrypt');
    expect(parts[1]).toMatch(/^ln=\d+,r=\d+,p=\d+$/);
    // salt y derivado no vacíos y base64 decodificables
    expect(Buffer.from(parts[2]!, 'base64').length).toBeGreaterThan(0);
    expect(Buffer.from(parts[3]!, 'base64').length).toBeGreaterThan(0);
  });

  it('usa un salt aleatorio por hash: la misma contraseña da hashes distintos', async () => {
    const a = await hashPassword('same-password');
    const b = await hashPassword('same-password');
    expect(a).not.toBe(b);
    // …pero ambos verifican
    expect(await verifyPassword('same-password', a)).toBe(true);
    expect(await verifyPassword('same-password', b)).toBe(true);
  });

  it('un hash con formato inválido devuelve false, nunca lanza', async () => {
    expect(await verifyPassword('x', '')).toBe(false);
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$bad$only-three')).toBe(false);
    expect(await verifyPassword('x', 'bcrypt$ln=1,r=1,p=1$aa$bb')).toBe(false);
  });

  it('un hash que PARSEA pero rompe scrypt (params imposibles) devuelve false, nunca lanza', async () => {
    // Formato válido (parseHash lo acepta) pero ln=63 ⇒ N=2^63: excede maxmem y scrypt
    // rechaza (ERR_CRYPTO_INVALID_SCRYPT_PARAMS). El contrato es «nunca lanza» → false.
    const real = await hashPassword('whatever-123');
    const parts = real.split('$');
    const poisoned = [parts[0], 'ln=63,r=8,p=1', parts[2], parts[3]].join('$');
    await expect(verifyPassword('whatever-123', poisoned)).resolves.toBe(false);
  });

  it('control negativo: manipular el derivado invalida la verificación', async () => {
    const hash = await hashPassword('tamper-me');
    const parts = hash.split('$');
    // Voltea un byte del derivado: debe dejar de verificar.
    const derived = Buffer.from(parts[3]!, 'base64');
    derived[0] = derived[0]! ^ 0xff;
    const tampered = [parts[0], parts[1], parts[2], derived.toString('base64')].join('$');
    expect(await verifyPassword('tamper-me', tampered)).toBe(false);
  });
});
