# Verificación T2.3 — E2E de fase F2

> **Nota de procedencia**: el harness bloquea al subagente `verifier` la escritura de
> ficheros `.md`, así que el bucle persiste aquí su informe **tal como lo emitió**. El
> veredicto, las mediciones y el criterio son suyos, no del bucle. Las evidencias binarias
> y de texto de esta carpeta sí las escribió él directamente.

- **Tarea**: T2.3 · E2E de fase F2 (`planning.md`)
- **Fecha**: 2026-07-19
- **Ejecutor**: agente `verifier` · agent-browser · sesión `t2.3`
- **Sistema**: commit `2ab5122` + diff de T2.3 **solo de tests** (`e2e/phases/f2.spec.ts` nuevo, `e2e/history.spec.ts` endurecido). El código de producto que corre es exactamente el committeado: la redacción viene de T2.1/T2.2, T2.3 no la toca.
- **Stack**: `docker-compose.dev.yml` (proyecto `devtools-dev`, Postgres en `127.0.0.1:5433`) + `pnpm dev` propio en el puerto 3000, con **stdout capturado a fichero** (`web-server.log`) — imprescindible para que el `grep` de 14.9 sea sobre logs reales de la web bajo prueba.
- **Producción NO tocada**: `devtools-web-1` (3110), `devtools-postgres-1` y el volumen `devtools-pg-prod-data` quedaron intactos (up/healthy, 3110 → 200); el `.env` de raíz no se tocó. El `next-server` previo en 3000 y el propio se cerraron **por PID**, nunca con `pkill`.

## Verificación esperada (literal de planning.md)

> **cierra los criterios 14.8 y 14.9 del PRD**, ejecutados literalmente con evidencia en `docs/verifications/T2.3/` (incluido el `grep` sobre los logs y el `psql` sobre la fila); `pnpm gate` y `pnpm test:e2e` en verde; sin regresión de los E2E de F0 y F1. Parada de fin de fase.

### Criterios del PRD ejecutados

- **14.8** — «Sin sesión: `/` es plenamente funcional y `/history` redirige a login. Con sesión: analizar algo lo hace aparecer en `/history` con la vista previa **redactada**, y en `psql` la fila NO contiene el token completo (D6, D7).»
- **14.9** — «Con la app corriendo, un `grep` del input de prueba sobre los logs de la web no devuelve ninguna coincidencia (§11).»

## Resultado por punto

| # | Esperado | Observado | OK |
|---|---|---|---|
| 14.8a | Sin sesión `/` plenamente funcional | Cadena `jwt→json` completa, sin cuenta | ✅ |
| 14.8b | `/history` sin sesión redirige a login | `→ /login?next=%2Fhistory` | ✅ |
| 14.8c | Con sesión aparece con preview **redactada** | `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.….…` | ✅ |
| 14.8d | **`psql`**: la fila NO contiene el token | `chain` solo `kind`+`transformId`; 0/9 literales (incl. decodificados) | ✅ |
| 14.9 | **`grep`** del input sobre logs → 0 | 0/10 literales, con 9 `analyze_completed` como control positivo | ✅ |
| — | Tags `@f2 @phase` seleccionan | `@phase`→8 tests/3 ficheros; `@f2`→8/2 | ✅ |
| — | `pnpm gate` verde | exit 0 · **579 tests, 58 ficheros** | ✅ |
| — | `pnpm test:e2e` verde, sin regresión F0/F1 | **26 passed (1.7m)** | ✅ |

## Pasos ejecutados (CUA, la app usada como un humano)

Input de prueba: el JWT del ejemplo trabajado del PRD §6.5, más un segundo input `1700000000`.

1. **`/` anónimo** → 200, header «Entrar». Pegado el JWT, la cadena se despliega entera: `jwt → json → json`, con `exp: 2025-07-16T00:00:00Z (caducó hace 1 año)`. `/` es **plenamente funcional sin cuenta** → `01-anonimo-analiza.png`.
2. **`/history` anónimo** → redirige a `/login?next=%2Fhistory`, conservando el destino.
3. **Signup** con email único → sesión iniciada.
4. **Historial de la cuenta nueva: VACÍO**. Doble valor: fija el punto de partida y demuestra que el análisis **anónimo** del paso 1 no se registró.
5. **Dos análisis con sesión**: el JWT y `1700000000`.
6. **`/history` con sesión** → dos entradas; la del JWT con la vista previa **exactamente redactada** → `02-history-redactado.png`.
7. **Reabrir (D7)** → el diálogo restaura la **cadena** y dice con todas las letras que no se restaura el dato → `03-reabrir-dialogo.png`.
8. **Borrar** con confirmación → desaparece la fila correcta; comprobado **en BD** que el borrado es real en servidor → `04-tras-borrar.png`.
9. **Guardián D6 de cierre**: logout → un análisis anónimo sigue funcionando → `05-d6-cierre-anonimo.png`.
10. **Consola del navegador**: sin errores ni warnings.

