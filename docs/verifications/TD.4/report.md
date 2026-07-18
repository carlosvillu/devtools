# Verificación TD.4 — Gaps: primitivas fuera del DS (Dialog + Wordmark)

- **Tarea**: TD.4 · Gaps: primitivas fuera del DS (`Dialog` + `Wordmark`) (`planning.md`)
- **Fecha**: 2026-07-18
- **Ejecutor**: verifier · agent-browser (npx -y, Chrome CDP `--no-sandbox`) · sesión `td4`
- **Sistema**: commit `f952703` (working tree con cambios sin commitear de TD.4) · `pnpm --filter web dev` en localhost:3000 · sin BD/seeds (superficie estática /design-system)

## Verificación esperada (literal de planning.md)
> revisión en navegador de las secciones nuevas en ambos temas (coherencia con las foundations); `DesignSync list_files` muestra los ficheros nuevos y el espejo regenerado los incluye.

Ampliada por el brief del bucle: Wordmark (marca mono + cursor de acento; blink se detiene bajo reduced-motion sin perder visibilidad) y Dialog (`<dialog>` nativo: **modal centrado con scrim**, foco inicial en Cancelar, cierre por Escape y por backdrop, clic dentro no cierra).

## Pasos ejecutados
1. `pnpm gate` → VERDE: 37 test files / 377 tests passed; readme:status ✓.
2. Navegador a `/design-system`; localizadas regiones "Marca" (Wordmark) y "Overlay" (Dialog). Tema por defecto = claro.
3. Wordmark claro (01) y oscuro (02): marca `devtools` en mono, tamaños lg/md/sm, cursor-bloque de acento (azul), variante estática (blink=false). Coherente con foundations en ambos temas.
4. Dialog claro (03) y oscuro (04): abre al pulsar "Borrar entrada" (danger). **Foco inicial en «Cancelar»** (activeElement="Cancelar", BUTTON). Escape → cierra y devuelve foco al trigger. Clic dentro del panel (mouse real 30,30) → NO cierra. Clic en backdrop (mouse real 900,400) → cierra y devuelve foco al trigger.
5. **Posición del panel (mediblemente NO centrado)**: viewport 1280x577 (centro 640,288); panel 420x161 anclado en topLeft (0,0), centro (210,81), `margin:0px`, `inset:0px`, `position:fixed`. Idéntico en claro y oscuro. Ver `dialog-position.txt`.
6. Contraste (canvas sRGB, tema oscuro): Cancelar 16.31:1, Borrar(danger) 5.41:1, título 16.31:1 — todos ≥4.5. Ver `contrast.txt`.
7. reduced-motion (`set media reduced-motion` + recarga; matchMedia matches=true): los 4 cursores → `animation-name:none`, `opacity:1`, visibles, tamaño preservado. El blink se detiene SIN perder visibilidad (05). Ver `reduced-motion.txt`.
8. `DesignSync list_files` (proyecto 9d6b478a-...): presentes los 8 ficheros nuevos — `components/overlay/{Dialog.jsx,Dialog.d.ts,Dialog.prompt.md,overlay.card.html}` y `components/brand/{Wordmark.jsx,Wordmark.d.ts,Wordmark.prompt.md,brand.card.html}`. Paridad con el espejo local (mismos 8 ficheros).
9. Adherencia dura: el mirror NO importa `@radix-ui/*` ni `lucide-react` (grep vacío); `pnpm lint` verde dentro del gate. Cards con marcador `@dsCard` presentes.
10. Consola del navegador: solo logs dev (React DevTools info, HMR/Fast Refresh). Sin errores (`errors` vacío).

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | Gate verde (377/37) | 37 files / 377 tests passed | gate.log | ✅ |
| 2 | Wordmark coherente en ambos temas | mono `devtools` + cursor acento, lg/md/sm + estático | 01,02 | ✅ |
| 3 | Dialog abre con trigger | abre al click "Borrar entrada" | 03,04 | ✅ |
| 4 | **Modal CENTRADO con scrim** | scrim OK; panel anclado top-left (0,0), NO centrado; margin:0 anula centrado nativo | 03,04,dialog-position.txt | ❌ |
| 5 | Foco inicial en Cancelar | activeElement="Cancelar" | eval | ✅ |
| 6 | Escape cierra | cierra + foco al trigger | eval | ✅ |
| 7 | Backdrop cierra; clic dentro no | backdrop cierra; clic dentro mantiene abierto | eval (mouse real) | ✅ |
| 8 | Contraste ≥4.5 | 16.31 / 5.41 / 16.31 | contrast.txt | ✅ |
| 9 | Blink se detiene bajo reduced-motion sin desaparecer | animName none, opacity 1, visible | 05,reduced-motion.txt | ✅ |
| 10 | list_files muestra 8 ficheros + paridad espejo | 8 remotos + 8 locales idénticos | DesignSync | ✅ |
| 11 | Sin radix/lucide en mirror | grep vacío; lint verde | grep | ✅ |
| 12 | Consola limpia | solo logs dev, sin errores | browser-console.txt | ✅ |

## Coste real
$0 — sin APIs de pago.

## Veredicto
**FAIL** — todo funciona (abre/foco/Escape/backdrop/reduced-motion/list_files/contraste/paridad) EXCEPTO el centrado: el `<dialog>` modal se renderiza anclado en la esquina superior izquierda (topLeft 0,0), no centrado como pide la Verificación ("overlay modal centrado" / coherencia con las foundations).

