# Verificación TD.7 — Cierre de fase TD: skill frontend contra la realidad + E2E visual del showcase

- **Tarea**: TD.7 · Cierre: skill frontend contra la realidad + OK humano (`planning.md`)
- **Fecha**: 2026-07-18
- **Ejecutor**: verifier (contexto fresco) · agent-browser (npx -y) · sesión `td7` · Chrome `--no-sandbox`
- **Sistema**: commit `6618d79` · árbol limpio salvo la skill frontend de esta tarea (`.claude/skills/frontend/{SKILL.md,references/components.md,references/design-system.md}`) · `pnpm --filter @app/web dev` (Next 16.2.10) · sin BD (showcase estático)

## Verificación esperada (literal de planning.md)
> **Verificación (E2E de fase)**: recorrido completo de `/design-system` — ambos temas (los acentos conmutables se retiraron en TD.1: el DS define un solo acento) — con evidencia visual en `docs/verifications/TD.7/`; `pnpm gate` verde; y **revisión humana final del showcase** (parada de fin de fase: el usuario da el OK visual).
>
> **Entrega**: skill `frontend` actualizada contra el código real committeado: inventario definitivo de `components/ui/` con variantes/props leídas de los `.tsx`, desviaciones deliberadas documentadas (incluida la de `--shadow-*`), obligatoriedad explícita, ajustes anotados en el journal.

## Pasos ejecutados
1. Gate previo `pnpm gate` desde la raíz → verde, 384 tests / 38 files (gate.txt).
2. `git status` / `git rev-parse HEAD` → sha 6618d79, solo la skill frontend modificada (la Entrega de esta tarea).
3. Spot-check skill §4.1/§4.2 ↔ código real de `components/ui/*.tsx` (Button, Dialog, Badge, Field, Select).
4. Verificación de la aserción `--shadow-*` en `globals.css`.
5. Verificación de placeholders `{{PROJECT_NAME}}`/`{{CLAUDE_DESIGN_URL}}` en la skill frontend.
6. Levantado `pnpm dev`, healthcheck HTTP 200 en `/design-system`.
7. CUA agent-browser: recorrido completo del showcase en tema CLARO (captura por sección) y OSCURO (toggle del showcase, `data-theme="dark"` confirmado en `<html>`).
8. Medición WCAG real (canvas→sRGB) del contraste texto/fondo de los 8 badges de DataKind y de los botones primary/danger en AMBOS temas.
9. Dialog: abierto en ambos temas, centrado medido por getBoundingClientRect, cierre por Escape confirmado.
10. Wordmark: animación del cursor medida en motion normal y con `set media reduced-motion`.
11. Consola/errores del navegador, overflow horizontal del body.

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | `pnpm gate` verde (384/38) | 384 passed / 38 files, lint+typecheck+format+knip+readme:status todo verde | gate.txt | ✅ |
| 2 | Showcase entero renderiza coherente en CLARO | 11 secciones (color·type·spacing·radii·shadows·forms·display·feedback·composites·brand·overlay) coherentes, iconos SVG sin tofu | light-00-full.png + light-*.png | ✅ |
| 3 | Showcase entero renderiza coherente en OSCURO | idem, colores adaptan por `data-theme`, sombras sutiles, iconos SVG correctos | dark-00-full.png + dark-*.png | ✅ |
| 4 | Badges json/base64/uuid legibles en OSCURO (deuda de contraste) | ratios WCAG: json 12.58, base64 12.22, uuid 12.22, jwt 10.16, timestamp 11.21, url 11.91, hash 11.60, text 5.71 — todos ≥4.5 | dark-display.png | ✅ |
| 5 | Badges legibles en CLARO | jwt 6.97, json 6.25, base64 5.12, timestamp 4.70, url 5.14, uuid 5.12, hash 6.60, text 6.88 — todos ≥4.5 | light-display.png | ✅ |
| 6 | Botones primary/danger contraste AA ambos temas | oscuro: Analizar 5.69 / Borrar 5.41 · claro: Analizar 5.69 / Borrar 5.41 — ≥4.5 | light/dark-forms.png | ✅ |
| 7 | Button danger + hover, IconButton, Input, Textarea, Select, Field | render correcto ambos temas; danger rojo, iconos reopen/copy/trash SVG | light/dark-forms.png | ✅ |
| 8 | Dialog abierto, centrado, ambos temas | claro: centro (640,289) vs viewport (640,288.5) · oscuro: idem · w=420px · Escape cierra (dialog.open=false) | light/dark-overlay-dialog-open.png | ✅ |
| 9 | Wordmark con blink y su parada en reduced-motion | motion normal: animación `cursor-blink` 1.1s · reduced-motion: `animationName=none`, opacity=1 (sólido y visible) | light-brand.png | ✅ |
| 10 | Composites StepCard·ChainSummary·HistoryRow | ChainSummary (badges+chevron), StepCard, HistoryRow (preview redactado, tiempo relativo, acciones) render OK | light-composites*.png, light-brand.png | ✅ |
| 11 | Consola limpia, sin overflow horizontal | consola: solo React DevTools info + HMR/Fast-Refresh (dev-only, 0 error/warn); errors vacío; scrollW 1280 = clientW 1280 | (console/errors en tránsito) | ✅ |
| 12 | Skill §4.1/§4.2 casa con el código real | Button variant primary·secondary·ghost·danger + size sm(30)·md(36)·lg(44) + danger→--danger-hover; Dialog props open/onOpenChange/onConfirm/confirmTone/confirmLabel/cancelLabel + `<dialog>` nativo; Badge alias --violet/cyan-subtle-fg + TONE lookup + color-mix; Field aria-describedby vía cloneElement+useId (error>hint); Select `<select>` nativo appearance-none — TODO coincide | button.tsx/dialog.tsx/badge.tsx/field.tsx/select.tsx | ✅ |
| 13 | Placeholders sustituidos en skill frontend | grep de `{{PROJECT_NAME}}`/`{{CLAUDE_DESIGN_URL}}` → 0 coincidencias reales (único `{{…}}` es el ejemplo `style={{…}}` en prosa) | design-system.md §3.1 | ✅ |
| 14 | Aserción `--shadow-*` cierta en globals.css | `:root` define `--shadow-xs/sm/md/lg` (rgba), `@theme inline` mapea `--shadow-*: initial` + `--shadow-N: var(--shadow-N)` 1:1 sin var() circular (patrón `@theme inline` de Tailwind v4); `shadow-sm/md/lg` funcionan en el showcase | globals.css:248-251,436-441 + light-forms.png (Sombras) | ✅ |

