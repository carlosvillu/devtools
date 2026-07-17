import { describe, expect, it } from 'vitest';
import { HealthSchema } from './health';

describe('HealthSchema', () => {
  it('acepta la respuesta del healthcheck', () => {
    expect(HealthSchema.parse({ ok: true })).toEqual({ ok: true });
  });

  it('rechaza un healthcheck que no esté ok: `ok` es literal true, no un boolean', () => {
    expect(HealthSchema.safeParse({ ok: false }).success).toBe(false);
    expect(HealthSchema.safeParse({}).success).toBe(false);
  });
});
