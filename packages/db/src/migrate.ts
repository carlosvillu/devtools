// Runner de migraciones con lock (backend/db.md §3).
//
// DECISIÓN (T0.3, PRD §9): las migraciones corren ON-BOOT con lock, no como paso
// de deploy. Motivo: CONSISTENCIA con la infra de prod ya construida en T1.8
// (`docker-compose.prod.yml` + skill `deploy` asumen migraciones-on-boot; el
// `start_period` del healthcheck ya da margen al primer boot). Esta función es la
// pieza reutilizable: el cableado al arranque de la web es T3.1; el CLI
// (`migrate.cli.ts`, script `db:migrate`) la ejerce ya.
import path from 'node:path';
import { createRequire } from 'node:module';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';

// Constante propia del proyecto; distinta de las claves del harness de tests
// (CLONE_LOCK_KEY = 724_001) para no interferir jamás.
const MIGRATION_LOCK_KEY = 724_100;

/**
 * Aplica todas las migraciones pendientes de `packages/db/drizzle/` bajo un
 * advisory lock de sesión. Si dos procesos arrancan a la vez (deploy, restart de
 * compose), solo uno migra; el otro espera y encuentra el schema ya al día. Sin
 * el lock, migraciones concurrentes = corrupción.
 */
export async function runMigrations(connectionString: string): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    const require = createRequire(import.meta.url);
    await migrate(drizzle(client), {
      // Resuelta respecto al paquete, NUNCA process.cwd(): el CLI puede
      // ejecutarse desde cualquier directorio del monorepo.
      migrationsFolder: path.join(path.dirname(require.resolve('@app/db/package.json')), 'drizzle'),
    });
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    await client.end();
  }
}
