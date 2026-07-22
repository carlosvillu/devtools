# Mockups de páginas — la referencia visual de la UI

Catálogo de los **mockups aprobados por el usuario** para cada página de la app. Regla de trabajo 7 del planning (vinculante): **toda página con pantalla propia parte de un mockup HTML aprobado que vive en esta carpeta**, construido con los **tokens del design system** (los mismos de `apps/web/src/app/globals.css` / `docs/design-system/tokens/`). Una página que se desvíe de su mockup sin acuerdo explícito con el usuario es un error de review. Páginas nuevas sin mockup: se acuerda el layout con el usuario ANTES de implementarlas.

**Qué son** (y qué NO son):
- Cada `<pagina>.html` es un mockup autónomo renderizable en local (`file://` en un navegador). Es la **fuente de la intención de layout**: estructura, jerarquía, secciones, densidad.
- Cada `<pagina>.png` (opcional) es la captura de ese HTML — la referencia visual rápida.
- **NO son código de producción**: al desarrollar la página real se reproduce ESE layout con los componentes `components/ui/` del DS — ni se copia el HTML crudo del mockup, ni se inventa una página nueva. Si el mockup pide un patrón que ningún componente cubre, el componente se crea en el DS primero (skill frontend); no se improvisa HTML «provisional».
- Si un mockup contiene lógica de ejemplo (cálculos, datos hardcodeados), **su layout es vinculante; su script NO** — la lógica real la dictan PRD y backend.

## Convención de nombres

- Un fichero por página, kebab-case, nombrado por la ruta: `dashboard.html` (`/`), `settings.html` (`/settings`), `runs-id.html` (`/runs/[id]`), `auth.html` (`/login`). Checkpoints/modales con pantalla propia: por su función (`brief-editor.html`).
- Desviaciones acordadas respecto al mockup (piezas que se omiten o cambian a propósito) se anotan en la sección «Notas de fidelidad» de este README, con fecha — así el reviewer no exige lo que se descartó.

## Cómo se referencia desde el planning

La tarea que desarrolla la página lleva una línea en su entrada:

```markdown
- **Mockup**: docs/mockups/<pagina>.html
```

El implementer LEE el mockup (y su `.png`) antes de escribir la página; el reviewer rechaza desviaciones no acordadas.

## Fuente de los mockups

Los mockups los aprobó el usuario en el bootstrap (2026-07-17) y viven en un
proyecto de Claude Design:
**`https://claude.ai/design/p/1132e88c-090e-42ad-a121-490714cf7ec5`**
(fichero `devtools Mockups.html`; componentes en `variant-claro.jsx`, y desde F6 también
en `variant-compose.jsx` — la pantalla de componer).

**Variante elegida: A — "Claro"** (light, centrado, airy). Las otras variantes del
canvas (`variant-oscuro.jsx`, y `variant-mobile.jsx` como referencia responsive)
NO son la referencia de layout salvo donde se diga explícitamente.

Los ficheros `.html` de esta carpeta son un **espejo local** de esos mockups: los
generó **TD.1** con `DesignSync`, igual que el espejo de `docs/design-system/`. Ya
están volcados (variante A: `field/history/login/signup` + `mobile`); su construcción y
dependencias se describen en «Cómo están construidos» más abajo. T0.4 (que construye
`/login` y `/signup`) depende de TD.7.

## Mapa página → mockup

| Página | Ruta | Mockup | Componente en el canvas | Tarea | Captura |
|---|---|---|---|---|---|
| El campo | `/` | `field.html` | `FieldClaro` | **T1.5** (interacción en **T1.6**) | _(pendiente)_ |
| Historial | `/history` | `history.html` | `HistoryClaro` | **T2.2** | _(pendiente)_ |
| Entrar | `/login` | `login.html` | `LoginClaro` | **T0.4** | _(pendiente)_ |
| Crear cuenta | `/signup` | `signup.html` | `SignupClaro` | **T0.4** | _(pendiente)_ |
| Componer | `/compose` | `compose.html` | `ComposeClaro` (`variant-compose.jsx`) | **T6.6**–**T6.8** | _(pendiente)_ |
| _(referencia responsive)_ | — | `mobile.html` | `variant-mobile.jsx` | referencia de T1.5 y T2.2 | _(pendiente)_ |
| _(referencia responsive)_ | — | `compose-mobile.html` | `ComposeClaroM` (`variant-compose.jsx`) | referencia de T6.6–T6.8 | _(pendiente)_ |

