# TD.1 — Verificación (PARCIAL — BLOQUEADA por falta de navegador)

**Estado**: ⚠ **BLOQUEADA**, NO cerrada. La parte automatizable pasa; las cláusulas
visuales/interactivas no se han podido ejecutar porque el entorno no tiene un
navegador operable (ver «Bloqueo» abajo). Este report se completará cuando haya
navegador o juicio humano. **La tarea NO se marca `[x]`.**

Fecha: 2026-07-17 · Coste: $0 (D8, sin APIs de pago).

## Cláusulas de la Verificación (planning, TD.1, ya corregida)

> `/design-system` muestra los specimens de fundaciones; el switcher cambia el tema
> en vivo; comparación visual contra `guidelines/` del espejo sin desviaciones
> perceptibles; los 5 HTML de `docs/mockups/` abren en el navegador y se parecen a
> lo que muestra el canvas de Claude Design; ninguna petición a CDNs externos en la
> pestaña de red.

| # | Cláusula | ¿Automatizable sin navegador? | Resultado |
|---|---|---|---|
| 1 | `/design-system` muestra los specimens de fundaciones | Parcial (HTML servido) | ✅ El HTML servido por `pnpm dev` en `localhost:3000/design-system` contiene «Fundaciones», «Color», «Tipografía», «Espaciado», «Radios», «Sombras», los nombres de token (`--surface`, `--accent`, `--code-key`, `--space`, `--radius`, `--shadow`) y el switcher («Tema del design system», «Claro», «Oscuro»). El **pintado** real necesita navegador. |
| 2 | El switcher cambia el tema en vivo | **No** (interacción JS) | ⏸ Pendiente de navegador. El mecanismo está: `globals.css` tiene overrides `[data-theme='dark']`; `theme-switcher.tsx` escribe `data-theme` en `<html>`. Su conmutación la cubre un test jsdom, pero «en vivo en el navegador» no se ha observado. |
| 3 | Comparación visual contra `guidelines/` sin desviaciones | **No** (juicio visual) | ⏸ Pendiente de navegador o juicio humano. |
| 4 | Los 5 mockups abren en el navegador y se parecen al canvas | **No** (juicio visual) | ⏸ Pendiente de navegador o juicio humano. |
| 5 | Ninguna petición a CDNs externos en la pestaña de red | Parcial (análisis estático) | ✅(parcial) El HTML servido referencia **0 hosts externos**; el CSS de la página usa `@font-face` con `url("../media/Geist*.woff2")` **self-hosted** (0 Google Fonts); ningún `@import` a CDN. Los URLs externos que aparecen son **strings de documentación dentro de los bundles dev de Next** (github.com, react.dev, specs), no peticiones de red. La pestaña de red REAL necesita navegador para ser definitiva. |

## Bloqueo — el entorno no tiene navegador operable

- `agent-browser` (0.32.1) está instalado y descarga su propio Chrome, pero Chrome
  **no arranca**: faltan ~20 librerías de sistema (`libatk-1.0.so.0`,
  `libatk-bridge`, `libcups`, `libasound`, `libgbm`, `libcairo`, `libpango`,
  `libX*`, `libatspi`, `libavahi`, `libgtk-3`…). No hay `sudo` con contraseña.
- **Workaround verificado por el bucle**: `apt-get download` de esas libs (sin root)
  + extracción a un prefijo local + `LD_LIBRARY_PATH` → **Chrome headless arranca y
  renderiza** (probado: `chrome --headless --dump-dom localhost:3000/api/health`
  devolvió `{"ok":true}` en DOM real). Las libs quedan en el scratch del job.
- **Pared**: `agent-browser` no propaga `LD_LIBRARY_PATH` a su subproceso Chrome, y
  el intento de instalar un wrapper del binario fue bloqueado por el clasificador de
  permisos. Por eso el gate CUA (que usa `agent-browser`) no puede correr aquí sin
  una decisión del usuario (provisionar libs / permitir el wrapper / juicio humano).

**Impacto más allá de TD.1**: sin navegador, el gate CUA no puede ejecutarse en
NINGUNA tarea web futura — TD.7, T0.4, T0.5, y todo F1/F2 —, ni los specs de
Playwright permanentes. Es un prerequisito de entorno, no un fallo de TD.1.

