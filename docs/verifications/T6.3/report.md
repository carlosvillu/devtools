# Verificación T6.3 — La primitiva `Segmented` en código + showcase

- **Tarea**: T6.3 · La primitiva `Segmented` en código + showcase (`planning.md`)
- **Fecha**: 2026-07-22
- **Ejecutor**: agente `verifier` · agent-browser (npx, Chrome `--no-sandbox`) · sesiones `t6.3` (app) y `t6.3spec` (specimen)
- **Sistema**: HEAD `cfcd93f` + el diff de T6.3 en el working tree (4 ficheros nuevos + 4 modificados; ver `gate.txt`) · docker compose dev (`devtools-dev-postgres-1` healthy) + `pnpm dev` (Next 16.2.10, Turbopack) · `GET /api/health → {"ok":true,"db":true}` (`health.txt`)

## Verificación esperada (literal de planning.md)

> comparación en navegador contra el specimen del espejo en **ambos temas** (variantes, tamaños, estados hover/focus/disabled) sin desviaciones perceptibles; el control se opera **entero con teclado** (Tab entra, flechas cambian de opción, el cambio se anuncia por rol y accessible name); `pnpm gate` verde con el lint de adherencia mordiendo (control negativo: meter un `bg-blue-500` en el fichero hace fallar `pnpm lint` nombrando la regla).

Además, la **Deuda heredada** de la entrada de T6.3 (Entrega, no Verificación) se juzga en el veredicto:

> compara el `_adherence.oxlintrc.json` ya actualizado con las reglas de `eslint.config.ts` y, si faltan reglas que el DS sí exige, **añádelas en esta tarea**. Si decides que alguna no aplica al flat config, **escribe por qué — no la omitas en silencio**.

## Cómo se resolvió el problema del specimen

La card del espejo (`docs/design-system/components/forms/Segmented.card.html`) **no renderiza**: pide React/Babel desde unpkg y `_ds_bundle.js`, que el espejo excluye por ser build output. El `_ds_bundle.js` de `docs/mockups/assets/` es un **snapshot obsoleto** (emite `--text-sm` donde el `.jsx` dice `--text-base`) y **no se usó**.

Fuente autoritativa = `docs/design-system/components/forms/Segmented.jsx`. La función es pura (el estilo es función de las props), así que se transcribió a HTML estático en **`specimen-harness.html`** (escrito por el verifier bajo `docs/verifications/T6.3/`, enlazando `docs/design-system/styles.css` real y los paths de icono de `components/display/Icon.jsx`). La comparación no es a ojo: se miden los **estilos computados** de ambos lados y se **rasterizan los colores a sRGB** para compararlos byte a byte.

## Pasos ejecutados

1. Gate en aislamiento (sin `next dev` ni otro vitest compitiendo) → verde (`gate.txt`).
2. Control negativo del lint: `bg-blue-500` inyectado en `segmented.tsx` → `pnpm lint` rojo (`negctl-lint.txt`); fichero restaurado y verificado con `sha256sum -c`.
3. Control negativo del test de paridad: borrado `--gray-450` de `globals.css` → `globals.adherence.test.ts` rojo (`negctl-parity.txt`); fichero restaurado y verificado con `sha256sum -c`.
4. `pnpm dev` + healthcheck; `/design-system` abierto en Chrome real.
5. Árbol de accesibilidad (`agent-browser snapshot`), medición de estilos computados y contraste WCAG en **claro y oscuro**, en la app y en el harness del specimen.
6. Traza de teclado literal sobre el grupo de **3 opciones** (`jwt.decode` / `base64.decode` / `url.decode`), no el de 2.
7. Consola y errores del navegador capturados (`browser-console.txt`).

## Cláusula 1 — Comparación contra el specimen, ambos temas

### Geometría y tipografía (estilos computados, idénticos en claro y oscuro)