`/design-system` no aparece aquí: es el showcase del design system (fases TD.1–TD.5),
no una pantalla de producto.

## Cómo están construidos (para renderizar en `file://`)

Cada `<pagina>.html` reproduce **su artboard de la variante A** exactamente como lo
pinta el canvas maestro (`devtools Mockups.html`): reutiliza el mismo `design-canvas`
(`DesignCanvas`/`DCSection`/`DCArtboard`) y los mismos componentes del DS, aislando una sola
sección/artboard en lugar del canvas de 4 secciones. `mobile.html` renderiza la sección
completa **Variante A · Claro — Móvil** (4 artboards) como referencia responsive.

`compose.html` y `compose-mobile.html` (T6.2, 2026-07-22) siguen el mismo patrón sobre
`variant-compose.jsx`. La referencia móvil de componer va en **fichero propio** en vez de
sumarse a `mobile.html` porque `ComposeClaroM` vive en `variant-compose.js`, no en
`variant-mobile.js`: `mobile.html` espeja la sección «Móvil» del canvas de TD.1 y meterle
un módulo de otra sección rompería esa correspondencia.

**Todo carga sin red y sin transpilación en runtime**, para que los HTML abran
directamente con `file://` (sin servidor, sin flags). Dos decisiones lo hacen posible:

- **JSX precompilado a JS plano (no `@babel/standalone` en runtime).** El canvas
  original carga los `.jsx` con `<script type="text/babel" src="…">`, que babel-standalone
  resuelve por **XHR**. Chrome **bloquea XHR bajo `file://`**, así que ese patrón deja los
  componentes en `undefined` y la página EN BLANCO. Aquí los `.jsx` se compilan a `.js`
  plano (`design-canvas.js`, `ui-shared.js`, `variant-claro.js`, `variant-mobile.js`,
  `variant-compose.js`) y se cargan con `<script src>` normales, que sí funcionan desde
  `file://`. El bloque `App` de cada página va compilado e inline, envuelto en una IIFE
  (`(function(){…})()`) para que sus `const` no colisionen en el ámbito global con las
  funciones que expone `design-canvas.js`.
  Regenerar los `.js`: compilar cada `.jsx` hermano con Babel preset `react` (mismo
  transform que usaba el canvas). Babel no está en las dependencias del repo (nada de
  producción lo necesita), así que se instala en un directorio de usar y tirar. **Copiar y
  pegar tal cual desde `docs/mockups/`:**

  ```bash
  # 1. entorno efímero con Babel + el preset
  BABEL_ENV_DIR="$(mktemp -d)"
  (cd "$BABEL_ENV_DIR" && npm init -y >/dev/null &&
     pnpm add @babel/core@7.29.7 @babel/cli@7 @babel/preset-react@7 >/dev/null)

  # 2. compilar, desde docs/mockups/, con el preset por RUTA ABSOLUTA
  "$BABEL_ENV_DIR/node_modules/.bin/babel" \
    --presets "$BABEL_ENV_DIR/node_modules/@babel/preset-react" \
    assets/<modulo>.jsx -o assets/<modulo>.js

  rm -rf "$BABEL_ENV_DIR"
  ```

  **El preset va por ruta absoluta a propósito.** Babel resuelve los presets desde el
  directorio del fichero fuente, no desde donde vive el binario: con el nombre corto
  (`--presets @babel/preset-react`) —o lanzándolo con `pnpm dlx`, que deja los paquetes en un
  temporal— la orden revienta con `ERR_MODULE_NOT_FOUND`, porque ni `docs/mockups/` ni la
  raíz del repo tienen `@babel/preset-react` en su `node_modules`. Comprobado en T6.2 en las
  dos direcciones: la forma de arriba funciona, la corta falla.

  Control de fidelidad (T6.2): esa orden reproduce `variant-claro.js` **byte a byte** contra
  el fichero committeado en TD.1 — única diferencia, el committeado no lleva salto de línea
  final. Es la prueba de que el `.js` que se sube es el `.jsx` de al lado y nada más.
