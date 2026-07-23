# Verificación T6.10 — El historial guarda la receta (y solo la receta)

- **Tarea**: T6.10 · El historial guarda la receta (y solo la receta) (`planning.md`, F6, tarea 🔴 de seguridad)
- **Fecha**: 2026-07-23
- **Ejecutor**: verifier · agent-browser (npx -y) · sesiones `t6.10` (con sesión) y `t610anon` (anónimo)
- **Sistema**: base `493bc15` + **el diff de T6.10 SIN COMMITEAR** (core `history/{contracts,compose}.ts` + `engine/encode-transforms.ts`; db migración `0001_add_history_direction.sql` + `schema/history.ts` + `repos/history.repo.ts`; web `api/history/route.ts` + compose/history UI; e2e) · docker compose dev (Postgres 16, `127.0.0.1:5433`) · `pnpm dev` en `localhost:3000` · `{"ok":true,"db":true}` · migración on-boot aplicada.

## Verificación esperada (literal de planning.md)
> con sesión, componer `{"sub":"1","name":"carlos"}` → `json.minify` → `jwt.sign` con el secreto canario; después, **`pg_dump --data-only` de la BD completa grepeado por (a) el texto fuente, (b) `carlos`, (c) el secreto canario y (d) el JWT resultante → 0 coincidencias**, con **control positivo** (`json.minify` y `jwt.sign` **sí** aparecen: la receta está guardada, el grep apunta bien); la fila tiene `direction='compose'`. Enviar a mano un `POST /api/history` con un campo `source` → **400** (control negativo del Zod estricto). Sin sesión, el mismo flujo **no crea fila**. Sin regresión de 14.8 (el historial de decodificar sigue exactamente igual). `pnpm gate` + `pnpm test:e2e` verdes.

## Pasos ejecutados
1. **Baseline de BD** antes de tocar nada: `pg_dump --data-only` completo → grep de los 4 términos de fuga = **0 cada uno**; controles positivos `json.minify`/`jwt.sign`/`compose` = **0** (aún no existe la receta), tabla `history_entry` presente, 70 filas previas (decode).
2. **Con sesión** (cuenta `verifier-t610-…@example.com`, sin `carlos` ni canario): en `/compose` compuse `{"sub":"1","name":"carlos"}` → `json.minify` → `jwt.sign` con secreto canario `test-signing-secret-not-a-secret`. Barra de resultado con el JWT.
3. **Copié el resultado** (el disparador del registro, solo con sesión) con HAR grabando → disparó `POST /api/history` → **201**; cuerpo capturado del HAR.
4. **pg_dump post-flujo** + grep de los 4 términos + controles positivos, en la misma pasada.
5. **Controles del Zod estricto** desde la sesión real del navegador (`fetch` con cookie): NEG con `source` extra (nivel sobre) y NEG con `options.secret` anidado **por paso** (nivel paso); más sus gemelos positivos (mismo cuerpo menos el campo ofensor) para aislar la causa.
6. **Reabrir** la fila compuesta → diálogo con aviso → `/compose` con los pasos y campos vacíos.
7. **Borrar** la fila compuesta.
8. **Sin sesión** (sesión de navegador limpia): mismo flujo componer + copiar.
9. **No-regresión de decode**: analicé un base64 con sesión → fila decode en `/history`.
10. `pnpm gate` y `pnpm test:e2e`.

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | Componer con sesión + copiar crea fila `direction='compose'` | Fila «compuesto · 2 pasos», marcador «codificar»; DB `direction=compose` | 02-history-row-compose.png, 17-direction-dist.txt | ✅ |
| 2a | **Frontera que SÍ carga**: el POST no lleva dato del usuario | Cuerpo = `{"steps":[{transform_id,kind}×2]}`; contiene `json.minify`/`jwt.sign`; NO `carlos`/canario/`"sub"`/`eyJ`/`options`/`secret` | 05-network.har, 06-post-body-asserts.txt | ✅ |
| 2b | pg_dump: (a) fuente, (b) carlos, (c) canario, (d) JWT → **0** | 0/0/0/0 (+ firma 0, `"sub"` 0) | 11-pgdump-dataonly.sql, 12-grep-pgdump.txt | ✅ |
| 2c | Control positivo: `json.minify` y `jwt.sign` **sí** en el dump | json.minify=1, jwt.sign=1, compose=1, email=1 (delta desde baseline=0) | 12-grep-pgdump.txt | ✅ |
| 3 | `POST` con `source` extra → **400** (sin fila) | 400; row count 71→71; gemelo sin `source` → 201 | 07-neg-posts.txt, 08-pos-twins.txt | ✅ |
| 3b | 🔴 `POST` con `options.secret` anidado por paso → 400 (sin fila) | 400; row count 71→71; gemelo sin `options` → 201 (el `.strict()` del PASO muerde) | 07-neg-posts.txt, 08-pos-twins.txt | ✅ |
| 4 | Reabrir → `/compose` con pasos y campo VACÍO + aviso de que el dato no se guardó | Diálogo «…no se restaura porque nunca se guardó…»; `/compose` con json.minify+jwt.sign, source `[]` y secreto `[]` | 03-reopen-dialog.png, 04-reopened-compose-empty.png, 09-reopen-empty.txt | ✅ |
| 5 | Borrar quita la fila | Borrado (con confirmación) → fila desaparece; DB 74→73 | 14-after-delete.png | ✅ |
| 6 | Sin sesión, el flujo **no crea fila** | Copiar en anónimo: **0 peticiones de red**, DB sin cambio (73→73) | 10-anon-network.har, 10-anon-noposts.txt | ✅ |
| 7 | Sin regresión de decode (14.8) | base64 → fila decode «… (32 caracteres)» (redactado D7), SIN marcador de dirección (idéntico a F2/F4) | 13-history-mixed-decode-compose.png; diff history-row.tsx | ✅ |
| 8 | Migración `direction` on-boot, filas viejas bien tipadas | Columna `text NOT NULL DEFAULT 'decode'`; 70 filas previas = decode sin backfill | 17-direction-dist.txt | ✅ |
| 9 | `pnpm gate` verde | exit 0 · 1123 tests, 71 ficheros | gate.txt | ✅ |
| 10 | `pnpm test:e2e` verde | exit 0 · **54 passed** (incl. @f6 T6.10: receta, reabrir, borrar, sin-sesión; @f2 aislamiento) | 16-e2e.txt | ✅ |

