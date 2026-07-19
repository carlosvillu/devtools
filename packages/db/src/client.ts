// Cliente Drizzle sobre node-postgres (backend/db.md §4).
//
// El alias `Db` (conexión | transacción) se declara UNA vez; el tipo de la tx se
// DERIVA del callback de `transaction()` para no depender de los generics
// internos de Drizzle, que cambian entre versiones.
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type DbClient = NodePgDatabase<typeof schema>;
export type DbTx = Parameters<Parameters<DbClient['transaction']>[0]>[0];
export type Db = DbClient | DbTx;

/** Bajo nivel: quien posee el pool lo pasa y lo cierra en su shutdown. */
export function makeDb(pool: Pool): DbClient {
  return drizzle(pool, { schema });
}

/**
 * Timeouts de CLIENTE del pool. Sin ellos, node-postgres espera INDEFINIDAMENTE
 * (`connectionTimeoutMillis` por defecto es `0`) y una BD que acepta la conexión pero
 * **nunca responde** —congelada, no caída— cuelga a quien la espere para siempre.
 *
 * Por qué de cliente y no `statement_timeout`: `statement_timeout` lo aplica el SERVIDOR,
 * así que un servidor congelado no puede dispararlo. Son dos huecos distintos y hacen
 * falta los dos:
 *   · `connectionTimeoutMillis` → acota ABRIR/adquirir una conexión (pool frío).
 *   · `query_timeout`           → acota una consulta YA EN VUELO sobre una conexión del
 *                                 pool ya abierta (pool caliente). Este es el que salva
 *                                 el caso «BD congelada» de verdad.
 *
 * Medido en T2.1 (verifier, con `docker pause` sobre Postgres): sin estos timeouts,
 * CUALQUIER petición con cookie a `/api/analyze` —endpoint PÚBLICO— se colgaba >25 s, y
 * la disparaba un anónimo con solo mandar una cookie cualquiera. Eso rompe D6 («`/` y
 * `/api/analyze` no dependen de la BD»). Acotarlo aquí, en el pool, protege a TODOS los
 * consumidores (login, signup, `validateSession`, historial) en vez de parchear uno.
 *
 * NO afecta a las migraciones: `runMigrations` abre su propio `Client` (migrate.ts), no
 * este pool — una migración larga no puede abortar por estos timeouts.
 */
const CONNECTION_TIMEOUT_MS = 5_000;
const QUERY_TIMEOUT_MS = 5_000;

/** Conveniencia: pool interno a partir de una connection string. Lo usan el
 *  accessor `getDb()` de la web (T3.1) y los scripts que abren su propia
 *  conexión. Los tests de integración inyectan el `db` del harness, no esto. */
export function createDb(connectionString: string): DbClient {
  return makeDb(
    new Pool({
      connectionString,
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
      query_timeout: QUERY_TIMEOUT_MS,
    }),
  );
}