- **Fuentes self-hosted (0 CDNs), no Google Fonts.** El espejo del DS carga Geist por
  `@import` de `fonts.googleapis.com` (`docs/design-system/tokens/fonts.css`, línea 4), y
  `docs/design-system/styles.css` lo re-`@importa`. Abrir un mockup que enlazara cualquiera
  de los dos dispararía peticiones a un CDN. Por eso los HTML **no** enlazan ni `fonts.css`
  ni `styles.css` del espejo: enlazan `assets/fonts.css`, que declara `@font-face` de Geist
  y Geist Mono apuntando a `assets/fonts/*.woff2` locales (las fuentes variables del paquete
  npm `geist`, OFL-1.1 — las mismas que la app self-hostea con next/font). Los 5 token files
  restantes del DS (`colors`, `typography`, `spacing`, `effects`, `base`) sí se reutilizan
  del espejo por ruta relativa (`../design-system/tokens/*.css`), sin duplicarlos y sin CDN.

Inventario de `assets/`:

- `assets/vendor/` — **React 18.3.1 + ReactDOM 18.3.1** self-hosteados (no CDN, no babel).
  Byte-idénticos a los de unpkg que usa el canvas (`sha384` verificado contra los
  `integrity=` del canvas).
- `assets/_ds_bundle.js` — copia del bundle compilado del DS (expone
  `window.DevtoolsDesignSystem_9d6b47`). Es un artefacto generado que se trae aquí porque los
  mockups lo necesitan para montar los componentes. El espejo de `docs/design-system/` lo
  excluye a propósito (es build output, no fuente); esta copia bajo `docs/mockups/` es una
  excepción consciente. **Se copia del proyecto de MOCKUPS**, no del proyecto del DS:
  `_ds/devtools-design-system-9d6b478a-…/_ds_bundle.js`. Refrescado en T6.2 (2026-07-22)
  porque el de TD.1 no traía `Segmented` y `variant-compose.js` lo desestructura en su
  primera línea: sin refrescarlo, `Segmented` queda `undefined` y `compose.html` sale rota.
  Si vuelve a refrescarse, hay que re-renderizar los mockups anteriores: en T6.2 el diff fue
  puramente aditivo (41 líneas, solo `Segmented`) y el recuento de nodos de los 5 mockups
  previos salió **idéntico** antes y después (166/240/64/65/461).
- `assets/*.js` — los 4 módulos del canvas **precompilados**; `assets/*.jsx` son sus fuentes
  verbatim (referencia; no los carga ningún HTML).
- `assets/fonts.css` + `assets/fonts/{Geist,GeistMono}-Variable.woff2` — Geist self-hosted.

**Verificado en navegador (`agent-browser --args "--no-sandbox"`, `file://`)**: los 7
renderizan con contenido y **0 errores de consola**; la pestaña de red no muestra **ningún**
host externo (solo `file://` y un `data:` SVG inline del grid del canvas). 0 peticiones a
Google Fonts ni a ningún CDN. Re-verificado en T6.2 (2026-07-22) sobre los 5 de TD.1 más
`compose.html` y `compose-mobile.html`.

## Notas de fidelidad

- **2026-07-17 · Resuelto en TD.1 — `variant-mobile.jsx` contiene las DOS variantes**
  («both variants»): expone `FieldClaroM/HistoryClaroM/LoginClaroM/SignupClaroM` **y** sus
  equivalentes `*OscuroM`. La **referencia responsive de la variante A** son los `*ClaroM`
  (los que renderiza `mobile.html`); los `*OscuroM` son de la variante B y no se usan como
  referencia de T1.5/T2.2.
### Componer (`compose.html` / `compose-mobile.html`) — desviaciones acordadas en F6

Todas están decididas con el usuario **antes** de escribir código (bloque de cabecera de F6
en `planning.md`) y se anotan aquí para que el reviewer no exija lo que se descartó.

