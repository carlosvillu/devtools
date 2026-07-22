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
// (3) Color HEX crudo en CONTEXTO DE ESTILO. Cierra el hueco que dejaba (2):
//     `DS_RAW_ARBITRARY` solo mira DENTRO de un `[...]` de className, así que un
//     `style={{ color: '#1e40af' }}` —el escape hatch que §3.1 SÍ permite para px— pasaba
//     invisible. Adapta la regla `Literal[value=/#[0-9a-fA-F]{3,8}\b/]` del
//     `_adherence.oxlintrc.json` del DS, cuyo mecanismo (JSX con `style` inline) es
//     exactamente el que aquí quedaba sin cubrir.
//
//     ACOTADO A PROPÓSITO, en dos ejes, porque un falso positivo NO se tolera: se
//     silencia con un `eslint-disable` que mata la regla entera, incluida la parte que sí
//     protegía.
//       · LONGITUD EXACTA 3/4/6/8 (no el rango `{3,8}`): un SHA de commit
//         (`fix en #abc1234`, 7 hex) ya no casa, porque ninguna longitud válida termina en
//         `\b` ahí.
//       · CONTEXTO DE ESTILO, nunca «cualquier string»: solo dentro de un `style={{…}}` de
//         JSX, o como valor de una propiedad cuyo NOMBRE es una propiedad CSS de color.
//         Así `'#dad'`, `'#cafe'` o `'#deadbeef'` sueltos en cualquier otro string dejan
//         de dispararla.
const DS_RAW_HEX = String.raw`#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b`;
/** Propiedades CSS que llevan color: cubren el patrón `Record` de tono (badge/callout). */
const DS_COLOR_PROP =
  '/^(?:color|background|backgroundColor|backgroundImage|border|borderColor|borderTopColor|borderRightColor|borderBottomColor|borderLeftColor|outline|outlineColor|fill|stroke|boxShadow|textShadow|caretColor|textDecorationColor|columnRuleColor|accentColor)$/';
/**
 * Una `Property` de color, con la clave escrita como identificador (`color:`) o como
 * string (`'color':`). Las dos formas son el MISMO caso, así que van juntas en un
 * `:matches(...)` en vez de duplicar cada entrada de regla.
 */
const DS_COLOR_PROPERTY = `:matches(Property[key.name=${DS_COLOR_PROP}], Property[key.value=${DS_COLOR_PROP}])`;

const DS_MSG_HEX =
  '[DS adherencia · hex crudo] Prohibido un color hex literal en apps/web (ni en className ni en `style` inline). Los colores viven en globals.css como tokens: usa una clase semántica (bg-accent, text-text-muted…) o `var(--token)` dentro de `style`.';