---

# TD.1 — Verificación con navegador (COMPLETADA) — **VEREDICTO: FAIL**

- **Fecha**: 2026-07-17 · **Ejecutor**: verifier (contexto fresco) · agent-browser 0.32.1 · sesión `ttd.1` · Chrome con `--no-sandbox`
- **Sistema**: árbol de trabajo de TD.1 (todo staged, SIN commitear; `HEAD=230a9a8`, el diff de TD.1 sobre él). `pnpm dev` fresco en :3000 (maté un dev server huérfano de la sesión previa que ocupaba :3000 para garantizar que verifico el código actual). Health `{"ok":true}`. Sin Postgres (no requerido).
- **Gate previo**: `pnpm gate` en verde (57 tests / 9 ficheros).
- El bloqueo de navegador quedó resuelto (libs de sistema instaladas por el usuario). `--no-sandbox` obligatorio, confirmado.

## Resultado por cláusula

| # | Cláusula | Resultado | Evidencia |
|---|---|---|---|
| 1 | `/design-system` muestra los specimens de fundaciones | ✅ **PASS** | `01-design-system-claro.png`: pintan de verdad color (7 rampas + alias + bloque de código con syntax highlight), tipografía (Geist / Geist Mono, escala, pesos, tracking, interlineado), espaciado (rejilla 4px), radios, sombras. |
| 2 | El switcher cambia el tema EN VIVO | ✅ **PASS** | Click «Oscuro»: `<html data-theme>` pasa `null`→`dark`, `bg` de `lab(98)`→`lab(3.3)` SIN reload (URL intacta). Vuelta a «Claro»: `dark`→`null`. `01/02/03-*.png`. |
| 3 | Paridad visual vs `guidelines/` del espejo | ✅ **PASS** (con matiz de juicio) | `guideline-*.png` vs showcase: accent=blue-600, ring=blue-500, escala de radios (4/6/8/12/16/full), rejilla 4px y sombras COINCIDEN en valor. La página reinterpreta la presentación (declarado en `page.tsx`: «espeja la INTENCIÓN»), no es pixel-idéntica, pero sin desviación de token perceptible. Screenshots pareados listos para ojo humano. |
| 4 | Los 5 mockups abren en el navegador y se parecen al canvas | ❌ **FAIL** | Los 5 (`login/signup/field/history/mobile`) renderizan **PANTALLA EN BLANCO** en `file://`: `#root` vacío, `body.innerText.length===0`, error React «Element type is invalid … got: undefined». `mockup-*.png` (blancos), `mockup-*-errors.txt`. |
| 5 | Ninguna petición a CDNs externos (pestaña de red REAL) | ❌ **FAIL** (mockups) / ✅ (design-system) | `/design-system`: 21 peticiones, **TODAS a localhost**, fuentes self-hosted (`design-system.har`). **Mockups: 5 peticiones a `https://fonts.googleapis.com`** (una por mockup) → viola la cláusula dura (`mockups.har`). |

## Cláusula 4 — causa raíz (mockups en blanco en `file://`)

