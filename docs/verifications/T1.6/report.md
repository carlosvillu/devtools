# Verificación T1.6 · Alternativas de detección y desvío de la cadena

- **Fecha**: 2026-07-18
- **Verifier**: subagente escéptico, contexto fresco
- **Commit base (HEAD)**: `7fa32c3` + diff de T1.6 sin commitear (working tree)
- **Veredicto**: **PASS**
- **Coste real**: **$0** (todo local/determinista: motor puro + Playwright + agent-browser contra Next dev; sin APIs de pago ni red externa)

## Fuente de verdad (Verificación LITERAL de planning.md T1.6)

> en el navegador, pegar `1752624000` -> la UI muestra la lectura como timestamp **y** deja ver que existe la alternativa `text`; cambiar a la alternativa recalcula la cadena (criterio 14.3); en cualquier paso, elegir una transformación distinta de la propuesta recalcula desde ese punto y deja los pasos anteriores intactos (criterio 14.4, CU4).

## Comandos ejecutados y outputs

### 1. Gate local -- VERDE
`pnpm gate` (lint + typecheck + format:check + knip + readme:status:check + test) -> exit 0.
- **test: 42 test files passed / 432 tests passed** (vitest, 24.0s). Log: `gate.log`

### 2. E2E Playwright -- VERDE, reproducido independientemente
`pnpm test:e2e` (puerto 3118, sin DB) -> exit 0. **7 passed (36.8s)**, incluidos los 2 specs permanentes de T1.6:
- `field-alternatives.spec.ts:29` -- 14.3 (timestamp + alternativa text + recalc)
- `field-alternatives.spec.ts:54` -- 14.4 (desvio paso N deja intactos < N)
- No regresion: los 5 de `field.spec.ts` (T1.5) tambien en verde. Log: `e2e.log`
- El e2e usa `post` REAL (Next levantado), no mock -> cubre el round-trip recalcular->re-render.

### 3. Drive en NAVEGADOR REAL (agent-browser + Chromium contra `next dev` en :3115)
**14.3 -- `1752624000`** (screenshots `01`, `02`):
- Estado inicial (`01`): badge **timestamp** (conf **0.60**), transform **timestamp.to_iso**, salida ISO **`2025-07-16T00:00:00.000Z`**, y la linea **"Tambien podria ser: text"** con boton "Reinterpretar este paso como text". La alternativa `text` (conf 0.01 < umbral I8 0.3) se OFRECE igualmente: caso especial de 6.2 (`unix_timestamp` siempre convive con `text`) via `KINDS_COEXISTING_WITH_TEXT`. 2 pasos.
- Tras clic en la alternativa `text` (`02`): la cadena se **recalcula** -> de **2 pasos a 1**; desaparecen `timestamp.to_iso` y la salida ISO (count "code"=0); aparece terminal **"Dato de texto -- fin de la cadena"**. La deteccion sigue mostrando `timestamp 0.60` pero NO se aplica nada.

**14.4 -- JWT del 6.5, desvio del paso 1** (screenshot `03`):
- Cadena por defecto: paso 0 `jwt` (0.95) -> **jwt.decode** con payload `"name":"carlos"`; paso 1 `json` (0.99) -> **json.format** (3 pasos).
- Selecciono en el picker del paso 1 -> **json.sort_keys**.
- Resultado: paso 1 pasa a **json.sort_keys** (json.format ya no es el aplicado); **paso 0 INTACTO** (mismo jwt.decode y misma salida con `"name": "carlos"`). Recalculado desde el paso 1, prefijo conservado.
- Consola del navegador limpia (solo React DevTools + HMR; sin errores).

### 4. Seccion 11 -- el input NUNCA se loguea (evidencia externa)
- Handler `apps/web/src/app/api/analyze/route.ts`: `analyze_completed` emite SOLO `input_kind`, `input_bytes`, `steps`, `duration_ms`. Los `overrides` (Zod) no se loguean; el `chain` (que contiene el input) no se loguea.
- Grep sobre el stdout del dev server (`devserver.log`, run dirigido por el navegador, incluyendo peticiones CON overrides): `1752624000`=0, `carlos`/`ImNhcmxvcyI`=0, firma `SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV`=0, `overrides`=0.
- Idem sobre `e2e.log` (el unico `1752624000` es el nombre del test, no un log de servidor).

### 5. I2 / 14.7 -- la recalculacion desviada NUNCA supera 8 pasos
`vitest run packages/core/src/engine/analyze.overrides.test.ts` -> **8 passed**. Control literal: desvio en el paso 5 sobre grafo creciente queda capado en 8 (`max_depth`), mientras un splice en cliente daria 13. Replay-con-overrides = un solo bucle con un presupuesto.

## Resultado por punto

| Criterio | Esperado | Observado | OK |
|---|---|---|---|
| 14.3 lectura timestamp | badge timestamp + salida ISO | badge `timestamp` 0.60, `timestamp.to_iso`, `2025-07-16T00:00:00.000Z` | OK |
| 14.3 alternativa text visible | `text` se ofrece pese a conf 0.01 < 0.3 | "Tambien podria ser: text" + boton | OK |
| 14.3 elegir text recalcula | cadena se detiene como texto | 2->1 paso, ISO/to_iso desaparecen, terminal texto | OK |
| 14.4 desvio recalcula desde N | json.format -> json.sort_keys | picker cambia el aplicado, cola recalculada | OK |
| 14.4 pasos < N intactos | paso 0 jwt.decode sin cambios | `"name":"carlos"` decodificado identico | OK |
| I2/14.7 cota 8 pasos | <=8 siempre (vs 13 splice) | test dedicado 8/8 passed | OK |
| Seccion 11 input no logueado | solo metricas | grep input/overrides/firma = 0 | OK |
| Gate + e2e | verde | 432 unit + 7 e2e passed | OK |

## Rarezas
- El picker de transformacion aparece tambien en el paso terminal `no_transform` (json con 3 transforms): coherente con el contrato de StepCard (picker si el kind tiene >1 transform), no afecta a la Verificacion. No bloqueante.

## Evidencias
- `gate.log`, `e2e.log`, `devserver.log`
- `01-timestamp-with-text-alt.png`, `02-timestamp-recalc-as-text.png`, `03-jwt-divert-step1-sortkeys.png`
