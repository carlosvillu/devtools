// Regla 8 del planning: la cláusula determinista de la Verificación de T0.1
// («/api/health devuelve {ok:true}») se queda como test permanente dentro de
// `pnpm gate`, no solo como un curl one-shot del verifier.
import { describe, expect, it } from 'vitest';
import { HealthSchema } from '@app/core/contracts';
import { GET } from './route';

describe('GET /api/health', () => {
  it('devuelve {ok:true} con 200', async () => {
    const res = await GET(new Request('http://localhost:3000/api/health'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('la respuesta cumple el contrato HealthSchema de @app/core', async () => {
    const res = await GET(new Request('http://localhost:3000/api/health'));

    expect(HealthSchema.safeParse(await res.json()).success).toBe(true);
  });

  // NO hay aquí un test de «/api/health es público (D6)»: llamando a GET directo
  // no pasa por el middleware, así que no podría cazar que T0.4 lo protegiera por
  // error — sería cobertura falsa de una decisión de producto. El guardián real
  // de D6 (incluido «/ sin sesión responde 200») lo escribe T0.4, que ya lo tiene
  // asignado en su línea de Playwright permanente.
});
