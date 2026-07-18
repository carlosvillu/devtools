// Regla 8 del planning: las cláusulas deterministas de la Verificación de T0.2
// («/api/health devuelve {ok:true, db:true}» con la BD arriba y «{ok:true, db:false}
// sin tumbar la app» con la BD caída) quedan como test permanente dentro de
// `pnpm gate`, no solo como un curl one-shot del verifier.
//
// La conectividad real con Postgres se inyecta con `setDbHealthProbeForTests`: este
// test es UNIT (sin BD real) — el roundtrip contra un Postgres de verdad llega con
// Testcontainers en T0.3. Aquí se prueba la LÓGICA de la ruta: mapear el booleano de
// la sonda al cuerpo, y no romper nunca aunque la sonda falle.
import { afterEach, describe, expect, it } from 'vitest';
import { HealthSchema } from '@app/core/contracts';
import { setDbHealthProbeForTests } from '@/server/db-health';
import { GET } from './route';

describe('GET /api/health', () => {
  afterEach(() => {
    setDbHealthProbeForTests(undefined); // restaura la sonda real entre tests
  });

  it('con la BD arriba devuelve {ok:true, db:true} y 200', async () => {
    setDbHealthProbeForTests(() => Promise.resolve(true));

    const res = await GET(new Request('http://localhost:3000/api/health'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: true });
  });

  it('con la BD caída devuelve {ok:true, db:false} y 200, sin tumbar la app', async () => {
    setDbHealthProbeForTests(() => Promise.resolve(false));

    const res = await GET(new Request('http://localhost:3000/api/health'));

    expect(res.status).toBe(200); // la web SIGUE sirviendo: no es un 500
    expect(await res.json()).toEqual({ ok: true, db: false });
  });

  it('si la sonda lanza, la ruta degrada a db:false (nunca un 500)', async () => {
    setDbHealthProbeForTests(() => Promise.reject(new Error('boom interno')));

    const res = await GET(new Request('http://localhost:3000/api/health'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: false });
  });

  it('la respuesta cumple el contrato HealthSchema de @app/core', async () => {
    setDbHealthProbeForTests(() => Promise.resolve(true));

    const res = await GET(new Request('http://localhost:3000/api/health'));

    expect(HealthSchema.safeParse(await res.json()).success).toBe(true);
  });

  // NO hay aquí un test de «/api/health es público (D6)»: llamando a GET directo
  // no pasa por el middleware, así que no podría cazar que T0.4 lo protegiera por
  // error — sería cobertura falsa de una decisión de producto. El guardián real
  // de D6 (incluido «/ sin sesión responde 200») lo escribe T0.4, que ya lo tiene
  // asignado en su línea de Playwright permanente.
});
