// Un clon aislado de la template por suite (testing/db-integration.md §3).
// `CREATE DATABASE … TEMPLATE` es una copia a nivel de ficheros (~decenas de ms):
// cada clon nace en el estado exacto post-migraciones, y el aislamiento entre
// ficheros de test es por construcción (paralelismo de workers gratis).
import { randomBytes } from 'node:crypto';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Client, Pool } from 'pg';
import { inject } from 'vitest';
import * as schema from '@app/db/schema';
import { withDatabaseName } from './postgres-container';

// La augmentación de ProvidedContext se declara también aquí (además de en
// global-setup.ts) porque este es el fichero que consume `inject()` y a menudo se
// importa SIN global-setup en el programa (p. ej. el typecheck de @app/db).
// TS fusiona las declaraciones idénticas (declaration merging).
declare module 'vitest' {
  export interface ProvidedContext {
    pgServerUri: string;
    pgTemplateDb: string;
  }
}

export type DrizzleDb = NodePgDatabase<typeof schema>;

export interface TestDatabase {
  db: DrizzleDb;
  pool: Pool;
  connectionString: string;
  close: () => Promise<void>;
}

// Clave arbitraria pero fija: serializa los CREATE DATABASE … TEMPLATE. Distinta
// de la del runner de migraciones (MIGRATION_LOCK_KEY = 724_100).
const CLONE_LOCK_KEY = 724_001;

/**
 * Clona la template en una BD nueva y aislada. Dentro de vitest no pases
 * serverUri/templateDb: se leen vía inject(), nunca de env. Los overrides existen
 * para scripts FUERA de vitest.
 */
export async function createTestDatabase(opts?: {
  label?: string;
  serverUri?: string;
  templateDb?: string;
}): Promise<TestDatabase> {
  const serverUri = opts?.serverUri ?? inject('pgServerUri');
  const templateDb = opts?.templateDb ?? inject('pgTemplateDb');
  const name = `test_${randomBytes(6).toString('hex')}`;

  const admin = new Client({ connectionString: serverUri });
  await admin.connect();
  // Postgres no permite clonar una template mientras otra clonación la tiene
  // abierta, y los workers paralelos clonan a la vez: el advisory lock serializa
  // el CREATE y el retry cubre sesiones rezagadas (55006).
  await admin.query('SELECT pg_advisory_lock($1)', [CLONE_LOCK_KEY]);
  try {
    for (let attempt = 1; ; attempt++) {
      try {
        // Identificador generado aquí (hex), jamás input externo: la
        // interpolación en el DDL es segura (CREATE DATABASE no acepta $1).
        await admin.query(`CREATE DATABASE ${name} TEMPLATE ${templateDb}`);
        break;
      } catch (err) {
        if ((err as { code?: string }).code !== '55006' || attempt >= 5) throw err;
        await new Promise((r) => setTimeout(r, 100 * attempt));
      }
    }
  } finally {
    await admin.query('SELECT pg_advisory_unlock($1)', [CLONE_LOCK_KEY]);
  }

  const connectionString = withDatabaseName(serverUri, name);
  const pool = new Pool({
    connectionString,
    max: 5,
    application_name: opts?.label ?? 'app-test-db',
  });
  // pg exige un listener de `error` en el pool: un cliente IDLE cuya conexión se
  // corta emite un error asíncrono y, sin listener, se convierte en
  // unhandledRejection que tumba el run. En el teardown, el `DROP DATABASE …
  // WITH (FORCE)` termina cualquier backend que sobreviva al `pool.end()` (race
  // benigno) con 57P01: se traga aquí a propósito.
  pool.on('error', () => undefined);
  const db = drizzle(pool, { schema });

  return {
    db,
    pool,
    connectionString,
    close: async () => {
      await pool.end();
      // WITH (FORCE) (PG13+) mata sesiones filtradas: un leak dentro de la suite
      // no bloquea la limpieza ni deja BDs zombis.
      await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await admin.end();
    },
  };
}
