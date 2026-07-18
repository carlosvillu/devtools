import { describe, expect, it } from 'vitest';
import { HealthSchema } from './health';

describe('HealthSchema', () => {
  it('acepta la respuesta del healthcheck con la BD arriba', () => {
    expect(HealthSchema.parse({ ok: true, db: true })).toEqual({ ok: true, db: true });
  });

  it('acepta la respuesta con la BD caída (`db:false` es un estado válido, no un error)', () => {
    expect(HealthSchema.parse({ ok: true, db: false })).toEqual({ ok: true, db: false });
  });

  it('rechaza un healthcheck que no esté ok: `ok` es literal true, no un boolean', () => {
    expect(HealthSchema.safeParse({ ok: false, db: true }).success).toBe(false);
    expect(HealthSchema.safeParse({}).success).toBe(false);
  });

  it('exige `db`: una respuesta sin el campo de BD ya no cumple el contrato de T0.2', () => {
    expect(HealthSchema.safeParse({ ok: true }).success).toBe(false);
    expect(HealthSchema.safeParse({ ok: true, db: 'yes' }).success).toBe(false);
  });
});