## Coste real
$0 — sin APIs de pago. El secreto canario es un literal de test (`test-signing-secret-not-a-secret`), no un secreto real. (Estimado planning: $0 ✓.)

## Veredicto
**PASS** — con sesión, componer + copiar registra EXCLUSIVAMENTE la receta (`{transform_id, kind}`) y ningún carácter del usuario cruza al servidor ni llega a Postgres. La prueba load-bearing (cuerpo del POST solo-receta + rechazo 400 sin fila del `source` extra y del `options.secret` anidado por paso, cada uno con su gemelo positivo 201) demuestra la frontera del servidor, no solo el `pg_dump` (que para compose está sobre-determinado). Reabrir restaura los pasos con ambos campos vacíos y el aviso honesto; borrar funciona; sin sesión no hay fila ni red; decode sin regresión; migración on-boot correcta; gate y e2e verdes.

### Notas / rarezas
- El `pg_dump` para compose está **arquitectónicamente sobre-determinado** (el motor corre en cliente): sus 0s no prueban por sí solos la frontera del servidor. La prueba real es 2a + 3/3b, que mordieron correctamente.
- Consola del navegador limpia (solo HMR/React DevTools/Fast Refresh; sin errores ni warnings de producto). Evidencia: 15-browser-console.txt.
- Aislamiento entre cuentas: la cláusula Playwright se apoya en el test `@f2` preexistente (`history.spec.ts` L269), que el diff **no toca** (solo añade el bloque `@f6` al final) y que pasó en la suite. La frontera es agnóstica de dirección (`userId` SIEMPRE de la sesión en `POST`, igual que en `GET/DELETE`).
- Deuda ds ya anotada por el implementer: el marcador de dirección de `HistoryRow` es `<span>` inline (candidato a variante del DS, espejo 1:1 no lo tiene). No bloquea.