| Medida | Specimen (`.jsx`) | Harness renderizado | Implementación | OK |
|---|---|---|---|---|
| Grupo: padding / gap | `4` / `4` | `4px` / `4px` | `4px` / `4px` | OK |
| Grupo: border-radius | `var(--radius-lg)` | `12px` | `12px` (`rounded-lg`) | OK |
| Grupo: border / fondo | `1px solid var(--border)` / `var(--surface-2)` | idem | idem | OK |
| Segmento **md**: padding | `7px 16px` | `7px 16px` | `7px 16px` (`py-1.75 px-4`) | OK |
| Segmento **md**: font-size | `var(--text-base)` | **15px** | **15px** | OK |
| Segmento **sm**: padding | `5px 12px` | `5px 12px` | `5px 12px` (`py-1.25 px-3`) | OK |
| Segmento **sm**: font-size | `var(--text-xs)` | 12px | 12px | OK |
| Segmento: border-radius | `var(--radius)` | `6px` | `6px` (`rounded-base`) | OK |
| Gap icono-label | `7` | `7px` | `7px` (`gap-1.75`) | OK |
| Icono | `size={14}` | — | `14x14` | OK |
| Familia `mono=false` / `true` | `--font-sans` / `--font-mono` | Geist / Geist Mono | GeistSans / GeistMono (alias `next/font/local` de las mismas caras) | OK |
| Peso seleccionado / no | `600` / `500` | `600` / `500` | `600` / `500` | OK |
| Fondo seleccionado / no | `var(--surface)` / `transparent` | `rgb(255,255,255)` / `rgba(0,0,0,0)` | idénticos | OK |
| Sombra seleccionado | `var(--shadow-sm)` | `rgba(16,20,30,.08) 0 1px 3px, rgba(16,20,30,.04) 0 1px 2px` | mismas dos capas (Tailwind antepone capas de ring vacías, `rgba(0,0,0,0)`) | OK |

**El aviso del brief se comprobó y se descarta como desviación**: el tamaño md resuelve a **15px** (`--text-base`), no a 13px. La diferencia de 2px del `_ds_bundle.js` es el bundle estando viejo; el `.jsx` y la implementación coinciden.

### Colores (rasterizados a sRGB en canvas — igualdad exacta)

| Token | Specimen | Implementación | |
|---|---|---|---|
| `--border` | `227,229,232` | `227,229,232` | IGUAL |
| `--surface-2` | `243,244,246` | `243,244,246` | IGUAL |
| `--text` | `21,23,27` | `21,23,27` | IGUAL |
| `--text-muted` | `81,84,92` | `81,84,92` | IGUAL |

(El specimen los expresa en `oklch()` y la implementación en `lab()` por la compilación de Tailwind; rasterizados son el mismo píxel.)

En **oscuro** la medición completa de ambos lados devuelve exactamente los mismos valores (`fg=243,244,246 / bg=21,23,27` para el activo; `fg=156,160,167 / bg=36,39,44` para el inactivo), con la misma geometría.

**Capturas**: `01-impl-claro.png` vs `02-spec-claro.png`; `03-impl-oscuro.png` vs `04-spec-oscuro.png`. Sin desviaciones perceptibles.

### Contraste WCAG (aserción obligatoria de `cua.md`)

| Tema | Segmento | fg / bg | Tamaño | Ratio | Umbral | OK |
|---|---|---|---|---|---|---|
| Claro | seleccionado | `21,23,27` / `255,255,255` | 15px·600 | **17.94:1** | 4.5 | OK |
| Claro | no seleccionado | `81,84,92` / `243,244,246` | 15px·500 | **6.88:1** | 4.5 | OK |
| Claro | sm no seleccionado | `81,84,92` / `243,244,246` | 12px·500 | **6.88:1** | 4.5 | OK |
| Oscuro | seleccionado | `243,244,246` / `21,23,27` | 15px·600 | **16.31:1** | 4.5 | OK |
| Oscuro | no seleccionado | `156,160,167` / `36,39,44` | 15px·500 | **5.71:1** | 4.5 | OK |
| Oscuro | sm no seleccionado | `156,160,167` / `36,39,44` | 12px·500 | **5.71:1** | 4.5 | OK |

El specimen del espejo da los mismos ratios: ni el DS ni la implementación tienen aquí un problema de contraste.

### `hover` / `focus` / `disabled`

