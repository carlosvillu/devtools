// Sonda MÍNIMA de conectividad con Postgres para `GET /api/health` (T0.2).
//
// SCOPE: esto NO es el `getDb()` de la app. Drizzle, el esquema de §9 y el
// accessor canónico `getDb()/setDbForTests()` llegan en T0.3 (api.md §3, db.md).
// Cuando existan, esta sonda se UNIFICA con ese pool (un solo `pg.Pool` para la
// app) y este módulo desaparece o pasa a apoyarse en `getDb()`. Hoy es lo justo
// para que `/api/health` distinga «la BD responde» de «no responde», sin adelantar
// trabajo de T0.3.
//
// Contrato con la skill testing (api.md §3): importar este módulo JAMÁS abre una
// conexión ni lee env — el pool se crea perezosamente en el primer chequeo. Así el
// test inyecta la sonda con `setDbHealthProbeForTests()` sin tocar Postgres, y en
// T0.3 el harness de Testcontainers podrá redirigir la conexión.
import { Pool } from 'pg';
import { getRequestLogger } from './request-context';

/** Resultado de una sonda de BD: contestó (true) o no (false). NUNCA lanza. */
export type DbHealthProbe = () => Promise<boolean>;

let override: DbHealthProbe | undefined;
let pool: Pool | undefined;

/**
 * Test seam: inyecta una sonda determinista (true/false/lanza) sin Postgres real.
 * `undefined` restaura la sonda real. Espejo del molde `getX/setXForTests` (api.md §3),
 * adaptado a que en T0.2 aún no hay un `Db` que inyectar, solo el booleano de salud.
 */
export function setDbHealthProbeForTests(probe: DbHealthProbe | undefined): void {
  override = probe;
}

/**
 * Pool perezoso. `connectionTimeoutMillis` acotado: con Postgres caído, adquirir
 * conexión debe fallar PRONTO (si no, el `curl` de la Verificación se cuelga en el
 * timeout TCP por defecto y se lee como fallo). `DATABASE_URL` ausente ⇒ `pg` usa
 * los defaults de libpq/PG* y falla igual de rápido: en ambos casos la salida es
 * `db:false`, nunca una excepción que escape.
 */
function getPool(): Pool {
  return (pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 2000,
    // Un solo cliente basta para un `SELECT 1`; no acaparamos conexiones del vecino.
    max: 1,
    // Sin reintentos infinitos de idle: la sonda es puntual.
    idleTimeoutMillis: 5000,
    allowExitOnIdle: true,
  }));
}

/**
 * Sonda real: un `SELECT 1`. Devuelve `true` si Postgres contesta, `false` ante
 * CUALQUIER fallo (BD caída, `DATABASE_URL` ausente, timeout, credenciales malas).
 * Traga todos los errores a propósito: quien llama necesita un booleano, no una
 * excepción — si esto lanzara, `withRoute` lo mapearía a un 500 y tumbaría la
 * respuesta de salud (§11: se loguea solo `err_name`, nunca detalle que pueda
 * llevar la connection string).
 */
async function realProbe(): Promise<boolean> {
  try {
    await getPool().query('SELECT 1');
    return true;
  } catch (err) {
    const errName = err instanceof Error ? err.name : 'UnknownError';
    getRequestLogger().warn({ err_name: errName }, 'db_health_probe_failed');
    return false;
  }
}

/** Punto de entrada de la ruta. Nunca lanza: siempre resuelve a un booleano. */
export async function checkDbConnection(): Promise<boolean> {
  const probe = override ?? realProbe;
  try {
    return await probe();
  } catch {
    // Red de seguridad: incluso una sonda inyectada que lance se traduce a `false`,
    // de modo que la ruta jamás depende de que el llamante «se porte bien».
    return false;
  }
}
