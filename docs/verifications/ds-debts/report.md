# Verificación — Remediación de 3 deudas del Design System

- **Fecha**: 2026-07-18
- **Verificador**: subagente `verifier` (contexto fresco, medición independiente)
- **Rama**: main · working tree con los cambios de las 3 deudas (sin commitear)
- **Sistema**: `pnpm dev` (Next 16.2.10, Turbopack) en http://localhost:3000, página `/design-system`
- **Veredicto global**: **PASS**

## 0. Gate y estado

- `pnpm gate` **VERDE**: lint + typecheck + format:check + knip + readme:status:check + test.
- Tests: **384 passed (38 files)** — coincide con lo esperado.
- `git status`: modificados globals.css, badge.{tsx,test.tsx}, field.{tsx,test.tsx}, docs/design-system Badge.jsx/Button.jsx/Field.jsx/tokens/colors.css + nuevo `globals.contrast.test.ts`. Nada de código de producto tocado por el verifier.

## Tabla caso → esperado → observado

| # | Caso | Esperado | Observado | OK |
|---|------|----------|-----------|----|
| 1 | Button danger hover | `background` → `--danger-hover` (≠ `--danger`) | fuente+mirror+CSS compilado consumen `--danger-hover`=red-700 (lab 37.25), distinto de `--danger`=red-600 (lab 45.69) | ✅ |
| 2 | Field hint aria-describedby | control apunta al id del hint visible | input `aria-describedby="_S_1_-hint"` = id del `field-hint` | ✅ |
| 2 | Field error aria-describedby | control apunta al id del error; error > hint | input `aria-describedby="_S_3_-error"`; test efímero: con hint+error solo se enlaza el error y el hint no se renderiza | ✅ |
| 2 | Fusión con aria-describedby del caller | se concatena, no se pisa | `caller-1 caller-2 <hintId>` | ✅ |
| 3 | Contraste violet (json) OSCURO | ≥4.5:1 | 12.58:1 (navegador) / 12.58 (cálculo tokens) | ✅ |
| 3 | Contraste cyan (base64) OSCURO | ≥4.5:1 | 12.22:1 (navegador) / 12.24 (cálculo) | ✅ |
| 3 | Contraste cyan (uuid) OSCURO | ≥4.5:1 | 12.22:1 (navegador) | ✅ |
| 3 | Sin regresión en CLARO | ≥4.5:1 | json 6.25, base64/uuid 5.12 (navegador) / 6.24 / 5.17 (cálculo) | ✅ |

## 1. Deuda 3 — Contraste violet/cyan (★) — MEDIDO INDEPENDIENTEMENTE

Cálculo propio (oklch→oklab→sRGB lineal→luminancia→WCAG), leyendo los valores REALES de
`globals.css` y reproduciendo el `color-mix(in oklab, hue N%, --surface)` del fondo del badge.
Script: `contrast.mjs` · salida cruda: `contrast-output.txt`.

```
LIGHT  json violet (fg=violet-700)  ratio=6.24  PASS
LIGHT  base64/uuid cyan (fg=cyan-700) ratio=5.17  PASS
DARK   json violet (fg=violet-100)  ratio=12.58 PASS
DARK   base64/uuid cyan (fg=cyan-100) ratio=12.24 PASS
NEG-CTRL (old -700 ramp en DARK)  violet=2.11 FAIL / cyan=2.49 FAIL
```

Cruce en NAVEGADOR (tema oscuro): se leyó `getComputedStyle` del texto y fondo REALES de los
badges json/base64/uuid, se rasterizaron a sRGB vía canvas y se calculó el ratio:
json **12.58**, base64 **12.22**, uuid **12.22** — todos ≥4.5. En claro: json 6.25, base64/uuid 5.12.
El control negativo confirma que la rampa -700 (el bug original) SÍ fallaba AA en oscuro (≈2.1/2.5).
Capturas: `01-light.png`, `02-dark.png` (badges json/base64/uuid legibles en oscuro).

Alias theme-aware confirmados en `globals.css`: `--violet-subtle-fg`/`--cyan-subtle-fg` = -700 en
`:root` (claro) y -100 bajo `[data-theme='dark']`. Ningún otro consumidor de violet/cyan afectado
(los badges son los únicos usuarios; el fondo sigue siendo color-mix inline sobre --surface).

## 2. Deuda 1 — Button danger-hover

- Fuente `docs/design-system/components/forms/Button.jsx`: `HOVER.danger = "var(--danger-hover)"`.
- Mirror `apps/web/src/components/ui/button.tsx`: variante danger con clase `hover:bg-danger-hover`.
- CSS compilado que sirve Next: `.hover\:bg-danger-hover:hover { background-color: var(--danger-hover); }`
  y `--danger-hover: var(--red-700)`. `--danger-hover` (lab 37.25) es un rojo MÁS OSCURO que
  `--danger` (=red-600, lab 45.69) → oscurece en hover, como pide el criterio.
- Paridad DesignSync remota: `get_file components/forms/Button.jsx` = idéntico al mirror.

NOTA (rareza, no defecto): la observación en vivo del `:hover` con `getComputedStyle` NO cambió el
fondo pese a que `element.matches(':hover')===true`. Se comprobó que el MISMO efecto ocurre en el
botón primary (hover:bg-accent-hover, control): es una limitación del hover sintético de CDP de
agent-browser (marca el estado :hover para el DOM pero no dispara el restyle de pintado), no un
defecto específico del danger. La evidencia código+artefacto-compilado es concluyente.

## 3. Deuda 2 — Field aria-describedby

DOM real de `/design-system`:
- Field "Email" (hint): `<input aria-describedby="_S_1_-hint">` = id del nodo `field-hint` visible.
- Field "Contraseña" (error): `<input aria-describedby="_S_3_-error">` = id del nodo `field-error` visible.

Ramas no cubiertas por el showcase, verificadas con test efímero contra el `field.tsx` REAL de
producción (`field.verify.test.tsx`, 3/3 passed):
- error tiene PRIORIDAD sobre hint (con ambos, se enlaza el error y el hint no se renderiza).
- se FUSIONA con el `aria-describedby` del caller: `caller-1 caller-2 <hintId>`.
- sin hint ni error NO se añade `aria-describedby`.

Contrato `.d.ts` intacto: `FieldProps` conserva label/htmlFor/hint/error/required/... (el
aria-describedby es implementación interna, no prop). typecheck y knip en verde. Paridad
DesignSync: `get_file components/forms/Field.jsx` = idéntico al mirror.

## Paridad DesignSync (confirmatorio)

`list_projects` → proyecto DevTools Design System (9d6b478a...). `get_file` de Button.jsx, Field.jsx
y tokens/colors.css remotos = coinciden con el espejo local (remoto usa selector `.dark`; local
`[data-theme='dark']` — desviación deliberada ya documentada). NOTA conocida: `_adherence.oxlintrc.json`
puede estar stale; no lo consume el gate — no es FAIL.

## Coste real

$0 (sin APIs de pago; DesignSync usa el login del usuario).

## Evidencia

- `contrast.mjs` + `contrast-output.txt` — cálculo WCAG independiente.
- `field.verify.test.tsx` — test efímero de aria-describedby (error-priority + fusión + ausencia).
- `01-light.png`, `02-dark.png` — showcase en claro y oscuro.