- **`hover`: el DS no lo define.** Verificado por el verifier: `grep -n "hover"` sobre los **4** artefactos del espejo (`Segmented.jsx`, `Segmented.d.ts`, `Segmented.prompt.md`, `Segmented.card.html`) no devuelve nada. El `.jsx` solo declara `transition: background …, color …`. La implementación tampoco añade hover. **Nada que comparar → cláusula satisfecha.**
- **`disabled`: el DS no lo define.** Mismo `grep`, mismo resultado: cero apariciones en los 4 artefactos. El `.d.ts` declara `SegmentedProps` como interfaz **cerrada** (no extiende `ComponentProps<'button'>`), así que ni siquiera hereda el `disabled` nativo, y la implementación respeta ese cierre. **Nada que comparar → cláusula satisfecha.**
- **`focus`: el specimen tampoco lo estila** — es una adición al alza de la implementación, documentada en `design-system.md` §4.2. Se comprueba que usa el **anillo único del DS**, idéntico al de `Button`: ambos elementos llevan exactamente `focus-visible:ring-2 focus-visible:ring-ring`, y el estilo computado del segmento enfocado es `box-shadow … oklab(0.584991 -0.0459752 -0.184337 / 0.45) 0 0 0 2px`. Visible en `05-foco-claro.png` y `06-foco-oscuro.png`.

## Cláusula 2 — Operación entera con teclado (Chrome real)

Grupo usado: el de **3 opciones** (`sm` + `mono`), donde «siguiente» y «anterior» sí distinguen dirección. Preparación (no es el paso verificado): foco puesto en el `textarea` inmediatamente anterior a la sección.

| Tecla | Foco resultante | `aria-selected` del foco | Selección del grupo | Eco en pantalla |
|---|---|---|---|---|
| *(prep)* | `TEXTAREA` (fuera del grupo) | — | `jwt.decode` | `valor: jwt.decode` |
| `Tab` | `BUTTON/decodificar` (grupo **md**) | `true` | — | — |
| `Tab` | `BUTTON/jwt.decode` (grupo **sm**) | `true` | `jwt.decode` | — |
| `ArrowRight` | `BUTTON/base64.decode` | `true` | `base64.decode` | `valor: base64.decode` |
| `ArrowRight` | `BUTTON/url.decode` | `true` | `url.decode` | `valor: url.decode` |
| `ArrowRight` | `BUTTON/jwt.decode` (**wrap**) | `true` | `jwt.decode` | `valor: jwt.decode` |
| `ArrowLeft` | `BUTTON/url.decode` (**wrap inverso**) | `true` | `url.decode` | `valor: url.decode` |
| `ArrowUp` | `BUTTON/base64.decode` | `true` | `base64.decode` | `valor: base64.decode` |
| `ArrowDown` | `BUTTON/url.decode` | `true` | `url.decode` | `valor: url.decode` |
| `Home` | `BUTTON/jwt.decode` | `true` | `jwt.decode` | `valor: jwt.decode` |
| `End` | `BUTTON/url.decode` | `true` | `url.decode` | `valor: url.decode` |
| `Tab` | `BUTTON/Copiar` (**fuera del grupo**) | — | `url.decode` | `valor: url.decode` |

Lecturas:
- **Tab entra** al grupo y lo hace por el segmento **seleccionado**.
- **Una sola parada de tabulación por grupo**: el segundo `Tab` salta del grupo md al grupo sm sin recorrer sus segmentos, y el `Tab` final sale del grupo sm al `CopyButton` siguiente. `tabIndex` = `0` en el enfocado y `-1` en el resto (medido).
- **Las flechas distinguen dirección con 3 opciones**: `→` y `↓` avanzan, `←` y `↑` retroceden, ambas con wrap. `Home`/`End` van a los extremos.
- **La selección sigue al foco** (activación automática APG) y el eco de la página lo confirma.

### «El cambio se anuncia por rol y accessible name» — árbol de accesibilidad real

```
- tablist "Dirección"
  - tab "decodificar" [selected, ref=e99]
  - tab "codificar" [ref=e100]
- tablist "Transformación"
  - tab "jwt.decode" [selected, ref=e101]
  - tab "base64.decode" [ref=e102]
  - tab "url.decode" [ref=e103]
```

