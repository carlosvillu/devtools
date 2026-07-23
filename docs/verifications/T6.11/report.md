# Verificación T6.11 — E2E de fase F6 (parte LOCAL)

- **Tarea**: T6.11 · E2E de fase F6 + producción (`planning.md`, F6). **Alcance de esta verificación: solo la parte LOCAL.** La parte de **PRODUCCIÓN (deploy + verificación en `https://devtools.carlosvillu.dev/compose` contra la imagen de prod) queda PENDIENTE** — la gobierna el bucle con confirmación del usuario.
- **Fecha**: 2026-07-23
- **Ejecutor**: verifier · agent-browser (`npx -y`, sesión `t611`) · contexto fresco
- **Sistema**: commit `8e8c971` + el diff test-only de T6.11 SIN COMMITEAR (`apps/web/e2e/phases/f6.spec.ts` nuevo, `apps/web/e2e/support/compose-network.ts` nuevo, `apps/web/e2e/compose.spec.ts` importa el helper) · docker compose dev (Postgres 16, `127.0.0.1:5433`) · `pnpm dev` en `localhost:3000` · migraciones aplicadas · `{"ok":true,"db":true}`. **El diff NO toca código de producto**: lo que se verifica es el árbol T6.7–T6.10 ya conquistado; el spec de fase es el nuevo artefacto.
- **Fixtures propios (NO los del implementer)**: fuente `{"sub":"9","name":"villuendas-verifier"}` y secreto `t611-verifier-canary-not-a-secret`, ambos únicos de esta ejecución, para que los 0s de los greps sean atribuibles a MIS datos y cazarían un hardcode afinado a `carlos`/`test-signing-secret`.

## Verificación esperada (literal de planning.md — cláusulas LOCALES)
> **14.14** — Escrito un valor en `/compose` y encadenados `json.minify` + `jwt.sign`, el navegador muestra los dos pasos con su tipo detectado y el resultado copiable, **sin una sola petición de red** durante la composición (D10, §5.3).
> **14.15** — El JWT compuesto en `/compose`, pegado en `/analyze`, se vuelve a abrir hasta el JSON original: **las dos direcciones son inversas la una de la otra** sobre el sistema real.
> **14.16** — Con sesión, componer crea una entrada en `/history` cuya fila en `psql` contiene la **receta** y **ni el fuente, ni el resultado, ni el secreto** (D10 + D7).
> Sin regresión: `pnpm test:e2e` **completo** en verde (F0, F1, F2, F5 incluidos — en particular 14.1 en `/analyze` y el control de la URL sin input de F5) y `pnpm gate` verde.
> Playwright permanente: `apps/web/e2e/phases/f6.spec.ts` con tags `@f6 @phase`, recorrido completo landing → componer → 2 pasos → firmar → copiar → conmutar → pegar → reabre → (con cuenta) receta en `/history` y se reabre.