## 🔴 El `psql` sobre la fila (14.8) — la observación NO redundante

`GET /api/history` valida su salida con `HistoryPageSchema.parse(...)` y **Zod descarta las claves desconocidas**: una fuga introducida ANTES de esa frontera (p. ej. `summarizeChain()` emitiendo `step.output`) se persistiría en Postgres siendo **invisible** para el HTML y para la API. La fila cruda es la única observación de esa clase.

```
-[ RECORD 1 ]-----------------------------------------------------------------
id         | 459679cf-eb1a-49f7-b9da-559580a5c8c3
user_id    | 899ad21b-c2dd-4c95-b7cb-8158cb4c2f8d
preview    | Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.….…
input_kind | jwt
chain      | [{"kind": "jwt", "transformId": "jwt.decode"}, {"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]
created_at | 2026-07-19 11:47:46.256263+00
-[ RECORD 2 ]-----------------------------------------------------------------
preview    | 1700000000
input_kind | unix_timestamp
chain      | [{"kind": "unix_timestamp", "transformId": "timestamp.to_iso"}, {"kind": "text", "transformId": null}]
```

**Lectura columna a columna**: `chain` guarda únicamente `kind` + `transformId` — **ni `input` ni `output` de ningún paso**, que es justo el vector ciego. Grep sobre las tres columnas concatenadas:

```
limpio: [eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsImlhdCI6MTc1MjUzNzYwMCwiZXhwIjoxNzUyNjI0MDAwfQ]
limpio: [eyJzdWIiOiIx]        <- prefijo corto: sobrevive al truncado de 120
limpio: [SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c]
limpio: [SflKxwRJ]
limpio: [carlos]              <- decodificado
limpio: [1752537600]          <- decodificado (iat)
limpio: [1752624000]          <- decodificado (exp)
limpio: ["sub"]
limpio: [name]

### CONTROL POSITIVO: el header del JWT SI debe estar (redaccion por diseno)
OK: header presente (esperado)
```

El **control positivo** importa: el grep sí encuentra el header conservado, luego los ceros de arriba son ausencia real y no un grep mal apuntado. Se usaron **prefijos cortos** precisamente porque `preview` se trunca a 120 chars y el JWT mide 170: un literal largo no podría fallar nunca.

## 🔴 El `grep` sobre los logs de la web (14.9)

Sobre `web-server.log`, stdout real del `pnpm dev` bajo prueba (1310 líneas). **Control positivo primero**: 9 ocurrencias de `/api/analyze` y eventos `analyze_completed` presentes — hubo tráfico que *podría* haber filtrado.

```
0 coincidencias: [eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9]   <- en LOGS ni el header debe salir
0 coincidencias: [eyJzdWIiOiIx]
0 coincidencias: [SflKxwRJ]
0 coincidencias: [carlos]
0 coincidencias: [1752537600]
0 coincidencias: [1752624000]
0 coincidencias: [1700000000]
0 coincidencias: [Bearer]
```

Y lo que **sí** se loguea es exactamente el contrato de §11 — metadatos, jamás la entrada:

```
[13:47:46.161] INFO (web/2586394): analyze_completed
    request_id: "f426c041-23dd-490b-ab00-43b278a70a1e"
    route: "/api/analyze"
    input_kind: "jwt"
    input_bytes: 170
    steps: 3
    duration_ms: 10
```

**14.9 bis (build de producción)**: los logs del `WebServer` del stack E2E (`next build` + start, **27 `analyze_completed`**) se greparon con los mismos literales → 0 coincidencias. El criterio se sostiene también fuera del modo dev.

**Grep extra sobre el HTML de `/history` con el diálogo de reabrir ABIERTO** (momento de máximo riesgo, 40.840 bytes): 0 coincidencias, con el header presente como control positivo.

## Tags y no-regresión

- `--grep "@phase" --list` → **8 tests en 3 ficheros**: `f0`, `f1` (6) y `phases/f2`.
- `--grep "@f2" --list` → **8 tests en 2 ficheros**.
- `pnpm test:e2e` completo: **26 passed (1.7m)** → **sin regresión de F0 ni F1**.
- `pnpm gate` (exit 0): **58 ficheros de test, 579 tests passed**.

