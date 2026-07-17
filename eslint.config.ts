// eslint.config.ts (raíz — el ÚNICO del monorepo; backend/references/tooling.md §2)
import js from '@eslint/js';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import * as importX from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import unusedImports from 'eslint-plugin-unused-imports';
import vitest from '@vitest/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/** La zona de tests: specs + los helpers que viven junto a ellos. */
const TEST_FILES = ['**/*.test.{ts,tsx}', '**/test/**/*.{ts,tsx}'];

// Bloques ausentes DELIBERADAMENTE en T0.1 (entran con la tarea que los estrena):
// - eslint-plugin-drizzle → T0.3 (packages/db nace vacío, sin drizzle todavía).
// - eslint-plugin-playwright → primera tarea con e2e (T0.4/T0.5).
// Instalarlos ahora sería una devDependency huérfana que knip rechaza.

export default defineConfig(
  // ── 1. Ignores globales: lo generado no se lintea jamás ──────────────────
  globalIgnores([
    '**/dist/**',
    '**/.next/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '**/test-results/**',
    '**/next-env.d.ts',
    // docs/ no es código del proyecto: es el espejo de solo-lectura del design
    // system (regenera DesignSync), los mockups de referencia (con React/Babel
    // self-hosteados y el _ds_bundle.js compilado) y la evidencia de cierre. Igual
    // que en .prettierignore, este árbol lo gobierna otro rol y no se lintea jamás.
    'docs/**',
  ]),

  // ── 2. Base typed para TODO el código TS ─────────────────────────────────
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Innegociables (tooling.md §2): un await perdido en un handler = trabajo
      // "completado" antes de terminar.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },

  // ── 3. import-x: higiene y fronteras de imports ──────────────────────────
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    settings: {
      // Sin esto, `@/server` (paths del tsconfig de web) no resuelve. Es el fix
      // que manda tooling.md §2: el resolver, NUNCA añadir paths cruzados al
      // tsconfig. `project` enumera los tsconfig de cada paquete porque el
      // resolver, por defecto, solo miraría el de la raíz.
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: ['tsconfig.json', 'apps/*/tsconfig.json', 'packages/*/tsconfig.json'],
        }),
      ],
    },
    rules: {
      // Un ciclo core↔db (o entre módulos de core) funde dos módulos en uno
      // sin decirlo: rompe la dirección de dependencias de architecture.md §1.
      'import-x/no-cycle': 'error',

      // Ruido de interop CJS/ESM, no correctness: se disparan con pino,
      // typescript-eslint y prettier (paquetes CJS con default + named exports),
      // sobre los patrones de import que las propias skills prescriben. Dejarlas
      // encendidas entrena a ignorar warnings, que es lo que mata la señal.
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
    },
  },

  // ── 4. unused-imports: autofix de imports muertos ────────────────────────
  {
    plugins: { 'unused-imports': unusedImports },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { args: 'after-used', argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // ── 5. apps/web: Next + React Hooks (React Compiler) ─────────────────────
  ...nextCoreWebVitals.map((cfg) => ({
    ...cfg,
    files: ['apps/web/**/*.{ts,tsx}'],
    settings: { ...cfg.settings, next: { rootDir: 'apps/web/' } },
  })),
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    // eslint-config-next YA registra los plugins react/react-hooks: volver a
    // declararlos revienta con "Cannot redefine plugin". Solo se toman las rules.
    rules: { ...reactHooks.configs['recommended-latest'].rules },
  },

  // ── 6. Tests: relajar lo unsafe, MANTENER las promesas ───────────────────
  // UN solo glob para los dos bloques: los ficheros de test y los helpers que
  // viven junto a ellos (`test/**`) son la misma zona. Tenerlos divergidos
  // (`test/**/*.ts` aquí, `test/**/*.test.ts` allí) hacía que un helper en
  // `test/helpers.ts` recibiera las relajaciones pero NO las reglas de vitest.
  {
    files: TEST_FILES,
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      // NUNCA se relaja: un expect(...) sin await = test en falso verde.
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: TEST_FILES,
    plugins: { vitest },
    rules: { ...vitest.configs.recommended.rules },
  },

  // ── 7. JS plano (configs, scripts .mjs): sin type-checking ───────────────
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    // Sin tipos no hay lib.dom/node: `process` y `console` de scripts/*.mjs
    // (readme-status.mjs) serían no-undef.
    languageOptions: { globals: { ...globals.node } },
  },

  // ── 8. prettier SIEMPRE al final: apaga toda regla de formato ────────────
  prettier,
);
