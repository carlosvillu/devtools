import { defineConfig, devices } from '@playwright/test';

// Config E2E de apps/web (testing/references/e2e.md §3). Chromium únicamente (el PRD no pide
// cross-browser). El `webServer` arranca el stack (scripts/e2e-stack.ts) y Playwright espera
// por el puerto 3100.
//
// SCOPE T1.5: sin el `setup` project de auth (el módulo auth llega con F0: la reference marca
// ese project como «solo si el módulo auth existe») y sin `storageState` — `/` es pública.
// Cuando F0 traiga login, se añade el project `setup` + `storageState` sin tocar esta base.
//
// PUERTO 3118 (no el 3100 de la reference): este bucle corre EN el VPS, donde el vecino
// `ugc.carlosvillu.dev` ya ocupa el 127.0.0.1:3100 — arrancar ahí reutilizaría su servidor y
// la suite testearía OTRA app. 3118 está dentro del bloque asignado a devtools (3110–3119,
// deploy.env / ~/AGENTS.md) y separado del puerto de producción (3110 = WEB_PORT).
const PORT = process.env.E2E_PORT ?? '3118';
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-testid',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm exec tsx scripts/e2e-stack.ts',
    env: { PORT },
    port: Number(PORT),
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
