// vitest.config.ts (raíz del monorepo — testing/references/stack-setup.md §3.1)
// Cada paquete aporta su proyecto unit (`vitest.config.ts`) y, cuando toque
// Postgres, otro de integración (`vitest.config.integration.ts`, desde T0.3).
// `vitest.workspace.ts`/`defineWorkspace` está eliminado en Vitest 4: la forma
// canónica es `test.projects`.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      '{packages,apps}/*/vitest.config.ts',
      '{packages,apps}/*/vitest.config.integration.ts',
      // Sin proyecto `live`: el PRD (D8) descarta APIs de pago — no hay nada que gastar.
    ],
  },
});
