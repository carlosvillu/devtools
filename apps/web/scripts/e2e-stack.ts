// Stack E2E de apps/web — lo lanza Playwright como `webServer` (playwright.config.ts) vía
// `pnpm exec tsx scripts/e2e-stack.ts`, y también a mano con `pnpm e2e:stack`. Arranca el
// sistema y solo abre el puerto cuando está listo; Playwright espera por él.
//
// SCOPE T0.4 — el stack CRECE con Postgres: el auth (login/signup/logout) y el guardián de
// D6 (`/history` → `/login`) necesitan BD. Orden de testing/references/e2e.md §2: Postgres
// (testcontainer) → migraciones (en la template) → clon aislado → web. NO se toca la BD de
// PRODUCCIÓN (Testcontainers levanta su propio contenedor desechable). `/` y `/api/analyze`
// siguen siendo públicos y sin BD (D6). Se ejecuta con tsx (no node): `@app/test-utils` es
// TS consumido sin build.
//
// Por defecto sirve el BUILD DE PRODUCCIÓN (`next build` + `next start`): `next start` no
// resuelve rutas igual que `next dev`, y la suite/verifier deben ejercitar lo que se
// despliega. `E2E_DEV=1` cae a `next dev` para iterar rápido en local.
import { spawn, spawnSync } from 'node:child_process';
import { createTestDatabase, startPostgresContainer } from '@app/test-utils';

// Puerto 3118 por defecto (no 3100): en el VPS del bucle el 3100 lo ocupa el vecino
// `ugc.carlosvillu.dev`. 3118 vive en el bloque de devtools (3110–3119). Playwright pasa
// `PORT` explícito vía `webServer.env`; este default cubre el arranque manual.
const PORT = process.env.PORT ?? '3118';
const dev = process.env.E2E_DEV === '1';

// 1) Postgres real y desechable + migraciones aplicadas a la template.
const pg = await startPostgresContainer();
// 2) Clon aislado de la template (ya migrado): la BD que verá la web.
const { connectionString } = await createTestDatabase({
  label: 'e2e',
  serverUri: pg.serverUri,
  templateDb: pg.templateDb,
});

const env = {
  ...process.env,
  PORT,
  DATABASE_URL: connectionString,
  // El stack corre `next start` (NODE_ENV=production) SOBRE HTTP en loopback: sin esto la
  // cookie de sesión iría `Secure` y el navegador no la mandaría → el login E2E rompería.
  // En un deploy real (con TLS) esta env NO se pone y la cookie SÍ es Secure.
  COOKIE_SECURE: 'false',
};

if (!dev) {
  const build = spawnSync('pnpm', ['exec', 'next', 'build'], { stdio: 'inherit', env });
  if (build.status !== 0) {
    await pg.stop();
    process.exit(build.status ?? 1);
  }
}

const args = dev ? ['exec', 'next', 'dev', '-p', PORT] : ['exec', 'next', 'start', '-p', PORT];
const server = spawn('pnpm', args, { stdio: 'inherit', env });

let stopping = false;
const shutdown = async (code: number): Promise<void> => {
  if (stopping) return;
  stopping = true;
  try {
    await pg.stop();
  } finally {
    process.exit(code);
  }
};

server.on('exit', (code) => void shutdown(code ?? 0));

// Reenvío de señales: cuando Playwright mata el webServer, apagamos Next y el contenedor.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.kill(signal);
    void shutdown(0);
  });
}