## Coste real
$0 — sin APIs de pago.

## Veredicto
**PASS (parte automatizable)** — el gate está verde (384/38), el showcase completo renderiza coherente en AMBOS temas sin tofu, sin overflow horizontal y con consola limpia; el contraste de los badges (incl. la deuda json/base64/uuid en oscuro) y de los botones supera WCAG AA en ambos temas; el Dialog está centrado en los dos temas y cierra con Escape; el Wordmark para el blink bajo reduced-motion conservando visibilidad; la skill frontend §4.1/§4.2 casa con el código real (Button/Dialog/Badge/Field/Select verificados), los placeholders están sustituidos y la aserción `--shadow-*` es cierta.

**PENDIENTE (no lo da el verifier):** la **revisión humana final del showcase** es la parada de fin de fase TD — el usuario debe dar el OK visual. Toda la evidencia visual (capturas por sección en claro y oscuro, Dialog abierto, mediciones de contraste y reduced-motion) queda preparada en este directorio para esa revisión.

### Notas / rarezas (aunque PASS)
- `dialog.getAttribute('aria-modal')` devuelve `null`: es correcto — `showModal()` del `<dialog>` nativo aporta la semántica modal implícita (ARIA-in-HTML), no un atributo explícito. No es defecto.
- Consola con `[HMR] connected` / `[Fast Refresh]`: ruido dev-only de Next/Turbopack, no código propio; muere en `next build`. No bloquea.
- Deuda conocida ya anotada en el journal: `_adherence.oxlintrc.json` del espejo quedó stale tras la tanda de deudas de DS; es artefacto generado por el panel de Claude Design, NO lo consume el gate real — fuera del alcance de esta verificación.