Los cuatro elementos exigidos están: **rol del grupo** (`tablist`, el del espejo — se obedece, no se traduce a `radiogroup`), **nombre accesible del grupo** (`Dirección` / `Transformación` vía `aria-label`), **rol de cada opción** (`tab`) y **`aria-selected`** siguiendo a la selección en cada pulsación (columna de la traza). El icono es `aria-hidden` y no contamina el nombre accesible.

### Consola del navegador

`browser-console.txt`: 2 líneas, ninguna de error — el aviso informativo de React DevTools y `[HMR] connected`. **Cero errores y cero warnings de código del proyecto.**

## Cláusula 3 — `pnpm gate` + control negativo del lint

**Gate en verde** (`gate.txt`), ejecutado en aislamiento: lint, typecheck (4 paquetes), format:check, knip, readme:status:check y **63 ficheros / 693 tests** en 69s. `redact.test.ts` no falló.

**Control negativo del lint** (ejecutado por el verifier, `negctl-lint.txt`) — `bg-blue-500` inyectado en la línea del contenedor de `segmented.tsx`:

```
/home/developer/projects/devtools/apps/web/src/components/ui/segmented.tsx
  190:9  error  [DS adherencia · rampa cruda] Prohibida la paleta cruda de Tailwind ({prop}-{ramp}-{step},
  p. ej. bg-blue-500, text-red-600). Usa un alias semántico del DS (bg-accent, text-text-muted,
  bg-accent-subtle-bg…). Las rampas default (slate/sky/indigo…) ni siquiera generan clase: globals.css
  las borra con `--color-*: initial`  no-restricted-syntax

✖ 1 problem (1 error, 0 warnings)
[ELIFECYCLE] Command failed with exit code 1.
```

Nombra la regla (`no-restricted-syntax`) y su etiqueta de adherencia (`[DS adherencia · rampa cruda]`). Fichero **restaurado byte a byte** (`sha256sum -c` → `OK`).

## Cláusula extra — ¿Muerde el test de paridad de tokens?

Control negativo del verifier: borrada la declaración `--gray-450` de `globals.css` (quedan el uso en `--text-subtle: var(--gray-450)` y el alias `--color-gray-450`, así que el test no puede aprobar «por accidente»). `negctl-parity.txt`:

```
FAIL |web:unit| src/app/globals.adherence.test.ts > … > los 4 tokens de accesibilidad que el espejo
ganó en T6.2 están volcados
AssertionError: --gray-450 debería estar declarado en globals.css: expected false to be true

 Test Files  1 failed (1)
      Tests  2 failed | 1 passed (3)
```

Muerden **los dos** casos load-bearing (el genérico de inventario y el pin de regresión de T6.2); el tercero (guarda de inventario no vacío) sigue verde, que es lo correcto. Fichero restaurado byte a byte (`sha256sum -c` → `OK`).

## Deuda heredada (Entrega) — reconciliación `_adherence.oxlintrc.json` ↔ `eslint.config.ts`

Delta que T6.2 destapó, y su disposición **auditada por el verifier**:

| Ítem del delta | Disposición del implementer | ¿Defendible? | ¿Escrita en el árbol? |
|---|---|---|---|
| 4 tokens (`--danger-hover`, `--violet-subtle-fg`, `--cyan-subtle-fg`, `--gray-450`) | test de paridad `globals.adherence.test.ts` (+ pin explícito de los 4) | **Sí** — y verificado que muerde | **Sí**, en la cabecera del test |
| 2 reglas nuevas por huecos preexistentes (hex crudo en `style`/objetos/atributos SVG; `fontFamily` en `style`) | añadidas | **Sí** | **Sí**, comentarios extensos en `eslint.config.ts` |
| Contratos de props de `Dialog`, `Image`, `Wordmark`, `SegmentedOption` | «los cubre TypeScript» ⇒ 0 reglas | **Sí, con matiz** (ver abajo) | **NO** |
| Grupos `components/brand/**` y `components/overlay/**` de `no-restricted-imports` | «N/A: el repo no tiene barrel» ⇒ 0 reglas | **Sí** (verificado: no hay `index.ts` en `components/`; la regla del DS solo existe para forzar el import por `index.js`, y esas rutas ni existen aquí) | **NO** |