## ¿La spec de fase protege de verdad o es decorativa?

**Protege de verdad, con un hueco declarado y cubierto.**

- **Lo que la pondría roja**: romper `redactInput()` (el assert de **igualdad** no admite escapatoria); persistir `steps[i].input` de forma que cruce la frontera del contrato (los literales **decodificados** lo cazan, y un grep de base64 no); cerrar `/` a los anónimos (guardián D6 al principio **y** al final); romper el aislamiento, el borrado servidor o el aviso D7.
- **Lo que NO puede ver**: una fuga **anterior** a `HistoryPageSchema.parse(...)` que se persista en la fila. Zod la descarta de la salida, así que el spec seguiría verde. El implementer lo midió y lo documentó honestamente en la cabecera del spec en vez de venderlo como cobertura total; el `psql` de arriba es la observación que cierra ese hueco. Que esa cláusula esté en la Verificación **no es ceremonia**.
- El endurecimiento de `history.spec.ts` es una corrección real: con fragmentos largos, sus `not.toContain` **no podían fallar** (verde incluso con la redacción rota).

## Nota de protocolo — aserción de contraste (cua.md)

Se declara **N/A justificada**: T2.3 es una tarea **test-only** que no introduce ni modifica ningún acento ni color semántico. El contraste de `/history` fue gate de T2.2. No se midió deliberadamente, para no hacer scope creep sobre una verificación cuyo objeto es la privacidad.

## Coste real

**$0** — sin APIs de pago (D8).

## Veredicto

**PASS** — 14.8 y 14.9 se cierran con evidencia observada directamente sobre el sistema real: la fila cruda en `psql` no contiene el token ni ninguno de sus valores decodificados, los logs no contienen el input (ni en dev ni en build de producción), `/` es plenamente funcional sin cuenta y `/history` redirige, la vista previa es la redactada, reabrir devuelve la cadena y no el dato, y borrar es real en servidor.

## Rarezas, huecos y deuda (no bloquean el PASS, pero constan en el cierre de fase)

1. **La redacción del `preview` es solo para `jwt`** — deuda anotada al cerrar T2.2 y **confirmada en la fila**: la segunda entrada se persistió verbatim (`preview | 1700000000`). Para un timestamp es inocuo, pero la política implica que un **base64 de ≤120 chars se guarda tal cual** y puede descodificar a texto legible. Es el matiz que más acota la afirmación «devtools no es el pasivo de privacidad de R2»: hoy esa promesa está cumplida **para JWT**, no para toda entrada. Merece decisión explícita, no seguir arrastrándose como nota.
2. **Warning de compilación de código propio**: `instrumentation.ts:41 — process.cwd no soportado en Edge Runtime`. Precede a T2.3; importa porque `proxy.ts` **ya** corre en Edge.
3. **Deuda de F2 heredada de T2.2**, sin cerrar: (a) la rama «no se pudo cargar el historial» es **inalcanzable con la BD caída** —el modo de fallo más probable en producción— porque `getServerSession()` devuelve `null` y `/history` redirige a `/login`; (b) el 401 de `/api/history` **sin cookie sale sin `request_id`**.
4. **La BD de dev acumula filas de verificaciones previas** (9 antes de empezar): ninguna aserción debe asumir tabla vacía.
5. Los tres rate limits siguen con los **defectos concretos anotados en T0.4** (clave spoofeable; bucket `'unknown'`), asignados a **T3.1**.

## Evidencias

| Fichero | Qué contiene |
|---|---|
| `psql-fila.txt` | Dump crudo de las filas (todas las columnas) + estado tras el borrado |
| `grep-fila.txt` | Grep de las 9 familias de fuga sobre la fila + control positivo |
| `grep-logs.txt` | Grep de 14.9 sobre `web-server.log` + control positivo |
| `grep-logs-e2e-prod.txt` | 14.9 bis sobre los logs del stack E2E (build de producción) |
| `grep-html.txt` | Grep sobre el HTML de `/history` con el diálogo abierto |
| `web-server.log` | stdout íntegro del `pnpm dev` verificado |
| `gate.txt` / `test-e2e.txt` | Salidas crudas de `pnpm gate` y `pnpm test:e2e` |
| `history-dialogo-abierto.html` | HTML completo capturado en el momento de máximo riesgo |
| `browser-console.txt` | Consola del navegador (sin errores) |
| `01..05-*.png` | Capturas por estado |
| `account.txt` | Cuenta usada por el verifier |