- `React=object`, `Babel=object` cargan (son `<script src>` planos), pero `window.DesignCanvas / DCSection / DCArtboard / LoginClaro` = **todos `undefined`**.
- Los componentes viven en scripts **externos** `<script type="text/babel" src="assets/design-canvas.jsx">` (+ `ui-shared.jsx`, `variant-claro.jsx`). Babel-standalone los carga por **XHR/fetch**, y Chrome **bloquea XHR a ficheros locales bajo origen `file://`** (la propia consola lo avisa: «You might need to use a local HTTP server (instead of file://)»). Los `.jsx` nunca compilan → los componentes nunca se definen → `App` referencia `undefined` → React lanza y no pinta nada.
- **Control que aísla la causa**: servidos por HTTP (`python3 -m http.server` sobre `docs/`), el mismo `login.html` **renderiza perfecto** (form /login de marca, botón azul, etc.): `#root` con hijos, `innerText.length=305`, `DesignCanvas/LoginClaro = function`. Ver `mockup-login-via-http-CONTROL.png`. → El contenido del mockup es válido; **lo que falla es exclusivamente la entrega por `file://`**, que es justo lo que la cláusula (y el brief) exigen.
- Contradice el claim del journal/README «5 mockups renderizables offline en file://»: **es falso** tal cual están construidos (el implementer probablemente los probó por HTTP o con `--allow-file-access-from-files`).
- **Fix (implementer)**: que los mockups no dependan de XHR bajo `file://` — inline del JSX en el HTML, **o** precompilar los `.jsx` a `<script>` JS plano (sin fetch), **o** cambiar el contrato a «se sirven por HTTP». Un `<script src>` plano sí carga desde `file://`; el `type="text/babel" src=` no.

## Cláusula 5 — causa raíz (Google Fonts CDN en los mockups)

- `docs/design-system/tokens/fonts.css:4`: `@import url("https://fonts.googleapis.com/css2?family=Geist…")`.
- Los mockups enlazan ese `tokens/fonts.css` del espejo → cada apertura dispara la petición a `fonts.googleapis.com` (5/5, incluso con la página en blanco: el `<link>` CSS carga aunque el JSX no).
- El espejo `docs/design-system/` es de solo-lectura (no se edita a mano), pero **los mockups son artefacto de TD.1** y su comportamiento de red viola la cláusula dura. El análisis estático de la verificación parcial dio «0 Google Fonts» porque solo miró el HTML servido de `/design-system` (que sí self-hostea Geist vía Next), NO los mockups.
- **Fix (implementer)**: los mockups deben servir/incluir la fuente sin salir a `googleapis` (self-host de Geist en `assets/`, o un `fonts.css` local para mockups que no re-importe el CDN), sin editar el espejo. El `/design-system` de la app ya está bien.

## ASERCIÓN DE CONTRASTE (obligatoria) — medida real texto/fondo, ambos temas

Medido con canvas pixel-readback (sRGB) sobre los valores de token resueltos en `:root` (inmune al `transition-colors` del botón, que daba lecturas falsas mid-transición). Umbral 4.5:1 normal / 3:1 grande. Datos crudos: `tokens-contrast-{light,dark}.json`, `switcher-settled-dark.json`.

| Par (token) | Tema | Ratio | Umbral | ¿OK? |
|---|---|---|---|---|
| accent-fg / accent (botón primario) | claro | 5.69 | 4.5 | ✅ |
| **accent-fg / accent (botón primario)** | **oscuro** | **4.29** | 4.5 | ❌ |
| accent-subtle-fg / accent-subtle-bg (chip) | claro/oscuro | 6.97 / 10.16 | 4.5 | ✅ |
| success-subtle-fg / -bg | claro/oscuro | 5.14 / 11.91 | 4.5 | ✅ |
| **warning-subtle-fg / -bg** | **claro** | **4.41** | 4.5 | ❌ |
| warning-subtle-fg / -bg | oscuro | 11.21 | 4.5 | ✅ |
| danger-subtle-fg / -bg | claro/oscuro | 6.6 / 11.6 | 4.5 | ✅ |
| text / bg | claro/oscuro | 17.17 / 17.77 | 4.5 | ✅ |
| text-muted / bg | claro/oscuro | 4.62 / 7.45 | 4.5 | ✅ |
| **text-subtle / bg** | **claro/oscuro** | **2.51 / 4.05** | 4.5 | ❌ |
| **text-subtle / surface** | **claro/oscuro** | **2.63 / 3.72** | 4.5 | ❌ |
| code-fg / code-bg | claro/oscuro | 17.77 / 18.39 | 4.5 | ✅ |
| code-key/string/number / code-bg | claro/oscuro | ≥6.7 | 4.5 | ✅ |

**Ruteo de los hallazgos de contraste**: los 4 fallos provienen de **valores de token del DS** (volcados verbatim por TD.1; no es un defecto de código de TD.1), por lo que se REPORTAN aquí y se rutean como **candidatos a corregir en el DS**, no se ignoran:
- **`accent-fg`(blanco) / `accent`(blue-500) = 4.29 en OSCURO**: es el par del **botón primario**. Confirmado en el botón renderizado y asentado (`switcher-settled-dark.json`: 4.29; la lectura 1.98 fue artefacto de transición). Afecta a TODO botón primario en tema oscuro desde TD.2 — el más importante de rutear.
- **`warning-subtle-fg` / `-bg` = 4.41 en CLARO**: chip/badge de warning, justo por debajo de AA.
- **`text-subtle` = 2.51–4.05**: usado en captions/nombres de token pequeños (12px). Por debajo de AA en ambos temas.

## Coste real

$0 (D8, sin APIs de pago).

## VEREDICTO FINAL: **FAIL**

Cláusulas 1, 2 y 3 pasan. **Fallan 4 y 5**, ambas por los mockups: (4) los 5 mockups renderizan **en blanco** bajo `file://` (Babel no puede cargar los `.jsx` externos por XHR en origen `file://`), y (5) los mockups hacen **5 peticiones a `fonts.googleapis.com`** (CDN externo, cláusula dura violada). Además, la aserción de contraste destapa 4 pares de token del DS por debajo de AA (el más grave: botón primario en oscuro 4.29) — no son culpa de TD.1 (valores del espejo) pero se rutean al DS.

**Qué debe arreglar el implementer**:
1. Mockups que rendericen bajo `file://` sin XHR: inline del JSX o precompilar a `<script>` JS plano (no `type="text/babel" src=`).
2. Mockups sin salir a `fonts.googleapis.com`: self-host de la fuente en `assets/` (sin editar el espejo `docs/design-system/`).
3. Corregir el journal/README: el claim «renderizables offline en file://» es falso hoy.
4. (Ruteo al DS, no bloqueante de por sí) revisar los 4 pares de contraste < AA, sobre todo `accent-fg/accent` en oscuro.

---

# TD.1 — Verificación con navegador (TERCERA PASADA, tras los fixes) — **VEREDICTO: PASS**

- **Fecha**: 2026-07-17 · **Ejecutor**: verifier (contexto fresco) · agent-browser 0.32.1 · sesión `ttd1r` · Chrome `--no-sandbox`
- **Sistema**: árbol de trabajo de TD.1 con los fixes (todo staged, SIN commitear; `HEAD=230a9a8`; 156 ficheros staged). `pnpm dev` fresco en :3000 (maté el orphan previo). Health `{"ok":true}`. `pnpm gate` verde previamente.
- **Motivo de la re-verificación**: el implementer arregló los dos FAIL (mockups en blanco / Google Fonts CDN) y el usuario corrigió los 4 pares de contraste en el DS. Se re-ejecutan **las 5 cláusulas + la tabla de contraste completa** (un fix puede regresar otra cosa).

## Qué cambió y se confirmó en el árbol
- Mockups: `.jsx`→`.js` precompilados, cargados con `<script src>` planos (sin `type="text/babel"`, sin XHR); `App` inline compilado y en IIFE; `babel.min.js` eliminado del vendor.
- Mockups: HTML enlazan `assets/fonts.css` local (`@font-face` → `assets/fonts/*.woff2`); ya NO enlazan `tokens/fonts.css` ni `styles.css` del espejo. Verificado por grep: ninguno de los CSS que aún enlazan (`tokens/{colors,typography,spacing,effects,base}.css`) importa `googleapis`.
- Tokens: `globals.css` == espejo `docs/design-system/tokens/colors.css` (mismos valores y comentarios AA) — fidelidad confirmada por grep. Cambios: dark `--accent` blue-500→blue-600, dark `--accent-hover` blue-400→blue-700, light `--text-muted` gray-500→gray-600, light `--text-subtle` gray-400→gray-500, dark `--text-subtle` gray-500→gray-450 (step nuevo), `--amber-700` 0.560→0.545.

## Resultado por cláusula (todas re-ejecutadas)

| # | Cláusula | Resultado | Evidencia |
|---|---|---|---|
| 1 | `/design-system` muestra specimens de fundaciones | ✅ **PASS** | `r2-01-design-system-claro.png`: todo pinta (rampas, alias, code block, tipografía, espaciado, radios, sombras). Sin regresión por el cambio de tokens. Consola sin errores. |
| 2 | Switcher cambia el tema EN VIVO | ✅ **PASS** | Click «Oscuro»: `data-theme` null→dark, bg lab(98)→lab(3.3), URL intacta (sin reload); vuelta a «Claro» null. `r2-02-design-system-oscuro.png`. Consola limpia. |
| 3 | Paridad visual vs `guidelines/` | ✅ **PASS** | `r2-guideline-{colors-neutrals,colors-accent}.png`: los tokens se movieron IGUAL en showcase y guidelines (ambos por `var()`, espejo re-volcado idéntico). `gray-450` es adición AA nueva no especimenada en `colors-neutrals` — no es desviación (nota del coordinador confirmada). |
| 4 | Los 5 mockups abren en `file://` y se parecen al canvas | ✅ **PASS** | Los 5 renderizan: `#root` con hijos, `body.innerText` 305/343/1091/629/1597 chars, componentes = `function`, **0 errores de consola**. `r2-mockup-{login,signup,field,history,mobile}.png` muestran pantallas de producto (variante Claro: el campo con cadena jwt→json + code block terminal + confidence bar + badges; history; login; móvil 390px apilado). |
| 5 | Ninguna petición a CDNs externos (red REAL) | ✅ **PASS** | `/design-system` (`r2-design-system.har`): 21 req, **todas localhost**, 0 externas. Mockups (`r2-mockups.har`): 85 req, **todas `file://` o `data:`**, 0 hosts externos (ni googleapis/gstatic/unpkg/jsdelivr). Los 5 `data:` son SVG inline (el `www.w3.org` es namespace XML, no petición de red). |

## Tabla de contraste (RE-MEDIDA completa, tokens asentados de `:root`, ambos temas)

Medido con canvas pixel-readback (sRGB) sobre valores de token resueltos — inmune al `transition-colors`. Crudos: `r2-tokens-contrast-{light,dark}.json`. **0 fallos en ambos temas.**

| Par (token) | Claro | Oscuro | Umbral | ¿OK? |
|---|---|---|---|---|
| accent-fg / accent (botón primario) | 5.69 | **5.69** (era 4.29) | 4.5 | ✅ |
| accent-subtle-fg / -bg (chip) | 6.97 | 10.16 | 4.5 | ✅ |
| success-subtle-fg / -bg | 5.14 | 11.91 | 4.5 | ✅ |
| warning-subtle-fg / -bg | **4.70** (era 4.41) | 11.21 | 4.5 | ✅ |
| danger-subtle-fg / -bg | 6.6 | 11.6 | 4.5 | ✅ |
| text / bg | 17.17 | 17.77 | 4.5 | ✅ |
| text-muted / bg · /surface | 7.25 · 7.57 | 7.45 · 6.84 | 4.5 | ✅ |
| text-subtle / bg · /surface | **4.62 · 4.83** (era 2.51 · 2.63) | **5.57 · 5.11** (era 4.05 · 3.72) | 4.5 | ✅ |
| code-fg / code-bg | 17.77 | 18.39 | 4.5 | ✅ |
| code-key/string/number/punc/muted / code-bg | ≥6.7 | ≥6.9 | 4.5 | ✅ |

- Los 4 pares que fallaban ahora pasan; **orden muted > subtle preservado** (light muted 7.25 > subtle 4.62; dark muted 7.45 > subtle 5.57).
- **Sin regresiones**: todo par que ya pasaba sigue pasando (text/bg, code, success/danger-subtle iguales o mejores).
- Botón primario en oscuro renderizado y asentado: blanco sobre `blue-600` (`lab(42.3 ...)`), coherente con el token 5.69 (`switcher-settled` confirmado; la lectura mid-transición ~2 se evitó midiendo tokens).

## Coste real
$0 (D8, sin APIs de pago).

## VEREDICTO FINAL (tercera pasada): **PASS**
Las 5 cláusulas pasan y la tabla de contraste está limpia (todos ≥4.5 en claro y oscuro, sin regresiones). Los dos FAIL previos están resueltos: (4) los 5 mockups renderizan bajo `file://` sin errores de consola, (5) 0 peticiones externas en `/design-system` y en los 5 mockups. TD.1 queda verificada de punta a punta contra el navegador real.