- **2026-07-22 · El JWT firmado del artboard es DECORATIVO — su layout vincula, su token
  NO.** Es la nota más importante de esta pantalla. La firma que muestra el mockup,
  `SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`, es la **firma canónica de jwt.io** —la del
  payload de ejemplo «John Doe» con el secreto `your-256-bit-secret`— pegada bajo un header y
  un payload de `carlos`. Verificado con `node:crypto` al planificar T6.1: **ningún secreto
  produce esa firma para ese payload**, así que asertar contra ese literal sería un test
  imposible de poner en verde. Los goldens de firma salen de vectores publicados + control
  cruzado contra `node:crypto` (T6.5/T6.6). El `MINIFIED` del artboard sí es exacto y sí se
  usa. Es el caso de libro de la regla general de arriba: «si un mockup contiene lógica de
  ejemplo, su layout es vinculante; su script NO».
- **2026-07-22 · Algoritmos de firma: solo `HS256`.** El artboard ofrece
  `HS256`/`HS384`/`HS512`/`RS256` en el `Select` del panel de firma. En v1 se muestra **solo
  HS256**: RS256 exige RSA en el cliente (imposible sin criptografía pesada) y HS384/512
  exigen SHA-384/512 puros que nada más del producto usa.
- **2026-07-22 · La cabecera del artboard no es la nuestra.** El mockup pinta su propia nav
  («el campo / historial / Entrar»). La implementación conserva el **`SiteHeader` real del
  producto** (sesión, historial, Wordmark → `/`).
- **2026-07-22 · Ids de transformación con el naming de §6.3.** Los chips de la paleta se
  etiquetan `sha256` y `md5`; los ids reales son `hash.sha256` y `hash.md5`. La **etiqueta
  visible** sí es la del mockup; el id no.
- **2026-07-22 · La fila de una entrada compuesta en `/history` no tiene mockup propio.**
  Reutiliza `HistoryRow` con copy nuevo. Si al verla el usuario la quiere distinta, se pide
  mockup antes de rehacerla.
- **2026-07-22 · El copy de privacidad del artboard es FALSO, no viejo — no se copia nunca.**
  El `Callout` («Lo que escribes y el secreto de firma se procesan en el servidor solo para
  construir la cadena») y el aviso del panel de firma («El secreto viaja al servidor solo
  para firmar…») describen **un producto que decidimos NO construir**. La decisión 1 de F6 es
  exactamente la contraria: **el motor de composición corre en el cliente y no existe
  `/api/compose`**; ni el fuente ni el secreto salen del navegador, y eso es lo que hace
  verificable en la pestaña de red la promesa pública del PRD §11. Copiar ese texto sería
  publicar una afirmación de seguridad falsa sobre nuestro propio producto. El **layout** del
  callout es vinculante; su **texto** lo escribe **T6.8**, que es la tarea que redacta el
  copy real de la pantalla.
- **2026-07-22 · `variant-compose.jsx` trae más artboards de los que se vuelcan.** Expone
  también `ComposeOscuro`/`ComposeOscuroM` (variante B, no es nuestra referencia) y
  `PlaceToggle`/`PlaceRoute`/`PlaceContextual`, que eran las **3 opciones de ubicación** que
  se le presentaron al usuario. **No son pantallas del producto** y por eso no tienen mockup
  local. Lo decidido (F6, decisión 2): una mezcla de la 1 y la 2 — una sola pantalla de
  trabajo con el conmutador `Segmented`, en dos URLs (`/analyze` decodifica, `/compose`
  compone). La opción 3 («invertir» desde un resultado) queda **diferida**, fuera de F6.
- **2026-07-22 · `compose-mobile.html` muestra la paleta CERRADA.** Es lo que hace el
  artboard aguas arriba: `ComposeClaro` se renderiza con `openPalette` y `ComposeClaroM` sin
  él. No es una desviación nuestra; la referencia de la paleta desplegada es `compose.html`.

### Otras

- **2026-07-17 · Capturas `.png` pendientes**: el entorno del bucle no tiene navegador con
  las librerías del sistema para renderizar Chrome, así que no se generaron los `.png`. Los
  `.html` sí se validaron (sintaxis JSX compilada con esbuild, rutas de recursos resueltas,
  `sha384` del vendor verificado). La captura visual queda para verificación con navegador.
  **Actualización 2026-07-22 (T6.2)**: el entorno del bucle **ya renderiza** con
  `agent-browser --args "--no-sandbox"`, así que los 7 mockups se han visto de verdad. Los
  `.png` siguen sin committearse (nadie los ha pedido y son binarios regenerables), pero ya
  no hay impedimento técnico: la columna «Captura» puede rellenarse cuando se quiera.