## Pasos ejecutados (recorrido de USUARIO, una sola tirada contra el sistema levantado)
1. **Landing** (`/`) → click en la afordancia «compón algo» → aterriza en `/compose`, tab «codificar» seleccionada (beat 1, NO un `goto` directo).
2. **14.14 (anónimo)**: `networkidle`, se limpia el log de red y se arranca HAR; se escribe la fuente (kind «reconocido json»), se añade `json.minify` (salida compactada visible + badge «produce json»), se añade `jwt.sign` con el secreto (Select HS256 + badge «produce jwt»), «· 2 pasos · listo para compartir», se copia. HAR + `network requests` cerrados.
3. **14.15**: conmutar a «decodificar» (→ `/analyze` SIN reload), pegar el JWT compuesto; la cadena inversa `jwt.decode` → `json.format` reabre el payload y reaparece `"name": "villuendas-verifier"` formateado. Se comprueba que la URL NO lleva `?search` ni `#hash` (control F5).
4. **Sesión**: alta de cuenta nueva → `/analyze` con «Salir» visible; `/history` **vacío** (punto de partida explícito: el componer anónimo de los beats 2–3 no dejó rastro).
5. **14.16 (con sesión)**: `/compose` llega **limpio** (campo vacío, borrador no resucita), se compone de nuevo, se limpia el log de red y se copia → se captura el `POST /api/history` (201). `pg_dump --data-only` baseline (antes) y postflow (después) con grep negativo + control positivo. Fila en `/history` («compuesto · 2 pasos», `direction=compose`). Endpoint `/api/history` volcado y grepeado.
6. **14.16 (reabrir)**: «Reabrir» → diálogo honesto («…no se restaura porque nunca se guardó…») con los pasos → «Reabrir en componer» → `/compose` con `json.minify`+`jwt.sign` restaurados y **entrada Y secreto vacíos**.
7. **Regresión**: `pnpm gate` y `pnpm test:e2e` completos (contra el BUILD DE PRODUCCIÓN del stack E2E, no `next dev`).

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | La landing lleva a componer por una afordancia (no goto) | «compón algo» → `/compose`, tab codificar seleccionada | 00-landing.png | OK |
| 2 | 14.14: 2 pasos con tipo DETECTADO + resultado copiable | «reconocido json», «produce json», «produce jwt», «· 2 pasos · listo para compartir»; JWT de 3 segmentos cuyo payload envuelve `villuendas-verifier`; la firma NO es el secreto en claro | 01-compose-2pasos-firmado.png, jwt-token.txt | OK |
| 3 | 14.14: SIN una sola petición de red (anónimo) | HAR con **0 entries**; `network requests` = «No requests captured» durante escribir+encadenar+firmar+copiar | 05-anon-network.har, 10-anon-requests.txt | OK |
| 4 | 14.15: pegado en `/analyze` reabre HASTA EL JSON original (inversas) | `jwt.decode`→`json.format`; reaparece `"name": "villuendas-verifier"` **formateado** (el espacio tras `:` que solo emite `json.format`) | 02-analyze-reabierto.png | OK |
| 5 | F5: el input jamás toca la URL | `url.search` y `url.hash` vacíos tras conmutar+pegar | 02-analyze-reabierto.png | OK |
| 6 | Sesión nueva → historial vacío | «Tu historial está vacío»; el anónimo previo no dejó rastro | (read) | OK |
| 7a | 14.16: el POST lleva SOLO la receta | Cuerpo = `{"steps":[{transform_id,kind}×2]}` (201); `json.minify`/`jwt.sign` presentes; `villuendas-verifier`/`"sub"`/secreto/`eyJ` = **0** | 06-post-body.json, 06-post-body-asserts.txt, post-req-list.json | OK |
| 7b | 14.16: la fila persistida en `psql` NO lleva dato del usuario | `pg_dump --data-only`: `villuendas-verifier`=0, secreto=0, firma JWT `lc3kVKnM`=0 | 11b-pgdump-postflow.sql, 12-grep-pgdump.txt | OK |
| 7c | Control POSITIVO: el dump SÍ capturó MI escritura | email 0->1, `json.minify` 1->2, `jwt.sign` 1->2, `compose` 2->3; filas 73->74 (+1) | 11a/11b-pgdump, 12-grep-pgdump.txt | OK |
| 7d | La proyección del endpoint tampoco lleva dato | `/api/history`: recipe presente, `villuendas-verifier`=0, secreto=0 | api-history-dump.txt, 12-grep-pgdump.txt | OK |
| 8 | Fila en `/history` con etiqueta sintética y dirección | «compuesto · 2 pasos», `direction=compose` | 03-history-row-compuesto.png | OK |
| 9 | Reabrir: pasos restaurados, campos VACÍOS, aviso honesto | Diálogo «…nunca se guardó…»; `/compose` con json.minify+jwt.sign, entrada `[]` y secreto `[]` | 04-reopen-dialog.png, 05-reopened-compose-empty.png | OK |
| 10 | Consola del navegador sin errores de producto | Solo React DevTools info + HMR/Fast Refresh (dev-only) | 15-browser-console.txt | OK |
| 11 | `pnpm gate` verde | exit 0 · **1123 tests, 71 ficheros** | gate.txt | OK |
| 12 | `pnpm test:e2e` COMPLETO verde (F0/F1/F2/F5 incl.) | exit 0 · **55 passed, 0 skipped**; contra `next build`+`next start` | 16-e2e.txt | OK |
| 13 | Ejecutan 14.1 en `/analyze` y el control de URL sin input de F5 | `analyze-pending` (NUNCA en la URL), `f1 CU1 (14.1)`, `compose:199 (14.1 intacto)`, `landing` (URL limpia) todos verdes | 16-e2e.txt | OK |
| 14 | El spec de fase existe con tags y cubre el recorrido | `f6.spec.ts:75` `@f6 @phase`; 6 `test.step` = landing->14.14->14.15->sesión->14.16->reabrir; corre en la suite (`f6.spec.ts:81`) | f6.spec.ts, 16-e2e.txt | OK |

