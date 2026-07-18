// Stack E2E de apps/web — lo lanza Playwright como `webServer` (playwright.config.ts) vía
// `pnpm exec tsx scripts/e2e-stack.ts`, y también se puede lanzar a mano con `pnpm e2e:stack`.
// Arranca el sistema y solo abre el puerto 3100 cuando está listo; Playwright espera por él.
//
// SCOPE T1.5 — stack MÍNIMO a propósito: `/` y `POST /api/analyze` son públicos (D6) y NO
// tocan base de datos ni auth, así que aquí solo se levanta Next. Cuando F0 traiga Postgres,
// migraciones, seeds y auth, este script CRECE con el testcontainer + `seedFixtures` + los
// fakes de APIs externas en el orden que fija testing/references/e2e.md §2 (Postgres →
// migraciones → seed → web) SIN cambiar su contrato con Playwright (readiness por puerto 3100).
// Se ejecuta con tsx (no node) porque ese futuro `@app/test-utils` es TS consumido sin build.
//
// Por defecto sirve el BUILD DE PRODUCCIÓN (`next build` + `next start`): `next start` no
// resuelve rutas igual que `next dev`, y la suite/verifier deben ejercitar lo que se despliega.
// `E2E_DEV=1` cae a `next dev` para iterar rápido en local.
import { spawn, spawnSync } from 'node:child_process';

// Puerto 3118 por defecto (no 3100): en el VPS del bucle el 3100 lo ocupa el vecino
// `ugc.carlosvillu.dev`. 3118 vive en el bloque de devtools (3110–3119). Playwright pasa
// `PORT` explícito vía `webServer.env`; este default cubre el arranque manual (`pnpm e2e:stack`).
const PORT = process.env.PORT ?? '3118';
const dev = process.env.E2E_DEV === '1';
const env = { ...process.env, PORT };

if (!dev) {
  const build = spawnSync('pnpm', ['exec', 'next', 'build'], { stdio: 'inherit', env });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const args = dev ? ['exec', 'next', 'dev', '-p', PORT] : ['exec', 'next', 'start', '-p', PORT];
const server = spawn('pnpm', args, { stdio: 'inherit', env });
server.on('exit', (code) => process.exit(code ?? 0));

// Reenvío de señales: cuando Playwright mata el webServer, apagamos el hijo Next.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.kill(signal));
}
