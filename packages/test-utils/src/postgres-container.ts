// Harness de Postgres real para tests de integración (testing/db-integration.md
// §2). Un contenedor por run → una template migrada → N clones por suite.
//
// Nada de mocks ni SQLite (decisión vinculante de la skill): el producto depende
// de comportamiento específico de Postgres 16 (índices UNIQUE funcionales,
// `ON DELETE`, JSONB) y un doble no falla donde Postgres falla.
import { createRequire } from 'node:module';
import path from 'node:path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';

const TEMPLATE_DB = 'app_template';

export async function startPostgresContainer(): Promise<{
  serverUri: string;
  templateDb: string;
  stop: () => Promise<void>;
}> {
  const container = await new PostgreSqlContainer('postgres:16')
    .withDatabase('postgres')
    .withEnvironment({ TZ: 'UTC', PGTZ: 'UTC' })
    // Datos desechables: sin fsync todo el run va notablemente más rápido.
    .withCommand([
      'postgres',
      '-c',
      'fsync=off',
      '-c',
      'synchronous_commit=off',
      '-c',
      'full_page_writes=off',
    ])
    .start();

  const serverUri = container.getConnectionUri();

  // 1) Crear la template y aplicarle las migraciones reales del producto.
  const admin = new Client({ connectionString: serverUri });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${TEMPLATE_DB}`);

  const migrator = new Client({
    connectionString: withDatabaseName(serverUri, TEMPLATE_DB),
  });
  await migrator.connect();
  // Ruta resuelta respecto al paquete @app/db, NUNCA process.cwd().
  const require = createRequire(import.meta.url);
  await migrate(drizzle(migrator), {
    migrationsFolder: path.join(path.dirname(require.resolve('@app/db/package.json')), 'drizzle'),
  });
  // 2) CERRAR la conexión: CREATE DATABASE … TEMPLATE exige CERO conexiones
  //    activas a la BD origen.
  await migrator.end();

  // 3) Blindaje contra conexiones accidentales (mismo truco que template0):
  //    datallowconn=false sigue siendo clonable como template.
  await admin.query(`UPDATE pg_database SET datallowconn = false WHERE datname = '${TEMPLATE_DB}'`);
  await admin.end();

  return {
    serverUri,
    templateDb: TEMPLATE_DB,
    stop: async () => {
      await container.stop();
    },
  };
}

export function withDatabaseName(uri: string, dbName: string): string {
  const url = new URL(uri);
  url.pathname = `/${dbName}`;
  return url.toString();
}
