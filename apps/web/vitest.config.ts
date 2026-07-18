import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'web:unit',
    // `.tsx` incluido: TD y F1 traen componentes React, cuyos tests se llaman
    // `algo.test.tsx`. Con `*.test.ts` a secas ningún proyecto los recogería,
    // vitest no protestaría y el gate seguiría verde con el test sin ejecutar.
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', 'e2e/**'],
    // jsdom A NIVEL DE PROYECTO (antes `node` con jsdom por-fichero). Lo estrena TD.2
    // —primeras primitivas del DS sobre el patrón shadcn/cva— tal como
    // testing/references/frontend.md §2 prescribe y el journal de TD.1 pidió:
    // `environment: 'jsdom'` + `vitest.setup.ts` con los matchers de jest-dom y los
    // mocks de layout (matchMedia/ResizeObserver). Los tests que NO tocan DOM
    // (renderToStaticMarkup de la página, lectura de tokens) corren igual bajo jsdom.
    environment: 'jsdom',
    setupFiles: ['@app/test-utils/setup-env', './vitest.setup.ts'],
    // Limpia vi.stubGlobal entre tests (red de seguridad para los fakes —EventSource,
    // etc.— que llegarán con módulos posteriores; hoy no hay ninguno activo).
    unstubGlobals: true,
  },
  // El tsconfig de web fija `jsx: "preserve"` (lo exige Next, que hace su propia
  // transformación). El transformador de esta Vite (rolldown/Oxc) respeta ese ajuste
  // y NO transforma el JSX, así que sin este override los tests que renderizan
  // componentes (.test.tsx) fallan al parsear ("make sure to not set jsx to
  // preserve"). Se configura Oxc con el runtime automático de React 19 — el mismo
  // que usa Next — para no exigir `import React` en cada componente.
  //
  // CONFIRMADO en TD.2 (hipótesis de TD.1): `@vitejs/plugin-react` es REDUNDANTE. Con
  // `oxc.jsx` como único transformador, la batería de tests de componente de TD.2
  // (render + @testing-library + userEvent + jest-dom, incl. teclado y clic) pasa en
  // verde sin instalar `@vitejs/plugin-react`. No se añade: sería una devDependency
  // huérfana que knip rechazaría. La referencia lista plugin-react porque asume Vite
  // estándar; este repo usa el transformador Oxc de rolldown-vitest, que ya cubre el
  // JSX de React 19.
  oxc: { jsx: { runtime: 'automatic', importSource: 'react' } },
  resolve: {
    // `@/` → src/, igual que el tsconfig de web: Vitest no lee los paths de tsc.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