Sobre el matiz: «los contratos de props los cubre TypeScript» es correcto para el caso general (TS rechaza props desconocidas y valores fuera de la unión en JSX) e `Image` **ni siquiera existe** en nuestro inventario. Pero no es universal: `Wordmark` declara `interface WordmarkProps extends React.ComponentProps<'span'>`, así que TS **sí** admite props que el `_adherence.oxlintrc.json` rechazaría. Es una divergencia **deliberada, repo-wide y preexistente** (`Button`, `Card`, `Input` tienen entradas equivalentes en el oxlintrc desde antes de T6.2 y el mismo patrón `extends ComponentProps`), no un agujero nuevo abierto por el delta de T6.2 — por eso no bloquea como defecto de cobertura. **Bloquea porque no está escrita.**

`grep` sobre todo el árbol (`eslint.config.ts`, `design-system.md`, `journal.md` y los 4 ficheros nuevos) confirma que la única mención del delta es *descriptiva* («ganó `Dialog`, `Image`, `Wordmark`, `SegmentedOption`, dos grupos…»), en la cabecera de `globals.adherence.test.ts` y en `design-system.md` §1.2. **En ningún sitio se escribe la decisión ni su porqué.** El razonamiento vive solo en el resumen del implementer, que no es un artefacto del repo: quien abra `eslint.config.ts` mañana no puede distinguir «se evaluó y se descartó» de «se pasó por alto». Es exactamente lo que la Entrega prohíbe: «escribe por qué — **no la omitas en silencio**».

## Resultado observado vs esperado

| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | Comparación contra el specimen en **ambos temas**, sin desviaciones perceptibles | Estilos computados idénticos en las 14 medidas; colores iguales al píxel tras rasterizar; capturas indistinguibles en claro y oscuro | `01`–`04`.png, `specimen-harness.html` | OK |
| 2 | **Variantes y tamaños**: `md`, `sm`, `mono`, seleccionado/no | Los 4 ejes comparados uno a uno contra el `.jsx`; md = 15px (`--text-base`), no 13px | tabla de geometría | OK |
| 3 | Estado **hover** | El DS **no lo define** en ninguno de sus 4 artefactos; la implementación tampoco lo añade → nada que comparar | `grep` sobre el espejo | OK |
| 4 | Estado **disabled** | El DS **no lo define**; `SegmentedProps` es interfaz cerrada y no hereda `disabled` nativo → nada que comparar | `grep` sobre el espejo | OK |
| 5 | Estado **focus** | Adición al alza documentada; anillo **único** del DS, idéntico al de `Button` (`focus-visible:ring-2 ring-ring`), visible en ambos temas | `05`, `06`.png | OK |
| 6 | **Contraste** texto/fondo ≥4.5:1 en ambos temas (obligatorio, `cua.md`) | Mínimo observado **5.71:1** (inactivo en oscuro) | tabla de contraste | OK |
| 7 | **Tab entra** al control | `Tab` desde el `textarea` previo → foco en el segmento **seleccionado** | traza de teclado | OK |
| 8 | **Una sola parada de tabulación** (Tab sale) | El `Tab` siguiente abandona el grupo (md→sm, y sm→`CopyButton`); `tabIndex` 0/-1 medido | traza de teclado | OK |
| 9 | **Flechas cambian de opción** (en el grupo de **3**) | `→`/`↓` avanzan, `←`/`↑` retroceden, wrap en ambos sentidos, `Home`/`End` a los extremos | traza de teclado | OK |
| 10 | El cambio **se anuncia por rol y accessible name** | `tablist` con nombre (`Dirección`/`Transformación`), `tab` por opción, `[selected]` siguiendo a la selección en el árbol de a11y real | árbol de a11y | OK |
| 11 | Consola del navegador limpia | 2 líneas informativas (React DevTools, HMR); 0 errores, 0 warnings propios | `browser-console.txt` | OK |
| 12 | `pnpm gate` **verde** | 693 tests / 63 ficheros, 6 etapas verdes, en aislamiento | `gate.txt` | OK |
| 13 | Control negativo: `bg-blue-500` hace fallar `pnpm lint` **nombrando la regla** | Falla con `no-restricted-syntax` + `[DS adherencia · rampa cruda]`; fichero restaurado byte-idéntico | `negctl-lint.txt` | OK |
| 14 | (extra) El test de paridad de tokens **muerde** | Borrar `--gray-450` pone 2 casos en rojo; restaurado byte-idéntico | `negctl-parity.txt` | OK |
| 15 | (Entrega) Deuda del `_adherence.oxlintrc.json`: reglas añadidas **o el porqué escrito** | Las reglas que faltaban se añadieron y muerden; **la justificación de los ítems descartados a 0 reglas no está escrita en ningún sitio del árbol** | `grep` sobre `eslint.config.ts`, `design-system.md`, `journal.md`, ficheros nuevos | **NO** |

