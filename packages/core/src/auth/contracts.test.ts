import { describe, expect, it } from 'vitest';
import { LoginSchema, SignupSchema, AuthResponseSchema } from './contracts';

describe('SignupSchema', () => {
  it('acepta email + contraseña de ≥8 caracteres y recorta el email', () => {
    const r = SignupSchema.safeParse({ email: '  Carlos@Dev.LOCAL ', password: '12345678' });
    expect(r.success).toBe(true);
    // el email se recorta (la normalización a minúsculas la hace el repo)
    expect(r.data?.email).toBe('Carlos@Dev.LOCAL');
  });

  it('rechaza una contraseña de menos de 8 caracteres', () => {
    const r = SignupSchema.safeParse({ email: 'a@b.com', password: '1234567' });
    expect(r.success).toBe(false);
  });

  it('rechaza un email con formato inválido', () => {
    const r = SignupSchema.safeParse({ email: 'no-arroba', password: '12345678' });
    expect(r.success).toBe(false);
  });
});

describe('LoginSchema', () => {
  it('acepta cualquier contraseña no vacía (no revela la política de longitud)', () => {
    const r = LoginSchema.safeParse({ email: 'a@b.com', password: 'x' });
    expect(r.success).toBe(true);
  });

  it('rechaza una contraseña vacía', () => {
    const r = LoginSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(r.success).toBe(false);
  });
});

describe('AuthResponseSchema', () => {
  it('valida un usuario con id uuid y email', () => {
    const r = AuthResponseSchema.safeParse({
      user: { id: '00000000-0000-4000-8000-000000000000', email: 'a@b.com' },
    });
    expect(r.success).toBe(true);
  });

  it('rechaza un id que no es uuid', () => {
    const r = AuthResponseSchema.safeParse({ user: { id: 'nope', email: 'a@b.com' } });
    expect(r.success).toBe(false);
  });
});
