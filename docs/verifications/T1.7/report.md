# Verificación T1.7 — E2E de fase F1

- **Tarea**: T1.7 · E2E de fase F1 (`planning.md`, ~L197)
- **Fecha**: 2026-07-18
- **Ejecutor**: verifier (contexto fresco) · agent-browser 0.32.1 · sesión `t1.7`
- **Sistema**: commit `fd9795e` (T1.6). El único diff de T1.7 es el spec nuevo `apps/web/e2e/phases/f1.spec.ts` (untracked, `@f1 @phase`). Verificación CUA contra `next dev` en `127.0.0.1:3115` (bloque devtools 3110–3119; libres, sin choque con prod ni con el webServer e2e). Motor puro, sin BD ni red externa.

## Verificación esperada (literal de planning.md)
> **Verificación (E2E de fase)**: **cierra los criterios 14.1, 14.2, 14.3, 14.4, 14.5, 14.6 y 14.7 del PRD**, cada uno ejecutado literalmente y con evidencia en `docs/verifications/T1.7/`; `pnpm gate` y `pnpm test:e2e` en verde; sin regresión del E2E de F0 ni del showcase de TD. Parada de fin de fase: resumen al usuario y esperar OK.

Reparto (brief): 14.1–14.5 + CU5 en el navegador real; 14.6/14.7 como invariantes del corpus del motor (tests de `packages/core`); §11/14.9 como control negativo de log.

## Gate y e2e (reproducidos)
- `pnpm gate` → **VERDE**: lint + typecheck + format + knip + readme:status + `pnpm test` = **432 tests / 42 files passed** (`gate.log`).
- `pnpm test:e2e` → **VERDE**: **13 tests passed** (`e2e.log`): `phases/f1.spec.ts` (6: CU1..CU5 + 14.5), `field.spec.ts` (5), `field-alternatives.spec.ts` (2). Sin regresión.
- **Regresión F0/TD = N/A**: solo existen `field.spec.ts` y `field-alternatives.spec.ts` (ambos `@f1`); no hay E2E de F0 ni spec permanente de TD. Confirmado por `ls apps/web/e2e/**`.

## Resultado observado vs esperado

| # | Esperado (literal) | Observado | Evidencia | OK |
|---|---|---|---|---|
| 14.1 | Pegar `Bearer <JWT>` → **< 1 s** cadena `jwt → json`, payload formateado, expiración en lenguaje natural, sin elegir nada | Cadena `jwt.decode → json.format`, payload `"name": "carlos"`, `exp: 2025-07-16T00:00:00.000Z (caducó hace 1 año)`. **Latencia in-page (paste→cadena): 166 / 104 / 76 ms** (3 muestras, ruta caliente). Sin errores de consola | `01-cu1-jwt.png` | OK |
| 14.2 | base64 con JSON → 3 pasos, copiar intermedio con 1 clic | `base64.decode → json.format`, `"user": "carlos"`; 2 botones «Copiar»; clic en el del paso intermedio → «Copiado» | `02-cu2-base64.png`, `02-cu2-base64-copied.png` | OK |
| 14.3 | `1752624000` lee timestamp **y** ofrece `text`; elegirla recalcula | `timestamp.to_iso` + `2025-07-16T00:00:00.000Z` + «también podría ser» + botón «Reinterpretar este paso como text»; al pulsarlo desaparece timestamp/ISO y termina en «dato de texto — fin de la cadena» | `03-cu3-timestamp.png`, `03-cu3-recalculated-text.png` | OK |
| 14.4 | Desviar un paso recalcula desde ahí, anteriores intactos | Paso 1 `json.format → json.sort_keys`: json.format desaparece, json.sort_keys aparece; paso 0 `jwt.decode` + `"name": "carlos"` INTACTOS | `04-cu4-divert.png` | OK |
| CU5 | URL con params URL-encoded → valores decodificados | `url.split_query`; `"state": "abc xyz"` (%20), `"code": "a/b+c"` (%2F,%2B), `"redirect_uri": "https://foo.com"` (%3A%2F%2F). Sin errores de consola | `05-cu5-url.png` | OK |
| 14.5 | Entrada 200 KB → **413 sin procesar** | `curl` 204813 B → **HTTP 413** `{"code":"payload_too_large"}` (request_id 32c9db89). Log del server real: SOLO `analyze_rejected_payload_too_large` (body_bytes 204812, limit 131072); **0 líneas `analyze_completed`** → «sin procesar» probado por AUSENCIA | `14.5-curl-200kb.txt`, `14.5-log-evidence.txt` | OK |
| 14.6 | Corpus golden: misma entrada + mismo `now` ⇒ Chain byte-a-byte (I5) | `analyze.test.ts`: `determinismo (I5, 14.6)` `it.each(CORPUS)` (8 entradas) + `golden byte a byte de la Chain completa` (§6.5). VERDE | `core-14.6-14.7.log` (48 tests) | OK |
| 14.7 | Ninguna cadena > 8 pasos ni cicla (I2/I3) | `analyze.test.ts`: `cota de 8 pasos sin bucle (14.7)` `it.each(CORPUS)` (≤8, never cycle), `max_depth base64 x8 → 8 pasos`, guard de ciclos; `analyze.overrides.test.ts`: `desvío en paso 5 capado en 8 aunque un splice daría 13`. VERDE | `core-14.6-14.7.log` | OK |
| §11 / 14.9 | `grep` del input sobre los logs no devuelve coincidencias | `analyze_completed` lleva SOLO `input_kind:jwt, input_bytes:170, steps:3, duration_ms`. `grep` sobre `dev-server.log`: firma JWT `SflKxw…ssw5c`=0, `"carlos"`=0, `Bearer eyJ`=0 | `dev-server.log` | OK |

## Metodología de la latencia 14.1 (medición del verifier)
Medida **in-page** (no alrededor de `npx`): listener de `paste` con `performance.now()` + `MutationObserver` que registra la aparición de `json.format`. Ruta `/api/analyze` calentada (curl frío 0.35 s → caliente 0.02 s) para no reportar JIT de dev. 3 muestras: **166 / 104 / 76 ms** — todas ≪ 1 s. Corroborado por `duration_ms` del motor en logs (0–12 ms).

## Nota sobre el transporte del pegado (CUA)
El clipboard del SO resultó inestable en este sandbox (permisos intermitentemente denegados). El pegado se disparó con un evento `paste` real + `input` sobre el `<textarea>`, recorriendo el código de producto ÍNTEGRO (onPaste→onChange→runAnalyze→fetch /api/analyze→motor→render); solo se sustituyó el transporte de clipboard, ya probado con pegado real de Playwright en los 13 e2e verdes. La muestra de latencia 14.1 nº1 (166 ms) usó `clipboard paste` nativo del CLI, sin sustitución.

## Reconciliación §3 CU4 (validada)
El motor auto-detecta `hash` (hex 32/40/64), superando la narrativa literal de CU4. CU4 se realiza por su forma canónica O4/14.4 (desviar un paso con >1 transformación), demostrado en vivo. Coherente y sin gap.

## Coste real
**$0** — motor puro, sin APIs de pago ni red externa (vs estimado $0).

## Veredicto
**PASS** — 14.1–14.7 + CU5 + control §11/14.9 ejecutados literalmente contra el sistema real; gate y e2e verdes, sin regresión.

Rarezas: ninguna funcional. Fricción operativa: clipboard del sandbox inestable (no afecta al producto). Consola limpia en todos los flujos.