**Causa raíz**: el reset base de Tailwind (`*,*::before,*::after { ... }` con `margin:0`) anula el `margin:auto` que la hoja de estilos del navegador aplica a un `<dialog>:modal` para centrarlo. El componente `dialog.tsx` no añade ninguna utilidad de centrado (no `m-auto`, no wrapper `fixed inset-0 flex items-center justify-center`). El defecto no lo cazaron los tests unit porque jsdom no implementa el posicionamiento de `showModal()` (usa un polyfill de solo lógica open/close) — exactamente el tipo de fallo que el gate CUA existe para atrapar.

**Por qué FALLA (no "routea" al usuario)**: la carve-out de cua.md "reportar sin fallar" es estrecha — aplica cuando el defecto vive en un VALOR de token del DS (decisión del usuario). Aquí el anclaje en la esquina es un bug de implementación en `dialog.tsx` (falta utilidad de centrado), no un valor del DS; por tanto NO routea, falla. Y falla el propio gate PASS del brief: "las dos secciones se ven coherentes con las foundations en AMBOS temas" — un modal en la esquina no es coherente. La card `overlay.card.html` monta el propio componente (specimen 700x360) y no fija posicionamiento, así que no contradice esta lectura.

**Qué debe arreglar el implementer**: centrar el panel del `<dialog>` — p. ej. añadir `m-auto` a las clases del `<dialog>` (restaura el centrado nativo anulado por el reset) o envolver en un contenedor `fixed inset-0` flex centrado. Re-verificar en navegador real en ambos temas: `panelCenter` ≈ centro del viewport.

**Notas (no bloqueantes)**:
- El atributo `aria-modal`/`role` del `<dialog>` sale `null` en el DOM, pero un `<dialog>` abierto con `showModal()` obtiene la semántica modal de forma implícita del navegador — no es defecto.
- Coexisten card «Wordmark» en `guidelines/` (Brand, foundation) y la nueva en `components/brand/` (Components) — intencional.
- Toast/Tooltip/Skeleton diferidos a propósito — fuera de alcance, no es FAIL por ausencia.

---

## RE-VERIFICACIÓN (fix `m-auto`) — 2026-07-18

- **Ejecutor**: verifier (contexto fresco) · `npx -y agent-browser` + Chrome CDP (`--no-sandbox`) · sesión `td4rv`
- **Motivo**: re-verificar el ÚNICO punto que falló antes (centrado del `<dialog>` modal). El resto ya estaba PASS y no cambió.
- **Fix aplicado**: se añadió `m-auto` a las clases del `<dialog>` en `apps/web/src/components/ui/dialog.tsx` (línea 100: `'m-auto w-full max-w-105 ...'`), con comentario explicando que restaura el `margin:auto` de la hoja de UA anulado por el reset base de Tailwind. Único cambio respecto a la verificación previa (el fichero sigue untracked, `??`).
- **Gate**: `pnpm gate` VERDE — **37 test files / 377 tests passed**; typecheck, prettier, knip, readme:status ✓. Ver `gate-reverify.log`.

### Medición de posición del panel (navegador real, viewport 1280×577, centro [640, 288.5])
| Tema | panel (x,y,w,h) | panelCenter | vpCenter | Δ centro | margin (computed) | Centrado |
|---|---|---|---|---|---|---|
| Claro | (430, 208, 420, 161) | **[640, 289]** | [640, 288.5] | ~0.5px | `207.875px 430px` | ✅ |
| Oscuro | (430, 208, 420, 161) | **[640, 289]** | [640, 288.5] | ~0.5px | `207.875px 430px` | ✅ |

El `margin:auto` vuelve a resolverse a valores reales (207.875px vertical / 430px horizontal) en lugar de `0px`, y el centro del panel coincide con el centro del viewport dentro de ±1px. `position: fixed`. Confirmado visualmente en `06-dialog-centrado-claro.png` y `07-dialog-centrado-oscuro.png`: modal centrado con scrim en ambos temas.

### No-regresión del resto del Dialog (misma sesión, interacción real)
| Comportamiento | Observado | OK |
|---|---|---|
| Abre desde su trigger («Borrar entrada», e85) | abre `<dialog[open]>` | ✅ |
| Foco inicial en «Cancelar» | activeElement="Cancelar" (claro y oscuro) | ✅ |
| Escape cierra | `openAfterEscape=false`, foco vuelve al trigger («Borrar entrada») | ✅ |
| Clic real en backdrop (mouse 100,100) cierra | `open=false`, foco vuelve al trigger | ✅ |
| Clic real DENTRO del panel (mouse 640,289) NO cierra | `open=true` | ✅ |
| Consola del navegador | sin errores/warnings de app | ✅ |

### Evidencias nuevas
- `06-dialog-centrado-claro.png`, `07-dialog-centrado-oscuro.png` (modal centrado + scrim, ambos temas)
- `gate-reverify.log` (gate 377/37)

## VEREDICTO GLOBAL DE TD.4: **PASS**
El único punto que fallaba (centrado del modal) queda resuelto: panel centrado en el viewport en ambos temas (±1px), con `margin:auto` restaurado por `m-auto`. El fix NO rompió foco inicial, Escape, cierre por backdrop ni la no-cancelación al clicar dentro. Sumado a los puntos ya verificados previamente (Wordmark en ambos temas, reduced-motion, contraste ≥4.5, `DesignSync list_files` con los 8 ficheros y paridad de espejo, sin radix/lucide en el mirror, consola limpia), **TD.4 entero es PASS**.

**Coste real**: $0 — sin APIs de pago.
