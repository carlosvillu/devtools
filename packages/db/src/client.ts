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

/** Conveniencia: pool interno a partir de una connection string. Lo usan el
 *  accessor `getDb()` de la web (T3.1) y los scripts que abren su propia
 *  conexión. Los tests de integración inyectan el `db` del harness, no esto. */
export function createDb(connectionString: string): DbClient {
  return makeDb(new Pool({ connectionString }));
}
