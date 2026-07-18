# Verificación TD.5 — Composites de producto (presentacionales puros)

- **Tarea**: TD.5 · Composites de producto (`planning.md`, línea 132-135)
- **Fecha**: 2026-07-18
- **Ejecutor**: verifier (agente escéptico) · agent-browser (Chrome, `--no-sandbox`) · sesión `tTD.5`
- **Sistema**: árbol de trabajo en `main` sobre commit `0c5034b` + diff SIN commitear de TD.5 (composites `chain/`+`history/`, `composites-demo.tsx`, sección en `page.tsx`, bloque 5b de `eslint.config.ts`). `pnpm --filter @app/web dev` (Next 16.2.10 + Turbopack) en `localhost:3000`. Sin BD/seeds (tarea de UI pura del design system).

## Verificación esperada (literal de planning.md)
> comparación contra sus specimens en ambos temas; animaciones apagadas bajo `prefers-reduced-motion` sin perder el estado visible; un test de lint/typecheck falla si un composite importa de `packages/core` (control negativo de la pureza).

## Pasos ejecutados
1. **Gate baseline** (`pnpm gate`) -> verde, 187 tests / 28 files (`gate-baseline.txt`).
2. Levantado `pnpm dev`; abierto `/design-system#composites` con agent-browser (`--no-sandbox`, gotcha apparmor confirmado).
3. **Comparación estática 1:1**: leídos los tres `.tsx` contra sus specimens del espejo (`StepCard.jsx`, `ChainSummary.jsx`, `HistoryRow.jsx`) -> mismos tokens, misma composición de primitivas, mismos textos terminal, misma estructura. Fracciones de rejilla 4px (`size-6.5`, `gap-1.75`, `gap-1.25`) equivalentes a los px del mirror.
4. **Comparación visual, TEMA CLARO**: capturas `01`/`02`/`03`. Iconos SVG inline visibles, sin tofu.
5. **Picker O4 en vivo**: `select` a `base64.decode` -> el `<code>{applied}</code>` pasa de `jwt.decode` a `base64.decode` sin reload (`04`). Reset a `jwt.decode`.
6. **prefers-reduced-motion** (emulación confirmada `matchMedia(reduce)===true`): medición objetiva en HistoryRow. Captura `05` (reveal por foco).
7. **Comparación visual, TEMA OSCURO** (switcher UI -> `data-theme=dark`): capturas `06`/`07`/`08`.
8. **Contraste texto/fondo** (obligatorio, cua.md §113): canvas-normalizado a sRGB, compuesto sobre el fondo real, ambos temas.
9. **Control negativo de pureza**: inyectado en `step-card.tsx` (a) `import { something } from '@app/core'` y (b) `import type { DetectionResult } from '@app/core'`; `pnpm lint` FALLA en ambos nombrando `@typescript-eslint/no-restricted-imports` + mensaje de TD.5 (`purity-value-import-RED.txt`, `purity-type-import-RED.txt`). Revertido desde backup (sha idéntico `623520e...`, `git diff` vacío) -> `pnpm gate` VERDE (`gate-after-revert.txt`, exit 0, 187 tests).
10. Consola: solo logs `[Fast Refresh]` (HMR dev por la inyección), 0 errores/warnings de código propio (`browser-console.txt`); `errors` vacío.

## Resultado observado vs esperado

### Cláusula 1 — comparación contra specimens en ambos temas
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | StepCard fiel al spec (rail, O5, picker O4, salida, notas, terminal) | 1:1 con `StepCard.jsx` | 01,02,06,07 | OK |
| 2 | ChainSummary: badges unidos por chevron | jwt>json, base64>json, url>json>text; chevrones `text-text-subtle` | 01,06 | OK |
| 3 | HistoryRow: preview redactado (D7), Badge+ChainSummary, tiempo, acciones | Preview truncado; badges+chain; clock+tiempo; reabrir/borrar | 03,08 | OK |
| 4 | Iconos sin tofu | Todos SVG inline visibles | 01-08 | OK |
| 5 | Picker O4 actualiza applied en vivo | `jwt.decode`->`base64.decode` sin reload | 04 | OK |

### Cláusula 2 — reduced-motion sin perder estado visible (HistoryRow; theme-independiente)
| Medición | Esperado | Observado | OK |
|---|---|---|---|
| `matchMedia(reduce)` | true | true | OK |
| `transition-duration` fila + acciones | ~0 | 1e-05s (0.01ms) | OK |
| Opacidad acciones en reposo | visible, no oculto | 0.35 (en DOM, no display:none) | OK |
| Foco por teclado (Tab->"Reabrir") | focus-within revela | activeElement=Reabrir, focus-within=true, opacidad 1 | OK |
| Botones operables | enabled + accessible name | "Reabrir"/"Borrar", disabled=false, en árbol a11y | OK |
| Reveal por hover | mecanismo correcto | selector `:is(:where(.group):hover *)` casa bajo `:hover` real; el pintado va tras `@media (hover: hover)` estándar de Tailwind, inerte solo en headless (navegador reporta hover:false); el reveal NO depende de la transición | OK |