## Nota metodológica sobre 14.16 (misma lección que T6.10)
Para compose el `pg_dump` está **arquitectónicamente sobre-determinado**: el motor corre en el navegador, así que el dato del usuario nunca sale del cliente y los 0s del grep son casi inevitables. Por eso NO me apoyo en el dump como única prueba. La prueba que **carga** es la doble frontera: (a) el cuerpo del `POST /api/history` capturado en el borde de CLIENTE = solo receta, y (b) la fila persistida + el endpoint = solo receta, con **control positivo** que demuestra que el dump/endpoint SÍ capturaron mi escritura (email 0->1, receta +1). Ambas verificadas.

## Coste real
$0 — sin APIs de pago. El secreto es un literal de test evidente (`t611-verifier-canary-not-a-secret`). (Estimado planning: $0.)

## Veredicto
**PASS (parte LOCAL)** — el recorrido inverso completo se sostiene de una tirada sobre el sistema real: la landing lleva a componer, `json.minify`+`jwt.sign` compone y firma en el navegador con los dos tipos detectados y **cero peticiones de red** (14.14), el JWT pegado en `/analyze` se reabre hasta el JSON original demostrando que las direcciones son inversas (14.15), y con sesión la composición registra **exclusivamente la receta** —probado en las dos fronteras (POST + fila/endpoint) con control positivo, no solo por el `pg_dump` sobre-determinado— sin que el fuente, el resultado ni el secreto crucen al servidor (14.16); reabrir restaura los pasos con los campos vacíos y el aviso honesto. Sin regresión: `pnpm gate` (1123) y `pnpm test:e2e` (55, incl. 14.1 en `/analyze` y el control de URL sin input de F5) verdes contra el build de producción del stack E2E. El spec de fase `f6.spec.ts` existe, lleva `@f6 @phase` y su recorrido cubre todas las cláusulas.

### PENDIENTE (FUERA de alcance)
- **Producción**: deploy vía skill `deploy` + verificación en `https://devtools.carlosvillu.dev/compose` con TLS válido y el recorrido de 14.14 **contra la imagen de prod** (`next start` + standalone, gotcha de F5) + revisión de READMEs de fin de fase (paso 9). No verificado aquí por diseño; lo gobierna el bucle con confirmación del usuario.

### Rarezas (no bloquean)
- Consola del navegador limpia: solo el info de React DevTools y HMR/Fast Refresh, ambos dev-only del framework; ningún `console.error`/warning de producto (15-browser-console.txt).
- **Contraste**: el diff de T6.11 es test-only y no añade superficie UI nueva; el contraste de los paneles de compose/firma ya se midió en T6.7/T6.8 (dark+light). No re-medido aquí por no haber cambio de superficie.
- En 14.15 el `agent-browser` denegó `clipboard.writeText/readText` en su contexto, así que el pegado manual se hizo con `fill` en vez del evento paste real. El observable de 14.16 (la cadena reabre hasta el JSON original, URL limpia) se cumple igual porque el pipeline de `/analyze` reacciona al cambio de valor. La rigurosidad del evento paste real (relevo F5) queda cubierta por el **spec de fase**, que sí lee del portapapeles real y pasó en `pnpm test:e2e`.