const DS_MSG_FONT =
  '[DS adherencia · tipografía] Prohibido fijar `fontFamily` en `style` inline. El DS dicta DOS familias (Geist / Geist Mono), expuestas como clases de token: usa `font-sans` o `font-mono`.';
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
  //
  // ── RECONCILIACIÓN DEL DELTA DE T6.2 (hecha en T6.3, 2026-07-22) ─────────
  // Al regenerar el espejo en T6.2 se descubrió que `_adherence.oxlintrc.json` llevaba
  // meses derivando aguas arriba SIN que nada del repo se enterara. T6.3 lo reconcilió
  // ENTRADA POR ENTRADA contra este flat config. Se documenta aquí —y no solo en el
  // informe de la tarea— porque el config detalla las reglas que SÍ se añadieron: callar
  // sobre las descartadas haría indistinguible «lo evalué y lo descarté» de «se me pasó»,
  // que es justo lo que esta reconciliación existe para impedir.
  //
  // 1) CONTRATOS DE PROPS por componente (las ~40 entradas `JSXOpeningElement`, incluidas
  //    las que el delta trajo: `Dialog`, `Image`, `Wordmark`, `SegmentedOption`)
  //    → **0 reglas nuevas, DESCARTADAS**. Son el sistema de tipos escrito en esquery:
  //    oxlint las necesita porque el DS es `.jsx` SIN tipos, pero aquí el código es TSX y
  //    lo mismo lo imponen las uniones de literales y el excess-property check de TS en
  //    `pnpm typecheck` (parte del gate). Portarlas duplicaría el type-checker.
  //    MATIZ HONESTO, para que nadie lo descubra como sorpresa: la cobertura NO es
  //    idéntica. Varias primitivas extienden props nativas (p. ej.
  //    `interface WordmarkProps extends React.ComponentProps<'span'>`, y lo mismo
  //    `Button`, `Card`, `Input`), así que TS ACEPTA atributos HTML que el oxlintrc
  //    rechazaría. Es una divergencia DELIBERADA y repo-wide, PREEXISTENTE a T6.3 — no un
  //    hueco que abra esta tarea. Si algún día se quiere el contrato estricto del DS, es
  //    una decisión de diseño de la API de las primitivas, no de este fichero.
  // 2) GRUPOS `components/brand/**` y `components/overlay/**` de `no-restricted-imports`
  //    (y los 5 grupos previos) → **N/A, DESCARTADOS**. Su intención upstream es «importa
  //    del `index.js`, no de los internos». Este repo NO tiene barrel: `components/ui/` no
  //    expone `index.ts` y el import profundo (`@/components/ui/segmented`) ES el patrón
  //    sancionado. Portar la regla prohibiría el uso correcto.
  // 3) LOS 4 TOKENS DE ACCESIBILIDAD (`--danger-hover`, `--violet-subtle-fg`,
  //    `--cyan-subtle-fg`, `--gray-450`) → **no son regla, son INVENTARIO** (viven en
  //    `x-omelette.tokens`, que no es una sección de `rules`). Los 4 ya estaban volcados en
  //    globals.css. Su protección permanente NO vive aquí sino en
  //    `apps/web/src/app/globals.adherence.test.ts`, que exige que TODO token del
  //    inventario del espejo esté declarado en globals.css y fija esos 4 como pin.
  // Lo que la reconciliación SÍ añadió (huecos reales, preexistentes, no del delta): la
  // regla de hex crudo en contexto de estilo y la de `fontFamily` en `style` — ambas
  // documentadas en su sitio, más abajo. Y lo que se descartó por NO aplicar a nuestro
  // mecanismo: la regla `\d+px` del oxlintrc, porque design-system.md §3.1 SANCIONA
  // explícitamente el px por `style` inline para valores no tokenizables (`Wordmark`,
  // `ConfidenceBar`, `CodeBlock` lo usan): portarla pondría en rojo código correcto.
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
        // (3) Hex crudo en contexto de ESTILO: dentro de un `style={{…}}` de JSX…
        {
          // `:not(...)` evita el diagnóstico DUPLICADO con el selector por nombre de
          // propiedad de abajo (que ya cubre `style={{ color: '#fff' }}`): un mismo error
          // reportado dos veces es ruido, y el ruido es lo que acaba en `eslint-disable`.
          selector: `JSXAttribute[name.name='style'] Literal[value=/${DS_RAW_HEX}/]:not(${DS_COLOR_PROPERTY} > Literal)`,
          message: DS_MSG_HEX,
        },
        {
          selector: `JSXAttribute[name.name='style'] TemplateElement[value.cooked=/${DS_RAW_HEX}/]`,
          message: DS_MSG_HEX,
        },
        // …y como valor de una propiedad CSS de color esté donde esté (el patrón `Record`
        // de tono de badge.tsx/callout.tsx vive FUERA del JSX y también debe cumplir).
        {
          selector: `${DS_COLOR_PROPERTY} > Literal[value=/${DS_RAW_HEX}/]`,
          message: DS_MSG_HEX,
        },
        // …y en los ATRIBUTOS DE PRESENTACIÓN de SVG. `icon.tsx` y `spinner.tsx` son SVG
        // inline: sin esta entrada, un `<rect fill="#0b0c0f" />` entraba SIN error (el
        // color no está ni en `style` ni bajo una clave CSS). La regla origen del DS sí lo
        // cazaba, así que omitirlo sería una regresión de cobertura respecto a lo que se
        // adapta. `fill="none"` y `stroke="currentColor"` (ambos en uso hoy) siguen
        // limpios: no son hex.
        {
          selector: `JSXAttribute[name.name=/^(?:fill|stroke|stopColor|floodColor|lightingColor)$/] > Literal[value=/${DS_RAW_HEX}/]`,
          message: DS_MSG_HEX,
        },
        // (4) `fontFamily` FIJADO en un `style` inline de JSX: la familia la dicta el DS
        //     vía font-sans/font-mono. Adaptación de la regla `font-family:` del oxlintrc
        //     al mecanismo real (objetos de estilo de React, no strings CSS). Acotado al
        //     `style` de JSX para no casar destructuring (`const { fontFamily } = obj`) ni
        //     objetos que no son estilos: ahí `fontFamily` se LEE, no se impone.
        {
          selector: `JSXAttribute[name.name='style'] :matches(Property[key.name='fontFamily'], Property[key.value='fontFamily'])`,
          message: DS_MSG_FONT,
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
