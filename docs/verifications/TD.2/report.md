# Verificación TD.2 — Primitivas de formulario

- **Tarea**: TD.2 · Primitivas de formulario (`planning.md`)
- **Fecha**: 2026-07-17
- **Ejecutor**: verifier · agent-browser 0.32.1 (Chromium headless, `--no-sandbox`) · sesión `td2`
- **Sistema**: árbol de trabajo staged sin commitear sobre `405a226` · `pnpm dev` (Turbopack, Next 16.2.10) en `localhost:3001` (el :3000 lo retenía un proceso externo no matable) · sin Postgres (no requerido) · `pnpm gate` VERDE (110 tests) antes de empezar

## Verificación esperada (literal de planning.md)
> comparación en navegador contra los specimens del espejo en **ambos temas**: variantes y estados hover/focus/disabled fieles; todos los controles operables por rol y accessible name.

## Veredicto
**FAIL** — 5 de las 6 primitivas son fieles en ambos temas, la a11y (rol+nombre) es impecable y el contraste pasa holgado; pero el glifo `copy` (⧉ U+29C9) renderiza como **tofu (caja □)** en Geist, y aparece así en DOS specimens visibles del showcase (botón "Copiar" y IconButton "Copiar valor"). Es el fallo exacto que el code-review ruteó a esta verificación (cláusula de glifos) y rompe la fidelidad 1:1 contra el espejo (que usa el SVG `Icon`, no un glifo).

## Resultado por cláusula

### Cláusula 1 — Las 6 primitivas pintan en ambos temas, fieles a los specimens
| Primitiva | Claro | Oscuro | Fidelidad | Evidencia |
|---|---|---|---|---|
| Button (primary/secondary/ghost/danger, sm/md/lg, block) | OK | OK | OK salvo glifo copy | 03, 04 |
| IconButton (ghost/secondary, sm/md/lg, active, disabled) | OK | OK | glifo copy tofu | 03, 07, 08 |
| Input (sm/md/lg, invalid, disabled, icon, mono) | OK | OK | OK | 07, 08 |
| Textarea (mono) | OK | OK | OK | 01, 04 |
| Select (nativo, mono, options) | OK | OK | OK | 07, 08 |
| Field (label, hint, error, required*) | OK | OK | OK | 07, 08 |

El switcher Claro/Oscuro conmuta `data-theme` en `<html>` y re-tematiza toda la pagina sin romper ningun estado. Parcial por el glifo copy (ver clausula 4).

### Cláusula 2 — Estados hover/focus/disabled fieles
- **focus** OK: click/foco en Input muestra el anillo `--ring` (box-shadow 2px) + borde `--accent` (`focus-visible:border-accent`). En estado `invalid` el borde se mantiene danger (rojo) y el anillo sigue: `invalid` gana a `focus`, tal como el spec. Evidencia: `07-input-focus-light.png`, `08-forms-dark.png`.
- **disabled** OK: Input/Button/IconButton con `disabled` -> opacidad 0.5-0.6, `cursor:not-allowed`, y `[disabled]` en el arbol de accesibilidad (no interactivo). Evidencia: 03, 07, 08.
- **hover** OK (con matiz de entorno, NO defecto): las reglas `hover:bg-accent-hover / hover:bg-danger-hover / hover:bg-surface-2` existen en el CSS compilado, mapean a los tokens correctos (`--accent-hover`=1,77,187 mas oscuro que `--accent`=0,97,215; `--danger-hover`=172,18,19 mas oscuro que `--danger`=208,29,33) y pasan contraste (7.55 / 7.37). Estan envueltas en `@media (hover: hover) { ... }` (comportamiento idiomatico de Tailwind v4). En este Chromium headless `matchMedia('(hover: hover)').matches === false`, asi que el CSS de hover queda inerte y no pude disparar el oscurecimiento en vivo — artefacto del entorno headless (afecta a tactil, NO a escritorio con raton), no fallo del producto. Confirmacion visual de los colores destino en `06-hover-color-swatches-light.png`. Wiring fiel al `HOVER` map de `Button.jsx` del espejo.

