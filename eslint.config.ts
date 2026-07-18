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

// ── Adherencia al Design System (TD.6) — fuentes de los selectores ──────────
// Regexes en crudo (String.raw preserva `\b`, `\d`, `\[`…) que se inyectan en los
// selectores esquery de `no-restricted-syntax`. Se definen aparte para reusarlos en
// las variantes `Literal` (className="…") y `TemplateElement` (className={`…`}).
//
// (1) Paleta cruda de Tailwind: `{prop}-{ramp}-{step}`. Cubre TANTO las rampas del DS
//     (gray/blue/green/amber/red/cyan/violet → obligan a usar el alias semántico) COMO
//     las paletas default de Tailwind (slate/sky/indigo/zinc… que `--color-*: initial`
//     de globals.css BORRA → clase no-op silenciosa, el peligro que hay que cazar).
//     NO casa spacing fraccionario (`size-4.5`, `gap-1.75`, `max-w-80`): no es ramp-step.
const DS_RAW_RAMP = String.raw`\b(?:bg|text|border(?:-[trblxy])?|ring(?:-offset)?|fill|stroke|from|via|to|decoration|outline|shadow|divide(?:-[xy])?|placeholder|caret|accent)-(?:gray|blue|green|amber|red|cyan|violet|slate|zinc|neutral|stone|orange|sky|indigo|rose|emerald|teal|lime|yellow|fuchsia|pink|purple)-\d{1,3}\b`;
// (2) Valor arbitrario CRUDO en className: un `[…]` cuyo contenido es un hex, un
//     número+unidad (`bg-[#1e40af]`, `rounded-[10px]`, `text-[13px]`) o una función de
//     color cruda (`bg-[rgb(...)]`, `text-[oklch(...)]`) — mismo pecado que el hex. NO
//     casa token-vía-var (`[--x:var(--warning)]`) ni arbitrarios sin valor crudo
//     (`transition-[border-color,box-shadow]`): ninguno lleva hex, número+unidad ni
//     función de color (los color-mix del DS viven en `style`, nunca en className).
const DS_RAW_ARBITRARY = String.raw`\[[^\]]*(?:#[0-9a-fA-F]{3,8}|\d*\.?\d+(?:px|rem|em|vh|vw|pt|%)|(?:color-mix|rgba?|hsla?|hwb|oklch|oklab|lab|lch|color)\()[^\]]*\]`;

const DS_MSG_RAMP =
  '[DS adherencia · rampa cruda] Prohibida la paleta cruda de Tailwind ({prop}-{ramp}-{step}, p. ej. bg-blue-500, text-red-600). Usa un alias semántico del DS (bg-accent, text-text-muted, bg-accent-subtle-bg…). Las rampas default (slate/sky/indigo…) ni siquiera generan clase: globals.css las borra con `--color-*: initial`.';
const DS_MSG_ARBITRARY =
  '[DS adherencia · arbitrario crudo] Prohibido un valor arbitrario crudo en className (bg-[#hex], rounded-[10px], text-[13px]) fuera de globals.css. Los valores visuales viven en globals.css como tokens; usa clases de token o `style` inline para valores runtime. Token-vía-var ([--x:var(--token)]) sí está permitido.';
const DS_MSG_ICONS =
  '[DS adherencia · iconos] Prohibido importar librerías de iconos (lucide-react, @radix-ui/*, @heroicons/*, react-icons, @tabler/icons-react…). La iconografía la dicta el DS: usa components/ui/icon (Icon / IconName).';

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

  // ── 5b. Composites de producto: pureza presentacional (TD.5) ─────────────
  // StepCard/ChainSummary/HistoryRow (components/{chain,history}) son presentacionales
  // PUROS: hablan en props planas de tipos LOCALES del DS (`DataKind` vive en
  // components/ui/badge, no en @app/core). Importar tipos de DOMINIO de `@app/core` los
  // acopla al negocio antes de tiempo — los wrappers de dominio (T1.5/T2.2) son otra capa.
  // `@typescript-eslint/no-restricted-imports` con `allowTypeImports` en su default
  // (false) caza TAMBIÉN `import type { … } from '@app/core'`, que es la violación
  // realista (son tipos). Esta regla, corriendo sobre los ficheros reales dentro de
  // `pnpm lint` (parte del gate), ES el control negativo permanente de pureza que exige
  // la Verificación de TD.5 — ejercita la MISMA capa (lint) que nombra la cláusula.
  {
    files: [
      'apps/web/src/components/chain/**/*.{ts,tsx}',
      'apps/web/src/components/history/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@app/core', '@app/core/**', '**/packages/core', '**/packages/core/**'],
              message:
                'Composite presentacional PURO (TD.5): prohibido importar tipos de dominio de @app/core en components/{chain,history}. Usa props planas; el wrapper de dominio (T1.5/T2.2) es otra capa.',
            },
          ],
        },
      ],
    },
  },

  // ── 5c. Adherencia al Design System en apps/web (TD.6) ───────────────────
  // Materializa la disciplina «cero valores crudos, todo desde el token/semántica del
  // DS» (frontend/references/design-system.md §3) sobre el mecanismo REAL de este repo:
  // clases Tailwind v4 (className strings) + imports. Adapta las IDEAS del oxlintrc de
  // Claude Design (docs/design-system/_adherence.oxlintrc.json) — pensado para JSX con
  // `style` inline (targetea Literal con hex/px) — a className + imports. Corre DENTRO de
  // `pnpm lint` (parte de `pnpm gate`): ES la protección permanente que exige la
  // Verificación de TD.6 (misma capa, lint). Scope: apps/web, SIN tests (el bloque 6 ya
  // los relaja, y badge.test.tsx menciona rampas como strings de aserción) ni generados
  // (globalIgnores excluye docs/**, .next…; globals.css es CSS, no se lintea).
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    ignores: TEST_FILES,
    rules: {
      'no-restricted-syntax': [
        'error',
        // (1) Paleta cruda de Tailwind — Literal y TemplateElement (className={`…`}).
        { selector: `Literal[value=/${DS_RAW_RAMP}/]`, message: DS_MSG_RAMP },
        { selector: `TemplateElement[value.cooked=/${DS_RAW_RAMP}/]`, message: DS_MSG_RAMP },
        // (2) Valor arbitrario crudo en className.
        { selector: `Literal[value=/${DS_RAW_ARBITRARY}/]`, message: DS_MSG_ARBITRARY },
        {
          selector: `TemplateElement[value.cooked=/${DS_RAW_ARBITRARY}/]`,
          message: DS_MSG_ARBITRARY,
        },
      ],
      // (3) Imports de librerías de iconos. Se usa la regla BASE `no-restricted-imports`,
      // NO la `@typescript-eslint/*` del bloque 5b: son rule IDs distintos, así que
      // coexisten sobre components/{chain,history} sin que este bloque pise la restricción
      // de pureza de @app/core de TD.5 (flat config sobrescribe por rule ID, no fusiona).
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'lucide-react',
                'lucide-react/*',
                '@radix-ui/*',
                'react-icons',
                'react-icons/*',
                '@heroicons/*',
                '@tabler/icons-react',
                '@tabler/icons-react/*',
                '@phosphor-icons/*',
              ],
              message: DS_MSG_ICONS,
            },
          ],
        },
      ],
    },
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
