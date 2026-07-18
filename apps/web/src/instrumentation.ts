// instrumentation.ts — hook de arranque de Next (se ejecuta una vez al iniciar el
// servidor). Cablea las migraciones ON-BOOT de @app/db (T0.3): cada deploy self-migra,
// de forma idempotente y bajo el advisory lock ya incluido en `runMigrations`.
//
// ADELANTO DE ALCANCE JUSTIFICADO (originalmente T3.1): T0.3 decidió migraciones
// on-boot y T1.8 ya construyó la infra de prod ASUMIÉNDOLO. Como F1 está LIVE y el auth
// de T0.4 necesita las tablas `user`/`session` en runtime, se cablea aquí para que el
// deploy de auth deje producción usable sin un paso de migración manual.
//
// ⚠ CARPETA DE MIGRACIONES BUNDLE-SAFE: `runMigrations` sin argumento se autolocaliza con
// `require.resolve('@app/db/package.json')`, PERO el bundler de Next reescribe ese literal
// a un id numérico de módulo → `path.dirname(number)` = TypeError. Por eso aquí se calcula
// la carpeta en runtime probando ubicaciones candidatas (sin `require.resolve`) y se pasa
// EXPLÍCITA. Candidatas por layout: MIGRATIONS_DIR (override de deploy), la del monorepo
// desde apps/web (`next start`/`next dev`), desde la raíz del repo, y `drizzle` junto al
// cwd (standalone que copie la carpeta). Se elige la primera que contenga `meta/_journal.json`.
//
// NO TUMBA EL BOOT ante un fallo transitorio de BD (misma filosofía que la sonda de salud
// de T0.2): `/` y `/api/analyze` son públicas y no dependen de Postgres (D6), así que un
// Postgres que tarda no debe derribar el producto público entero. Reintento acotado; si aún
// falla, se registra con claridad y el server ARRANCA igual — `/api/health` reportará
// `db:false` y el próximo boot/deploy reintenta.
//
// §11: nunca se loguea la `DATABASE_URL` (lleva credenciales).
// RUIDO CONOCIDO EN DEV (medido, no supuesto): Next compila también este fichero para el
// runtime Edge, así que cada arranque escupe 5 bloques «Ecmascript file had an error» — 2
// por los imports `node:*` y 3 por los `process.cwd()` de aquí abajo. Es INOCUO (el guard
// `NEXT_RUNTIME` impide que la rama Node corra en Edge) y NO afecta a build ni a prod.
// Se intentó silenciarlo pasando los imports a `await import(...)` dentro de la función y
// **no funcionó**: Turbopack analiza el cuerpo ESTÁTICAMENTE, los 5 bloques seguían ahí
// idénticos (verificado en T0.4, addendum delta 2). Se revirtió por no pagar una función
// asíncrona a cambio de nada. La causa real es que Next incluya este fichero en el grafo
// Edge; atacarlo exigiría sacar la resolución de carpeta a un módulo que ese grafo no
// alcance. No se toca hasta que moleste de verdad.
import { existsSync } from 'node:fs';
import path from 'node:path';

function resolveMigrationsFolder(): string | undefined {
  const candidates = [
    process.env.MIGRATIONS_DIR,
    path.resolve(process.cwd(), '../../packages/db/drizzle'), // next start/dev desde apps/web
    path.resolve(process.cwd(), 'packages/db/drizzle'), // desde la raíz del repo
    path.resolve(process.cwd(), 'drizzle'), // standalone con la carpeta copiada al cwd
  ].filter((c): c is string => Boolean(c));
  return candidates.find((c) => existsSync(path.join(c, 'meta', '_journal.json')));
}

export async function register(): Promise<void> {
  // Solo en el runtime Node del server (no en Edge ni durante el build de páginas).
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('instrumentation: DATABASE_URL ausente; se omiten las migraciones on-boot');
    return;
  }

  const migrationsFolder = resolveMigrationsFolder();
  if (!migrationsFolder) {
    console.error(
      'instrumentation: no se encontró la carpeta de migraciones (probadas MIGRATIONS_DIR y ' +
        'rutas relativas al cwd); se omiten las migraciones on-boot. Define MIGRATIONS_DIR.',
    );
    return;
  }

  const { runMigrations } = await import('@app/db');

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await runMigrations(connectionString, migrationsFolder);
      console.info(`instrumentation: migraciones on-boot aplicadas (intento ${String(attempt)})`);
      return;
    } catch (err) {
      const name = err instanceof Error ? err.name : 'UnknownError';
      if (attempt === maxAttempts) {
        // Falla CON CLARIDAD pero sin lanzar: el server arranca y sirve lo público.
        console.error(
          `instrumentation: migraciones on-boot fallaron tras ${String(maxAttempts)} intentos (err_name=${name}); ` +
            'el server arranca igual, /api/health reportará db:false y el próximo boot reintenta',
        );
        return;
      }
      const backoffMs = Math.min(250 * 2 ** (attempt - 1), 4000);
      console.warn(
        `instrumentation: migración on-boot falló (intento ${String(attempt)}/${String(maxAttempts)}, err_name=${name}); ` +
          `reintento en ${String(backoffMs)}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}