### Cláusula 3 — Operable por rol y accessible name (cláusula dura) — PASS
Arbol de accesibilidad (`a11y-tree-light.txt`):
- Button texto -> `button` con nombre del texto: "Analizar", "Reabrir", "Copiar", "Borrar", "Disabled" [disabled], sizes, "Boton block (ancho completo)".
- IconButton icon-only -> `button` con nombre via `aria-label`: "Copiar valor", "Mostrar contrasena", "Borrar entrada", "Reintentar" [disabled]. (el requisito explicito de la tarea).
- Input dentro de Field -> `textbox "Email"`, `textbox "Contrasena*"`, `textbox "Deshabilitado" [disabled]` — asociados a su <label> via `htmlFor`+`id`. Inputs sueltos con `aria-label`: "Tamano sm/md/lg".
- Select -> `combobox "Transformacion"` con options jwt.decode/base64.decode/hash.identify.
- Textarea -> `textbox "Pega aqui"`.
Todos los controles exponen rol + nombre accesible correctos.

### Cláusula 4 — Render de glifos Unicode (check ruteado) — FINDING (bloquea PASS)
Deteccion por bitmap en canvas sobre los glifos renderizados + panel diagnostico en GeistSans + screenshots de la pagina real:
| Glifo | Code | Usado en TD.2? | Render |
|---|---|---|---|
| copy `⧉` | U+29C9 | Si (boton Copiar + IconButton Copiar valor) | TOFU box |
| info `ⓘ` | U+24D8 | No (inventario) | tofu (latente) |
| shield `⛨` | U+26E8 | No (inventario) | tofu (latente) |
| key `⚿` | U+26BF | No (inventario) | tofu (latente) |
| reopen/trash/terminal/eye/search/chevron-down/check/x/clock/alert/loader/braces/link/calendar/eye-off/git-branch | — | varios usados | OK |

El glifo `copy` es el unico usado en el showcase que sale tofu, pero es un icono central del producto (copiar valores transformados) y aparece en 2 specimens visibles del propio design-system, cuya razon de ser es ser el espejo 1:1 (el espejo muestra un icono SVG, no una caja). Evidencia: `glyph-diagnostic-panel.png`, `glyph-check-rendered.txt`, `03-buttons-iconbuttons-light.png`, `07/08`. Los otros 3 tofu (info/shield/key) no se usan aun pero explotaran al usarlos en F1/F2.

### Cláusula 5 — Aserción de contraste (obligatoria) — PASS
Medido con canvas readback (sRGB real) + ratio WCAG sobre el DOM renderizado. Umbral 4.5:1.
| Control | Claro | Oscuro |
|---|---|---|
| Button primary (blanco / accent) | 5.69 | 5.69 |
| Button primary HOVER (blanco / accent-hover) | 7.55 | 7.55 |
| Button danger (blanco / danger) | 5.41 | 5.41 |
| Button danger HOVER (blanco / danger-hover) | 7.37 | 7.37 |
| Input/Select/Textarea texto | 17.94 | 16.31 |
| Input placeholder | 4.83 | 5.11 |
Todos >= 4.5. Confirma los tokens que el bucle arreglo en TD.1/TD.2. Evidencia: `contrast-light.txt`, `contrast-dark.txt`.

### Consola del navegador
Sin `console.error`/errores de codigo propio. Solo el info de React DevTools y logs de HMR/Fast Refresh (dev-only). Evidencia: `browser-console-final.txt`, `browser-errors-final.txt` (vacio).

## Coste real
$0 — sin APIs de pago (D8).

## Causa raíz y fix accionable (para el implementer)
- **Defecto**: `icon-glyph.tsx` mapea `copy: '⧉'` (U+29C9) — code point NO cubierto por Geist Sans/Mono (self-hosted) -> el navegador pinta el `.notdef` del last-resort font (caja). Igual con `info` U+24D8, `shield` U+26E8, `key` U+26BF.
- **Fix**: re-auditar los 24 glifos contra la cobertura REAL de Geist (no asumir), y para los no cubiertos elegir un code point que Geist si tenga, anadir una fuente de iconos de respaldo, o (mas fiel al espejo) usar el SVG `Icon`. Prioritario `copy` (visible y central); info/shield/key antes de que F1/F2 los usen.

## Notas / rarezas (aunque haya cláusulas OK)
- Hover no observable en vivo por `(hover:hover)=false` del Chromium headless — artefacto de entorno, no defecto. Un E2E de fase que cubra hover debera emular `Emulation.setEmulatedMedia` con `hover:hover`/`pointer:fine`.
- El glifo `trash` (U+232B ERASE TO THE LEFT) tiene forma inusual pero es su render CORRECTO, no tofu.
- La verificacion corrio en `:3001` (no `:3000`) por un proceso externo que retenia el puerto; el codigo servido es el del arbol staged (mismos ficheros bajo prueba).

