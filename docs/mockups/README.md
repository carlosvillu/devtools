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
(fichero `devtools Mockups.html`; componentes en `variant-claro.jsx`).

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
| _(referencia responsive)_ | — | `mobile.html` | `variant-mobile.jsx` | referencia de T1.5 y T2.2 | _(pendiente)_ |

`/design-system` no aparece aquí: es el showcase del design system (fases TD.1–TD.5),
no una pantalla de producto.

## Cómo están construidos (para renderizar en `file://`)

Cada `<pagina>.html` reproduce **su artboard de la variante A** exactamente como lo
pinta el canvas maestro (`devtools Mockups.html`): reutiliza el mismo `design-canvas`
(`DesignCanvas`/`DCSection`/`DCArtboard`) y los mismos componentes del DS, aislando una sola
sección/artboard en lugar del canvas de 4 secciones. `mobile.html` renderiza la sección
completa **Variante A · Claro — Móvil** (4 artboards) como referencia responsive.

**Todo carga sin red y sin transpilación en runtime**, para que los 5 HTML abran
directamente con `file://` (sin servidor, sin flags). Dos decisiones lo hacen posible:

- **JSX precompilado a JS plano (no `@babel/standalone` en runtime).** El canvas
  original carga los `.jsx` con `<script type="text/babel" src="…">`, que babel-standalone
  resuelve por **XHR**. Chrome **bloquea XHR bajo `file://`**, así que ese patrón deja los
  componentes en `undefined` y la página EN BLANCO. Aquí los `.jsx` se compilan a `.js`
  plano (`design-canvas.js`, `ui-shared.js`, `variant-claro.js`, `variant-mobile.js`) y se
  cargan con `<script src>` normales, que sí funcionan desde `file://`. El bloque `App` de
  cada página va compilado e inline, envuelto en una IIFE (`(function(){…})()`) para que sus
  `const` no colisionen en el ámbito global con las funciones que expone `design-canvas.js`.
  Regenerar los `.js`: compilar cada `.jsx` hermano con Babel preset `react` (mismo
  transform que usaba el canvas).
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
  excepción consciente.
- `assets/*.js` — los 4 módulos del canvas **precompilados**; `assets/*.jsx` son sus fuentes
  verbatim (referencia; no los carga ningún HTML).
- `assets/fonts.css` + `assets/fonts/{Geist,GeistMono}-Variable.woff2` — Geist self-hosted.

**Verificado en navegador (`agent-browser`, `--no-sandbox`, `file://`)**: los 5 renderizan
con contenido y **0 errores de consola**; la pestaña de red no muestra **ningún** host
externo (solo `file://` y un `data:` SVG inline del grid del canvas). 0 peticiones a Google
Fonts ni a ningún CDN.

## Notas de fidelidad

- **2026-07-17 · Resuelto en TD.1 — `variant-mobile.jsx` contiene las DOS variantes**
  («both variants»): expone `FieldClaroM/HistoryClaroM/LoginClaroM/SignupClaroM` **y** sus
  equivalentes `*OscuroM`. La **referencia responsive de la variante A** son los `*ClaroM`
  (los que renderiza `mobile.html`); los `*OscuroM` son de la variante B y no se usan como
  referencia de T1.5/T2.2.
- **2026-07-17 · Capturas `.png` pendientes**: el entorno del bucle no tiene navegador con
  las librerías del sistema para renderizar Chrome, así que no se generaron los `.png`. Los
  `.html` sí se validaron (sintaxis JSX compilada con esbuild, rutas de recursos resueltas,
  `sha384` del vendor verificado). La captura visual queda para verificación con navegador.