## Coste real

**$0** — sin APIs de pago (D8). Estimado del planning: $0. Sin desviación.

## Veredicto

**FAIL** — la Verificación literal pasa entera y con holgura (14/14 puntos observables verdes, incluidos el control negativo del lint ejecutado por el verifier y el del test de paridad, que la Verificación ni pedía), pero la **Entrega** de la Deuda heredada queda a medias: el planning exige que, para lo que se decida no implementar, «**escribe por qué — no la omitas en silencio**», y esa justificación no existe en el árbol.

**Causa raíz**: la disposición del delta de T6.2 (contratos de props de `Dialog`/`Image`/`Wordmark`/`SegmentedOption` y los grupos `components/brand/**` + `components/overlay/**` de `no-restricted-imports`) vive solo en el resumen del implementer. `eslint.config.ts` documenta con detalle las **2 reglas añadidas** pero no dice una palabra de las que se evaluaron y se descartaron — asimetría que hace indistinguible «se revisó y se descartó» de «se pasó por alto», que es justo el silencio que esta deuda venía a cerrar.

**Qué debe arreglar el implementer** (acotado; no toca comportamiento ni estilos):

1. Añadir en `eslint.config.ts`, junto al preámbulo del bloque 5c, un bloque de comentario «Reconciliación del delta de T6.2 (`_adherence.oxlintrc.json`)» que escriba, ítem por ítem, la decisión y su porqué:
   - **Contratos de props (`Dialog`, `Image`, `Wordmark`, `SegmentedOption`)** → 0 reglas: TypeScript rechaza props desconocidas y valores fuera de la unión en JSX; `Image` no está en nuestro inventario. **Anotar el matiz real**: las primitivas que extienden `ComponentProps<'…'>` (p. ej. `Wordmark extends ComponentProps<'span'>`) admiten props que el oxlintrc rechazaría — divergencia deliberada, repo-wide y preexistente al delta (`Button`/`Card`/`Input` ya estaban igual), no un hueco nuevo.
   - **Grupos `components/brand/**` y `components/overlay/**`** → 0 reglas: la regla del DS solo existe para forzar el import por `index.js`; este repo **no tiene barrel** (`components/ui/` no expone `index.ts`) y esas rutas no existen aquí.
   - **4 tokens** → cubiertos por `globals.adherence.test.ts` (con puntero al fichero).
2. Anotar lo mismo, en dos líneas, en el cierre de T6.3 del `docs/dev-loop/journal.md`.

Con eso la tarea queda cerrable sin repetir nada de lo verificado aquí: **ningún punto observable de la Verificación falló** y el fix no toca `segmented.tsx`, `globals.css` ni el showcase (bastaría re-correr `pnpm gate` y volver a mirar el punto 15).

**Rarezas anotadas (no bloquean)**:

