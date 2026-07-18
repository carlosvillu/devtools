// Accessor lazy de la BD con override para tests (testing/api.md §2.1, backend/api.md §3).
// Importar un route handler NO debe abrir una conexión ni leer env: si `route.ts`
// conectara en module scope, el test no podría redirigir la BD al test database. La
// forma exacta de este par (`getDb`/`setDbForTests`) la fija la skill testing — es
// contrato del harness, no se "mejora".
import { createDb, type Db } from '@app/db';

let override: Db | undefined;
let fromEnv: Db | undefined;

/** Solo para tests. En producción nunca se llama. Pasar `undefined` lo limpia. */
export function setDbForTests(db: Db | undefined): void {
  override = db;
}

export function getDb(): Db {
  if (override) return override;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL no está definida');
  fromEnv ??= createDb(url);
  return fromEnv;
}