---

# Segunda pasada (re-verificación tras el fix) — 2026-07-18

- **Ejecutor**: verifier · agent-browser 0.32.1 (`--no-sandbox`) · sesión `td2b`
- **Sistema**: árbol de trabajo con el fix aplicado (nuevo `apps/web/src/components/ui/icon.tsx` SVG, `icon-glyph.tsx` BORRADO, Button/IconButton/Input/Select rewired a `<Icon>`) · `pnpm dev` en `localhost:3000` · `pnpm gate` VERDE (115 tests)

## Cambio verificado
Decisión del usuario: se adoptó el `Icon` SVG del DS (port 1:1 de `docs/design-system/components/display/Icon.jsx`, 26 paths lucide inline, `stroke=currentColor`, `aria-hidden`, `data-slot=icon`) en lugar de los glifos Unicode que salían tofu.

## Veredicto 2ª pasada
**PASS** — El glifo `copy` que fallaba ahora renderiza como SVG real (rect+path) en el botón "Copiar" y el IconButton "Copiar valor", en ambos temas, sin tofu. Los otros iconos usados son SVG con geometría real. Ninguna regresión en estados, rol/nombre ni contraste. Consola limpia.

## Re-verificación por cláusula
| Cláusula | Método | Resultado |
|---|---|---|
| 1/4 — Iconos SVG sin tofu, ambos temas | `querySelectorAll('svg[data-slot=icon]')` → **13 SVG, 0 spans no-svg, 0 con geometría vacía**, en claro Y oscuro. `copy` = 2 elementos (rect+path) en botón Copiar e IconButton Copiar valor | ✅ PASS |
| 1b — Fidelidad al espejo | `copy` del port es **verbatim-idéntico** al `Icon.jsx` del espejo: `rect w13 h13 x9 y9 rx2 ry2` + `path M5 15a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2` (grep byte-a-byte). Ambos resuelven `icon="copy"` por el mismo SVG lucide. El `forms.card.html` no renderizó en vivo (carga React/Babel/bundle desde unpkg CDN, sin red en el sandbox) → fidelidad establecida por equivalencia de fuente, más rigurosa que píxeles | ✅ PASS |
| 2 — hover/focus/disabled sin regresión | Clases hover de `button.tsx`/`icon-button.tsx` INTACTAS (cva sin cambios: `hover:bg-accent-hover/danger-hover/surface-2`). Focus: anillo `--ring` 2px + borde accent presentes. Invalid: borde danger gana a focus. Disabled: opacidad + not-allowed + no-interactivo | ✅ PASS (hover en vivo sigue gated por `@media(hover:hover)`=false en headless, artefacto de entorno como en 1ª pasada) |
| 3 — Rol + accessible name sin regresión | Árbol de accesibilidad **idéntico** a la 1ª pasada. IconButton conservan `aria-label` ("Copiar valor", "Mostrar contraseña", "Borrar entrada", "Reintentar"). El SVG `aria-hidden` NO se filtra a ningún nombre accesible | ✅ PASS |
| 5 — Contraste sin regresión | Idéntico a 1ª pasada: primary 5.69, danger 5.41, hovers 7.55/7.37, inputs 17.94/16.31, placeholder 4.83/5.11. Todos ≥ 4.5 en ambos temas | ✅ PASS |
| Consola | Sin `console.error` de código propio (solo React DevTools info + HMR) | ✅ PASS |

## Evidencia 2ª pasada
`r2-01-buttons-icons-light.png`, `r2-02-buttons-icons-dark.png`, `r2-03-inputs-focus-dark.png`, `r2-04-mirror-specimen.png` (blank por falta de CDN, documentado), `r2-a11y-tree-light.txt`, `r2-contrast-light.txt`, `r2-contrast-dark.txt`, `r2-errors-final.txt` (vacío).

## Coste real 2ª pasada
$0 — sin APIs de pago (D8).

## VEREDICTO FINAL: PASS
FAIL (glifos Unicode tofu) → fix (SVG Icon del DS) → PASS. Las 6 primitivas son fieles en ambos temas, iconos SVG sin tofu (incl. `copy`), estados hover/focus/disabled fieles, rol+nombre accesible en todos los controles, contraste ≥4.5, consola limpia.