- **Ajena a T6.3**: `pnpm dev` emite 10 warnings `A Node.js API is used (process.cwd …) which is not supported in the Edge Runtime` + `Ecmascript file had an error` desde `apps/web/src/instrumentation.ts:42-44`. Preexistente (bundling del instrumentation para el runtime edge); las migraciones on-boot se aplican y `/api/health` responde `{"ok":true,"db":true}`. Candidata a deuda propia, no de esta tarea.
- **`Section id="segmented"` no produce un `#segmented` en el DOM**: el `id` acaba en el `<h2>` como `segmented-title`. Es consistente con el resto del showcase (no es regresión de T6.3), pero un enlace `/design-system#segmented` no ancla.
- El `_ds_bundle.js` de `docs/mockups/assets/` sigue siendo un snapshot obsoleto respecto al `.jsx` del espejo (`--text-sm` vs `--text-base`). Verificado que la implementación sigue al `.jsx` (15px). Conviene que quede escrito para el siguiente que compare contra una card.

---

# Re-verificación — 2026-07-22 (tras el fix del punto 15)

> El FAIL de arriba **se conserva intacto** como histórico: hizo falta. Esta sección solo
> re-verifica el **punto 15**; los puntos 1–14 siguen en pie sin repetirse, y abajo se
> justifica por qué eso es legítimo.

## Por qué NO se repiten los puntos 1–14

El único cambio desde el FAIL es un bloque de **comentarios** en `eslint.config.ts`
(`git diff --stat`: 69 → 108 líneas insertadas en ese fichero, ningún otro fichero tocado).
Comprobado por el verifier, no asumido:

- `sha256sum -c` sobre `apps/web/src/components/ui/segmented.tsx` → **OK** (byte-idéntico al que se verificó).
- `sha256sum -c` sobre `apps/web/src/app/globals.css` → **OK**.
- `git status --short`: los mismos 9 caminos que antes; `page.tsx`, `page.test.tsx`,
  `segmented-demo.tsx`, `globals.adherence.test.ts` y `segmented.test.tsx` sin cambios.

Nada de lo observado en el navegador (estilos computados, contraste, teclado, árbol de
a11y, consola) depende de un comentario de la configuración de ESLint.

**`pnpm test:e2e` no se re-ejecuta**, y queda trazado el porqué: el cambio es únicamente
comentarios, y el último e2e verde (**36 passed**) es **posterior** al último cambio de
comportamiento del árbol. Re-correrlo ejercitaría exactamente el mismo código.

## Punto 15 — Re-verificación

### (a) ¿El texto está en el árbol y dice lo que dice?

**Sí.** `eslint.config.ts:213-250`, dentro del preámbulo del bloque 5c —es decir, **junto a
las reglas**, no en un informe externo—, bajo el encabezado
`── RECONCILIACIÓN DEL DELTA DE T6.2 (hecha en T6.3, 2026-07-22) ─────────`.

Los tres ítems del delta están escritos con su decisión y su porqué, y las afirmaciones
verificables se comprobaron una a una:

| Ítem | Lo que afirma el texto | Comprobación del verifier |
|---|---|---|
| 1 · Contratos de props (`Dialog`, `Image`, `Wordmark`, `SegmentedOption` + familia) | **0 reglas, DESCARTADAS**: son el sistema de tipos escrito en esquery (el DS es `.jsx` sin tipos); en TSX lo imponen las uniones de literales y el excess-property check en `pnpm typecheck` | Correcto |
| 1 · matiz | «la cobertura NO es idéntica»: `WordmarkProps extends React.ComponentProps<'span'>`, «y lo mismo `Button`, `Card`, `Input`» → divergencia deliberada, repo-wide y **preexistente**; salida apuntada (sería decisión de la API de las primitivas, no de este fichero) | **Verificado en el código**: `button.tsx:46` `extends React.ComponentProps<'button'>`, `card.tsx:33` `extends React.ComponentProps<'div'>`, `wordmark.tsx:29` `extends React.ComponentProps<'span'>` |
| 2 · Grupos `components/brand/**` / `components/overlay/**` | **N/A, DESCARTADOS**: su intención upstream es «importa del `index.js`»; aquí el import profundo (`@/components/ui/segmented`) **es** el patrón sancionado, y portar la regla **prohibiría el uso correcto** | **Verificado**: no existe `apps/web/src/components/ui/index.ts` |
| 3 · Los 4 tokens | **No son regla, son INVENTARIO** (`x-omelette.tokens` no es una sección de `rules`); su protección permanente vive en `globals.adherence.test.ts`, con puntero explícito | Correcto — y ese test **muerde**, control negativo del punto 14 |