Conclusión: bajo reduced-motion la transición se apaga (≈0) y el estado visible se conserva; reveal por foco verificado en vivo (0.35->1, transición ≈0); reveal por hover verificado vía selector (gate `@media hover` estándar, activo en hardware real). Ningún estado se pierde al apagar la animación.

### Cláusula 3 — control negativo de pureza
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | Import de VALOR de `@app/core` -> lint falla nombrando la regla | `error ... @typescript-eslint/no-restricted-imports` + mensaje TD.5 | purity-value-import-RED.txt | OK |
| 2 | Import de TIPO -> lint falla (violación realista) | Igual; `allowTypeImports` default caza `import type` | purity-type-import-RED.txt | OK |
| 3 | La regla vive DENTRO de `pnpm gate` | `pnpm lint` es 1er paso del gate; el gate falló con la inyección | — | OK |
| 4 | Retirado, gate verde sin rastro | sha idéntico, `git diff` vacío, gate exit 0 / 187 tests | gate-after-revert.txt | OK |

### Contraste texto/fondo (WCAG, canvas->sRGB, compuesto sobre fondo real)
TEMA CLARO (base #fff) — todos pasan (>=4.5 normal): jwt 6.97, json 6.25, base64 5.12, url 5.14, text 6.88, timestamp 4.70, terminal-neutral 4.83, applied/alt/notas 7.57-17.94.

TEMA OSCURO (base [11,12,15]):
| Elemento | fg rgb | bg rgb | Ratio | Umbral | OK |
|---|---|---|---|---|---|
| badge jwt (accent) | 181,217,255 | 26,40,59 | 10.16 | 4.5 | OK |
| badge json (violet) | 103,58,178 | 35,33,51 | 2.11 | 4.5 | FALLA |
| badge base64 (cyan) | 0,109,135 | 27,42,48 | 2.49 | 4.5 | FALLA |
| badge url (success) | 202,242,212 | 29,44,38 | 11.91 | 4.5 | OK |
| badge text (neutral) | 156,160,167 | 36,39,44 | 5.71 | 4.5 | OK |
| badge timestamp (warning) | 254,229,179 | 50,44,37 | 11.21 | 4.5 | OK |

## Hallazgo ruteado (DS / Badge primitivo TD.3 — NO es defecto de TD.5)
**Los badges de tono `violet` y `cyan` fallan WCAG en tema OSCURO, en toda la app.** Causa raíz: `TONE.violet.fg = text-violet-700` y `TONE.cyan.fg = text-cyan-700` (`apps/web/src/components/ui/badge.tsx`) son colores de rampa fijos, theme-invariantes; en oscuro el fondo se oscurece pero el texto sigue siendo el `-700` saturado -> 2.11 (json) / 2.49 (base64). Los demás tonos usan tokens semánticos theme-aware (`text-*-subtle-fg`) y pasan holgadamente.
- **Alcance**: por `KIND_META`, afecta a json (violet), base64 (cyan) y uuid (cyan) — uuid no está en la demo pero comparte el defecto.
- **Por qué NO falla TD.5**: el composite es un espejo FIEL del specimen — `docs/design-system/components/display/Badge.jsx` define exactamente `fg: var(--violet-700)` / `var(--cyan-700)`. El defecto y su arreglo viven en el primitivo Badge (TD.3) + los valores del DS, que TD.5 no puede tocar. Por cua.md §113 (colores heredados del DS) se rutea al usuario con la tabla de ratios, no se ignora ni se atribuye a TD.5.

## Notas de cobertura (no bloquean)
- Marcador terminal: solo el tono neutral (check, `text-text-subtle`) se renderiza en la demo. warning/danger verificados por lectura del mapeo `TERMINAL`/`TERMINAL_FG` (fiel al spec) pero no medidos en pantalla; usan tokens semánticos theme-aware.
- Kinds no medidos en pantalla: uuid y hash no aparecen en la demo.
- Handlers de la demo son `noop` (`() => undefined`): un click no tiene efecto observable. Operabilidad verificada al techo posible (botón alcanzable, enabled, accessible name, cero errores); cableado `onClick`->prop confirmado por lectura.

## Coste real
$0 — sin APIs de pago (verificación de UI local).

## Veredicto
**PASS** — las tres cláusulas literales de la Verificación de TD.5 se cumplen: fidelidad a specimens en ambos temas, reduced-motion sin perder estado visible, y control negativo de pureza que muerde en value+type nombrando la regla y revierte sin rastro dentro del gate.

**Rareza / hallazgo ruteado (aunque PASS)**: los badges violet/cyan (json, base64, uuid) fallan contraste WCAG en tema oscuro (2.11 / 2.49 < 4.5). Defecto del primitivo Badge (TD.3) / valores del DS — TD.5 lo espeja fielmente y no puede arreglarlo. Se rutea al usuario/bucle (fix probable: dar a `TONE.violet.fg`/`TONE.cyan.fg` un token theme-aware, análogo a `-subtle-fg`).
