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
    // El proyecto corre en `node`. TD.1 estrenó UN test de componente
    // (theme-switcher.test.tsx) que necesita DOM y monta jsdom POR-FICHERO con el
    // pragma `// @vitest-environment jsdom` — mínimo a propósito: su única aserción
    // es `getByRole` + estado de `document.documentElement`, sin matchers de jest-dom
    // ni mocks de layout.
    //
    // TD.2 (primeras primitivas del DS sobre Base UI): DEBE establecer el setup jsdom
    // A NIVEL DE PROYECTO que prescribe testing/references/frontend.md §2 —
    // `environment: 'jsdom'` aquí + un `vitest.setup.ts` con los matchers de
    // `@testing-library/jest-dom` y los mocks de layout (`matchMedia`,
    // `ResizeObserver`, offsetWidth/Height). Base UI (dialog/popover/tooltip) los
    // EXIGE para montar; sin ellos el componente monta vacío → falso negativo
    // silencioso (justo lo que §2 advierte). Queda además por CONFIRMAR en TD.2 si el
    // `oxc.jsx` de abajo hace realmente redundante a `@vitejs/plugin-react` (hipótesis
    // de TD.1, razonable pero no verificada en volumen de tests de componente).
    environment: 'node',
    setupFiles: ['@app/test-utils/setup-env'],
  },
  // El tsconfig de web fija `jsx: "preserve"` (lo exige Next, que hace su propia
  // transformación). El transformador de esta Vite (rolldown/Oxc) respeta ese ajuste
  // y NO transforma el JSX, así que sin este override los tests que renderizan
  // componentes (.test.tsx) fallan al parsear ("make sure to not set jsx to
  // preserve"). Se configura Oxc con el runtime automático de React 19 — el mismo
  // que usa Next — para no exigir `import React` en cada componente.
  oxc: { jsx: { runtime: 'automatic', importSource: 'react' } },
  resolve: {
    // `@/` → src/, igual que el tsconfig de web: Vitest no lee los paths de tsc.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
