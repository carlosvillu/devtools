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
genera **TD.1** con `DesignSync`, igual que el espejo de `docs/design-system/`.
Hasta que TD.1 cierre, esta carpeta está vacía y la fuente es el canvas de Claude
Design — por eso T0.4 (que construye `/login` y `/signup`) depende de TD.7.

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

## Notas de fidelidad

- **2026-07-17 · Pendiente de confirmar en TD.1**: no está determinado si
  `variant-mobile.jsx` corresponde a la variante A o a la B. Si resultara ser de la
  B, TD.1 lo anota aquí y pide criterio al usuario antes de usarla como referencia
  responsive de T1.5/T2.2.
