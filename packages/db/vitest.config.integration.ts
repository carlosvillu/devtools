// Proyecto de integración de @app/db (testing/db-integration.md §2). Solo este
// tipo de config declara el globalSetup del contenedor: los proyectos unit no lo
// declaran, así que jamás arrancan Postgres. La connection string llega por
// inject() desde el globalSetup, nunca por env.
import { createRequire } from 'node:module';
import { defineConfig } from 'vitest/config';

// Vitest 4 resuelve el path de globalSetup relativo al root del proyecto, NO por
// resolución de módulos de node: un especificador bare (`@app/test-utils/...`)
// acabaría como `packages/db/@app/...` y no existe. Se resuelve a ruta absoluta
// vía el package export. (La skill avisa: ajustar el import al actualizar Vitest.)
const require = createRequire(import.meta.url);
const globalSetupPath = require.resolve('@app/test-utils/global-setup');

export default defineConfig({
  test: {
    name: 'db:integration',
    include: ['test/integration/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
    environment: 'node',
    globalSetup: [globalSetupPath],
    // El arranque del contenedor + migraciones se paga una vez por run.
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
