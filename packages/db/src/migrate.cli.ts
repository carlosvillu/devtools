// CLI del runner de migraciones: `pnpm --filter @app/db db:migrate` (y el script
// raíz `pnpm db:migrate`). Aplica el schema a la BD de `DATABASE_URL`.
//
// SEGURIDAD (VPS compartido): `DATABASE_URL` es OBLIGATORIA. Si falta, se ABORTA
// — jamás se cae a los defaults de libpq/PG*, que en esta máquina podrían
// conectar a una BD no intencionada. La connection string no se loguea (§11).
import { runMigrations } from './migrate';

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      'db:migrate — falta DATABASE_URL. Exporta la connection string de la BD ' +
        'destino (p. ej. la de dev en 127.0.0.1:5433) antes de migrar.',
    );
    process.exit(1);
  }

  await runMigrations(connectionString);
  console.log('db:migrate — migraciones aplicadas.');
}

main().catch((err: unknown) => {
  // Solo el nombre/mensaje del error, nunca la connection string.
  console.error('db:migrate — falló:', err instanceof Error ? err.message : err);
  process.exit(1);
});