El bloque cierra además con lo que la reconciliación **sí** añadió (hex crudo en contexto de
estilo, `fontFamily` en `style`) y con un **cuarto descarte que yo no había pedido**: la
regla `\d+px` del oxlintrc, «porque design-system.md §3.1 SANCIONA explícitamente el px por
`style` inline para valores no tokenizables (`Wordmark`, `ConfidenceBar`, `CodeBlock` lo
usan): portarla pondría en rojo código correcto». **Verificado**: `design-system.md:273`
documenta exactamente esa excepción para `Wordmark` («excepción §3.1 para px no
tokenizables»). Es un ítem de más, no de menos.

### (b) ¿Se cerró la asimetría?

**Sí, y es el punto exacto que fallaba.** El propio texto nombra el defecto y por qué se
escribe donde se escribe:

> «Se documenta aquí —y no solo en el informe de la tarea— porque el config detalla las
> reglas que SÍ se añadieron: callar sobre las descartadas haría indistinguible “lo evalué y
> lo descarté” de “se me pasó”, que es justo lo que esta reconciliación existe para impedir.»

Un lector que abra `eslint.config.ts` ve ahora, en el mismo sitio: las reglas activas, las
reglas añadidas por esta reconciliación con su motivo, y **las cuatro familias descartadas
con su motivo y su consecuencia**. La distinción «evaluado y descartado» vs «pasado por
alto» ya es posible sin salir del fichero. La justificación no depende de ningún informe
externo.

### (c) `pnpm gate`

**Verde** (`gate-reverify.txt`), ejecutado en aislamiento con el `pnpm dev` ya detenido:
lint, typecheck (4 paquetes), format:check, knip, readme:status:check y **63 ficheros /
693 tests** en 64,7 s. `redact.test.ts` no cayó.

**Control negativo del lint re-ejecutado** (`negctl-lint-reverify.txt`), porque el fichero
que cambió es precisamente la configuración del linter y un bloque de comentarios mal
cerrado podría haber neutralizado el array de reglas: `bg-blue-500` reinyectado en
`segmented.tsx` → `1 problem (1 error, 0 warnings)`, `no-restricted-syntax` +
`[DS adherencia · rampa cruda]`, exit 1. Fichero restaurado y `sha256sum -c` → **OK**.

## Resultado del punto 15

| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 15 | (Entrega) Deuda del `_adherence.oxlintrc.json`: reglas añadidas **o el porqué escrito** | Las reglas que faltaban están y muerden; los 4 descartes están **escritos en el árbol, junto a las reglas**, con motivo, matiz honesto y consecuencia; las afirmaciones verificables se contrastaron contra el código | `eslint.config.ts:213-250`, `gate-reverify.txt`, `negctl-lint-reverify.txt` | ✅ |

## Coste real (re-verificación)

**$0** — sin APIs de pago. Acumulado de T6.3: **$0** (vs estimado $0).

## Veredicto final

**PASS** — los 15 puntos en verde. La Verificación literal ya pasaba entera en la primera
pasada (14/14, incluidos los dos controles negativos ejecutados por el verifier); el único
bloqueo era la Entrega de la Deuda heredada, y está resuelta en el sitio correcto: **el
config, junto a las reglas**, no un informe aparte. El fix mejora sobre lo pedido al
documentar también el descarte de la regla `\d+px`, que yo no había señalado.

**Seguimiento menor (no bloquea)**: el cierre de T6.3 en `docs/dev-loop/journal.md` sigue
teniendo solo la línea «⏳ T6.3 iniciada». La entrada de cierre —con la reconciliación en
dos líneas— la escribe el bucle al marcar la tarea; queda anotado aquí para que no se
pierda.

**Rarezas**: las tres ya anotadas en el FAIL siguen vigentes y ninguna es de T6.3 (warnings
de Edge Runtime en `instrumentation.ts`, el `id` de `Section` que no ancla, y el
`_ds_bundle.js` obsoleto de `docs/mockups/assets/`).
