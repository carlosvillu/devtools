import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'web:unit',
    // `.tsx` incluido: TD y F1 traen componentes React, cuyos tests se llaman
    // `algo.test.tsx`. Con `*.test.ts` a secas ningún proyecto los recogería,
    // vitest no protestaría y el gate seguiría verde con el test sin ejecutar.
    // (El `environment` que necesiten esos tests de componente —jsdom— es una
    // decisión de la tarea que los estrene, no de T0.1.)
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', 'e2e/**'],
    environment: 'node',
    setupFiles: ['@app/test-utils/setup-env'],
  },
  resolve: {
    // `@/` → src/, igual que el tsconfig de web: Vitest no lee los paths de tsc.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
