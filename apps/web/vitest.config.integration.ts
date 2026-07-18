// Proyecto de integración de apps/web (testing/api.md §2, nivel 1 handler-level).
// Ejecuta los route handlers exportados contra un Postgres real de Testcontainers, con
// la BD inyectada vía `setDbForTests`. Solo este config declara el globalSetup del
// contenedor (mismo patrón que packages/db/vitest.config.integration.ts): los proyectos
// unit no lo declaran, así que jamás arrancan Postgres.
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { defineConfig } from 'vitest/config';

// Vitest 4 resuelve el path de globalSetup relativo al root del proyecto: un
// especificador bare acabaría como `apps/web/@app/...`. Se resuelve a ruta absoluta
// vía el package export (idéntico a @app/db).
const require = createRequire(import.meta.url);
const globalSetupPath = require.resolve('@app/test-utils/global-setup');

export default defineConfig({
  test: {
    name: 'web:integration',
    include: ['test/integration/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'e2e/**'],
    environment: 'node',
    setupFiles: ['@app/test-utils/setup-env'],
    globalSetup: [globalSetupPath],
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
