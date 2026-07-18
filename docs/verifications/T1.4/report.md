# T1.4 · `POST /api/analyze` — Verificación

- **Veredicto**: **PASS**
- **Fecha**: 2026-07-18
- **Verificador**: verifier (contexto fresco, escéptico)
- **SHA base**: `6ddf9f1` + diff no commiteado de T1.4 (árbol = código bajo prueba)
- **Coste real**: $0 (sin APIs de pago)

## Cómo se levantó el sistema

- `pnpm exec next dev` (Next 16.2.10, Turbopack) en `PORT=3210`, STDOUT/STDERR capturado a `raw/server.log`.
- Arrancado con **`ANALYZE_RATE_LIMIT=2` `ANALYZE_RATE_WINDOW_MS=60000`** para un 429 determinista.
- **Aislamiento del rate limit**: un `x-forwarded-for` distinto por caso lógico (10.0.0.1…10.0.0.6, 10.9.9.9 warmup), porque el limiter consume token ANTES del 413/400 y todas las peticiones de localhost caen en el mismo bucket `unknown`. El burst de 429 usa el MISMO XFF (10.0.0.3) ×3 con limit=2.
- Todas las peticiones **sin cookie de sesión** (D6). El motor decodifica base64/JWT con `Buffer` → runtime Node confirmado (`export const runtime = 'nodejs'`).

## Gate

`pnpm gate` VERDE (`raw/gate.txt`): lint + typecheck + format:check + knip + readme:status:check + test. **35 files / 363 tests passed**. `git status` limpio salvo el diff de T1.4 y la evidencia.

## Resultado por punto

| Caso | Esperado | Observado | OK |
|---|---|---|---|
| §6.5 JWT sin sesión (D6) | 200, Chain 3 pasos, applied=[jwt.decode, json.format, null], terminal:'no_transform', nota ISO 2025-07-16T00:00:00Z | 200 exacto; ChainSchema.safeParse.success=true; applied y terminal exactos; nota `exp: 2025-07-16T00:00:00Z (caducó hace 1 año)` | PASS |
| Validación de salida | El body pasa ChainSchema | vitest one-off: safeParse success + asserts de forma/valores | PASS |
| 413 (I7, criterio 14.5) | body ~200 KB → 413 sin procesar | 200014 bytes → 413 payload_too_large; log analyze_rejected_payload_too_large con body_bytes:200014, limit_bytes:131072; request_id 67cef236… NO aparece en ningún analyze_completed (correlación por id) | PASS |
| 429 rate limit | superar límite → 429 del limiter | limit=2, mismo XFF ×3 → 200,200,429 con envelope rate_limited | PASS |
| §11 control negativo (14.9) | grep del input sobre logs = 0 coincidencias | 0 coincidencias de TODOS los centinelas y fragmentos JWT | PASS |
| §11 métricas | analyze_completed con input_kind/input_bytes/steps/duration_ms, sin input | presentes (jwt, input_bytes:70, steps:3, duration_ms:5); ningún valor de input | PASS |
| Rutas de error no filtran | 400 sin eco del body | body malformado→400 "el body no es JSON"; tipo inválido→400 con flattenError sin el valor; centinelas ausentes del log | PASS |

## Control positivo (prueba de que el grep es significativo)

- `analyze_completed` aparece 5× y `analyze_rejected_payload_too_large` 1× en raw/server.log → la ruta de logging está viva y capturada por el fichero que grepeo.
- grep SÍ encuentra el centinela en el body de respuesta guardado (case4a.body.json) y `eyJhbGci` en case1.body.json → el patrón de grep funciona; los ceros del log son reales.

## Control negativo (§11 / criterio 14.9) — grep sobre raw/server.log

Cada petición grepeada llevó un centinela único:

```
[0] SENTINEL-a1b2c3d4-do-not-log-me        (200)
[0] SENTINEL-malform-9z9z                  (JSON malformado → 400)
[0] SENTINEL-type-7q7q                      (tipo inválido → 400)
[0] eyJhbGciOiJIUzI1NiJ9                    (header del JWT §6.5)
[0] eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ  (payload del JWT §6.5)
[0] rl-probe                                (peticiones de rate limit)
[0] AAAAAAAAAA                              (relleno del body de 200 KB)
[0] "Bearer eyJ"                            (JWT crudo completo)
```

CERO coincidencias en el log del server. El input nunca se loguea (§11), ni en camino feliz, ni en 413, ni en rutas de error.

## Observaciones (no bloquean)

- Identificación de IP provisional: clientIp() lee x-forwarded-for (controlable por el cliente). El trust boundary real (CF-Connecting-IP + TRUST_PROXY=1) se resuelve en T3.1, ya documentado en el handler y en planning §T3.1.
- Se estrena el code payload_too_large→413 en @app/core (app-error.ts) — hueco de contrato cubierto correctamente.
- La línea de next-dev "POST /api/analyze 200 in 24ms" tras el 413 es logging interno de Next, no el status HTTP; curl recibió 413 verificado por -w %{http_code}.

## Evidencia

- raw/gate.txt — salida del gate
- raw/server.log — STDOUT/STDERR del server (fuente del grep)
- raw/case1.body.json + case1.headers — §6.5 (200)
- raw/case2.body.json + case2.headers — 413
- raw/case3_req{1,2,3}.body.json — rate limit 200/200/429
- raw/case4a.body.json — 200 centinela; case4b/4c — rutas de error 400
