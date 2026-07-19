# Verificación T2.1 — Registro de historial redactado

- **Tarea**: T2.1 · Registro de historial redactado (`planning.md`)
- **Fecha**: 2026-07-19
- **Ejecutor**: agente `verifier` · verificación backend (curl + `psql`), sin superficie de navegador (cua.md paso 0: la Verificación habla de `psql`, no de UI; la UI la cubre T2.2)
- **Sistema**: commit base `bae9985` + diff de T2.1 sin commitear (working tree: `apps/web/src/app/api/analyze/route.ts`, `apps/web/src/server/history.ts`, `packages/core/src/history/`, `packages/db/src/repos/history.repo.ts`, `packages/core/package.json`, `packages/db/src/index.ts`). `docker-compose.dev.yml` (proyecto `devtools-dev`, Postgres `127.0.0.1:5433`) + migraciones aplicadas + `pnpm dev` propio en **puerto 3210**.
- **Aislamiento**: no se tocó producción. `devtools-web-1`, `devtools-postgres-1`, `ugc-factory-*` y `edge-caddy` siguen `Up` al final (ver `final-state.txt`). Todas las operaciones sobre Postgres fueron `docker compose -f docker-compose.dev.yml <cmd> postgres`, estructuralmente incapaces de alcanzar el proyecto `devtools` de prod.

## Verificación esperada (literal de planning.md)

> con sesión iniciada, analizar el JWT del ejemplo de §6.5 → en `psql`, la fila de `history_entry` existe y su `preview` **no contiene el token completo** ni el payload, y `chain` no contiene ningún valor (control negativo literal: `grep` del token en el dump de la fila no devuelve nada — criterio 14.8); sin sesión, analizar lo mismo **no crea ninguna fila** (control negativo de D6).

## Preparación (permitida: prepara escenario, no ejecuta el paso verificado)

Alta real por la API pública `POST /api/auth/signup` → cookie `devtools_session` legítima emitida por el sistema (no fabricada por mí). Input analizado: el literal del PRD §6.5, `Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ.abc`.

## Resultado observado vs esperado

| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | Con sesión, analizar el JWT de §6.5 crea UNA fila | `count(*)` pasa de 0 → 1. Respuesta HTTP 200 y cadena de §6.5 exacta: `jwt/jwt.decode → json/json.format → json/null` | `analyze-response.json`, `count-after.txt`, `row-dump.json` | ✅ |
| 2 | `preview` sin el token completo ni el payload | `preview = "Bearer eyJhbGciOiJIUzI1NiJ9.….…"` (31 chars ≤ 120). Payload y firma sustituidos por `…`; `preview LIKE '%abc%'` = `f` | `row-dump.json`, `greps.txt` | ✅ |
| 3 | `chain` sin ningún valor intermedio | Los 3 elementos traen exclusivamente `{kind, transformId}`. Ningún `input`/`output`/valor | `row-dump.json` | ✅ |
| 4 | `grep` del token sobre el dump de la fila no devuelve nada (14.8) | Ausentes las 7 formas grepeadas, **incluidas las YA DECODIFICADAS** | `greps.txt` | ✅ |
| 5 | Sin sesión, no se crea ninguna fila (D6) | HTTP 200 con la cadena correcta y `total_rows` **sin variar** (1 → 1) | `negative-controls.txt` | ✅ |

### Fila literal releída de la BD

```json
{
    "id": "c9bbf357-1235-436c-9173-d668aa0f7804",
    "chain": [
        { "kind": "jwt",  "transformId": "jwt.decode" },
        { "kind": "json", "transformId": "json.format" },
        { "kind": "json", "transformId": null }
    ],
    "preview": "Bearer eyJhbGciOiJIUzI1NiJ9.….…",
    "user_id": "3e27bf87-0307-4101-93db-db5cfd4e4514",
    "created_at": "2026-07-19T07:30:22.683537+00:00",
    "input_kind": "jwt"
}
```

### Detalle del control negativo literal (punto 4)

Dump obtenido **releyendo la fila de la BD** (`select jsonb_pretty(to_jsonb(h)) from history_entry h`), no del objeto que construyó el código.

**Ausentes (serían leak) — grep sin resultados:**

| Fragmento | Por qué se grepea | Resultado |
|---|---|---|
| `eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ.abc` | token completo | ausente ✅ |
| `eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ` | segmento de payload codificado | ausente ✅ |
| `1752624000` | **`exp` YA DECODIFICADO** — discriminador fuerte: un bug tipo «persistir `steps[i].input`» guardaría el JSON en claro, que un grep del base64 NO vería | ausente ✅ |
| `sub` / `exp` | claims decodificados | ausente ✅ |
| `HS256` | alg decodificado del header | ausente ✅ |
| `2025-07-16` | la fecha de caducidad renderizada en las notes | ausente ✅ |

**Presente (por diseño del PRD, sanity de que el dump no está vacío):** `eyJhbGciOiJIUzI1NiJ9` (segmento de **header**, que el PRD conserva a propósito). Se grepeó el header completo, nunca `eyJ` a secas — que habría dado un FAIL falso.

La firma (`abc`) se comprobó sobre el `preview` (`LIKE '%abc%'` → `f`) y no por grep del dump entero: 3 caracteres hex colisionan con los UUID de `id`/`user_id` y darían falso positivo.

Comprobación agregada sobre **todas** las filas: `select count(*) ... where preview like '%<payload>%' or chain::text like '%1752624000%' or chain::text like '%sub%'` → **0**.

## Comprobaciones extra pedidas

### A. La sesión se valida DE VERDAD contra la BD (no «la cookie existe»)

| Caso | Rows antes → después | HTTP | Veredicto |
|---|---|---|---|
| Sin cookie (anónimo) | 1 → 1 | 200 | no escribe ✅ |
| Cookie forjada malformada `devtools_session=x` | 1 → 1 | 200 | no escribe ✅ |
| Cookie forjada **UUID bien formado e inexistente** (`1111…1111`) | 1 → 1 | 200 | no escribe ✅ |
| Cookie de sesión **REVOCADA por logout** (replay del valor real) | 1 → 1 | 200 | no escribe ✅ |

El caso del **UUID bien formado** es el que importa: con un uuid inválido el rechazo podría venir de un error de parseo y no de la BD. Aquí la fila de `session` se consultó y no existía → rechazo por **lookup en BD**. El caso **revocado** se ejecutó de verdad: `select count(*) from session where id=…` pasó de 1 a 0 tras `POST /api/auth/logout`, y el replay posterior de esa misma cookie (que un navegador/atacante seguiría enviando) no escribió nada.

Confirma que `recordHistoryIfSignedIn` llama a `validateSession(getDb(), req)` contra Postgres y no se apoya en el middleware de Edge — que, como avisa el requisito de seguridad de T2.2, solo comprueba `Boolean(valor)`.

### B. El registro no puede tumbar `/api/analyze` (D6) — BD realmente caída

`docker compose -f docker-compose.dev.yml stop postgres` (`/api/health` → `{"ok":true,"db":false}`), y la petición se hizo **con una cookie de sesión VÁLIDA**, no anónima — importante: sin cookie, `validateSession` corta antes de tocar la BD y el caso no probaría nada del `try/catch`.

| Caso con BD caída | HTTP | Tiempo | Cadena |
|---|---|---|---|
| Cookie válida (ejercita `getSessionById` → falla) | **200** | 0,041 s | correcta (§6.5 completa) |
| Anónimo | **200** | 0,036 s | correcta |

D6 se sostiene: sin 500, sin degradar la respuesta, y rápido. En el log solo aparece el marcador **estático** `history_record_failed` — sin `err.message`, sin input, sin cadena (§11 respetado).

### C. Log del servidor — sin filtración (14.8 también aplica a logs)

Grep sobre el log del `pnpm dev` de toda la sesión: `eyJzdWIiOiIx…` **ausente**, `1752624000` **ausente**, `eyJhbGciOiJIUzI1NiJ9` **ausente**. Las líneas `analyze_completed` solo llevan metadatos (`input_kind`, `input_bytes`, `steps`, `duration_ms`).

## Rareza evaluada: latencia por `await` antes de responder — **RIESGO REAL, no teórico**

El bucle me pidió juicio sobre el `await recordHistoryIfSignedIn(...)` colocado antes del `return`. **No hay timeout en ninguna capa**, y lo confirmé por dos vías:

1. **Código**: `createDb` es `makeDb(new Pool({ connectionString }))` — sin `connectionTimeoutMillis`, sin `statement_timeout`, sin `query_timeout`. El default de node-postgres es `connectionTimeoutMillis: 0` = **espera infinita**.
2. **Empírico** (`docker compose -f docker-compose.dev.yml pause postgres` = BD alcanzable por TCP que nunca responde, que es exactamente el caso «lenta/colgada» que el `stop` NO cubre):

| Petición con la BD COLGADA | Resultado |
|---|---|
| Con cookie de sesión válida | **colgada >25 s**, curl exit 28 (timeout del cliente), sin respuesta |
| Con cookie basura `devtools_session=x` (**sin cuenta**) | **colgada >20 s**, curl exit 28 |
| Anónima (sin cookie) | 200 en **0,029 s** |

Tres consecuencias que conviene enunciar con precisión:

- El `stop` (BD caída) falla rápido porque el SO responde *connection refused*; **por eso el test del implementer pasa y aun así el hueco existe**. La caída es el caso benigno; el colgado es el malo.
- La degradación golpea a toda petición **que lleve cookie**, válida o no. Como cualquiera puede enviar `devtools_session=x` sin tener cuenta, **un atacante no autenticado puede provocarla** contra un endpoint público (D6). No es «solo para usuarios logueados».
- **Efecto observado adicional**: la petición colgada con sesión válida **completó su INSERT al hacer `unpause`** — la segunda fila de `final-state.txt` (usuario `verifier-t21-d6-…`, 07:34:24) es esa escritura diferida, ya con su `preview` correctamente redactado. Es decir: el cliente se quedó sin respuesta pero el trabajo siguió vivo en el servidor.

**Mi criterio**: no bloquea T2.1 — la Verificación literal no lo cubre, D6 tal y como está redactada («no tumbar analyze») se cumple, y el diseño best-effort es correcto. Pero es **deuda de disponibilidad con nombre y apellidos**, y la anoto como hallazgo para el bucle: lo natural es `connectionTimeoutMillis`/`statement_timeout` en el pool, o desacoplar el registro del camino de respuesta (no esperar el `await`). Como manda el protocolo, **no lo he arreglado**.

## Gate y suites (ejecutados por mí)

| Suite | Resultado |
|---|---|
| `pnpm gate` (lint + typecheck + format:check + knip + readme:status:check + test) | **verde** — 52 ficheros, **518 tests pasados** |
| `pnpm test:e2e` (Playwright, Testcontainer desechable en :3118, aislado de prod y de mi :3210) | **verde** — **18 passed** (2,0 min), sin regresión de F0 ni F1 |

## Revisión del material del implementer (no confiable por defecto)

Leí `apps/web/test/integration/api/analyze-history.test.ts` antes de ejecutar nada. Sus asserts cubren de verdad lo que la Verificación pide y **no cae en la trampa** más común: su test de BD caída usa una cookie con **UUID bien formado**, así que sí ejercita el camino de BD dentro del `try/catch` (con cookie ausente, `validateSession` cortaría antes y el test sería vacío). Sus `FORBIDDEN_FRAGMENTS` incluyen los valores decodificados (`1752624000`, `"sub"`), que es el discriminador correcto. Aun así, **el veredicto de este report se apoya en mis propias observaciones por `psql` contra el sistema levantado**, con datos y usuarios elegidos por mí, no en su suite.

## Coste real

**$0** — ninguna API de pago. Solo Docker local, Postgres de dev y Playwright.

## Veredicto

**PASS** — los 5 puntos de la Verificación se cumplen contra el sistema real, comprobados en `psql` sobre la fila releída de la BD: la fila existe, `preview` está redactado (`Bearer eyJhbGciOiJIUzI1NiJ9.….…`), `chain` solo lleva `{kind, transformId}`, el grep del token —en forma codificada **y decodificada**— no devuelve nada mientras el header sí aparece (diseño del PRD), y sin sesión no se crea ninguna fila. Extras: la sesión se valida contra la BD (forjada bien formada y revocada por logout no escriben) y con la BD caída `/api/analyze` sigue devolviendo su cadena en 41 ms.

**Hallazgo abierto (no bloqueante, para el bucle)**: sin timeout en el pool de `pg`, una BD **colgada** (no caída) cuelga indefinidamente `/api/analyze` para cualquier petición con cookie — provocable por un anónimo con una cookie basura. Detalle y evidencia en la sección de la rareza.

## Ficheros de evidencia

`gate.txt` · `analyze-response.json` · `count-after.txt` · `row-dump.json` · `greps.txt` · `negative-controls.txt` · `revoked-session.txt` · `db-down.txt` · `db-hung.txt` · `db-hung-anonymous.txt` · `log-greps.txt` · `final-state.txt` · `e2e.txt`

---

# ADDENDUM (2026-07-19) — re-verificación del arreglo de timeouts

El coordinador arregló el hallazgo de latencia tras el PASS inicial. Este addendum re-verifica el delta; **el veredicto final está al pie**.

**Delta**: `packages/db/src/client.ts` — `createDb` pasa ahora `connectionTimeoutMillis: 5000` y `query_timeout: 5000` al `Pool`. Nuevo `packages/db/test/integration/client.test.ts` como guarda de regresión.

## 1. Re-ejecución del arnés de `pause` (la prueba que manda)

Mismo arnés, misma máquina, `docker compose -f docker-compose.dev.yml pause postgres` (BD que acepta TCP y nunca responde):

| Petición, BD CONGELADA | ANTES (sin timeouts) | AHORA | Cadena |
|---|---|---|---|
| Cookie de sesión válida | **colgada >25 s**, curl exit 28 | **200 en 5,151 s** | correcta (§6.5 completa) |
| Cookie basura `=x` (sin cuenta) | **colgada >20 s**, curl exit 28 | **200 en 5,027 s** | correcta |
| Anónima | 200 en 0,029 s | **200 en 0,024 s** | correcta |

**Confirmado con mis propios números** (el coordinador midió ~5,6 s / ~5,0 s / ~0,025 s). El cuelgue indefinido ha desaparecido: ninguna petición supera el timeout del cliente y **todas devuelven la cadena correcta**, no un 500. Evidencia: `db-hung-POSTFIX.txt`.

**Sobre el razonamiento del coordinador: lo veo correcto, y lo verifiqué.** `statement_timeout` lo aplica el servidor, así que un servidor congelado no puede dispararlo — habría pasado el test de `stop` y seguido colgando en `pause`. Lo comprobé de forma independiente (`guard-discriminating-power.txt`): un pool con solo `statement_timeout` deja `connectionTimeoutMillis` y `query_timeout` en `undefined`, es decir, **espera infinita**. Los dos timeouts de cliente son necesarios y suficientes para este fallo.

## 2. Las migraciones NO pueden abortar por estos timeouts — confirmado

Dos vías independientes:

- **Estructural**: `runMigrations` (migrate.ts) abre `new Client({ connectionString })` — un `Client` propio, **sin** ninguna opción de timeout, completamente separado del `Pool` de `createDb`. Además `createDb` tiene **un solo consumidor** en todo el árbol: `apps/web/src/server/db.ts` (el camino de petición). El CLI `db:migrate` y `instrumentation.ts` van por `runMigrations`. Ninguna migración pasa por el pool tocado.
- **Empírica**: el arranque del `pnpm dev` con el código ya arreglado ejecutó las migraciones on-boot correctamente y `/api/health` respondió `{"ok":true,"db":true}`.

El coordinador no se equivocaba: la mejora no introduce peligro de arranque.

## 3. No hay regresión de lo ya aprobado

| Comprobación | Post-fix | OK |
|---|---|---|
| 1. Con sesión, el JWT de §6.5 crea UNA fila | rows 2 → 3 (delta **+1**), HTTP 200 | ✅ |
| 2. `preview` redactado | `Bearer eyJhbGciOiJIUzI1NiJ9.….…` | ✅ |
| 3. `chain` solo `{kind, transformId}` | los 3 elementos, sin valores | ✅ |
| 4. Grep del token sobre el dump (14.8) | las 7 formas **ausentes** (incl. `1752624000`, `sub`, `HS256`); header presente por diseño; agregado sobre TODAS las filas = 0 | ✅ |
| 5. Sin sesión, ninguna fila | rows 3 → 3 | ✅ |
| Cookie forjada `=x` / UUID bien formado | rows 3 → 3, HTTP 200 | ✅ |
| Cookie **revocada por logout** (`session` 1 → 0, replay) | rows 3 → 3, HTTP 200 | ✅ |
| **BD CAÍDA** (`stop`) con cookie válida | **200 en 0,021 s**, cadena correcta | ✅ |

Evidencia: `postfix-regression.txt`, `row-dump-postfix.json`, `postfix-negative-controls.txt`, `db-down-POSTFIX.txt`.

## 4. Mi criterio sobre el residuo de ~5 s

**Aceptable para v1, pero lo dejaría anotado como deuda, no como cerrado.** Razones:

- El fallo cualitativo —recurso colgado indefinidamente, que agota sockets/handles y **no se recupera solo**— está eliminado. Lo que queda es latencia **acotada y auto-recuperable**, que es una categoría de problema distinta y mucho más benigna.
- El residuo solo aparece con la BD **congelada**, un modo de fallo raro (la caída normal responde en 21 ms). En operación sana el coste es cero.
- Sigue siendo cierto que un anónimo puede provocar ~5 s de latencia en un endpoint público mandando `devtools_session=x`. Con concurrencia suficiente eso todavía ata trabajadores del servidor durante 5 s cada uno — es un amplificador, aunque muy inferior al anterior (infinito).

**Qué haría, por orden de valor y sin urgencia para v1**: sacar el registro del camino de respuesta (no esperar el `await`: responder primero y persistir después) es el arreglo que hace el residuo **exactamente cero**, porque ataca la causa —el usuario espera por algo que no necesita— en vez del síntoma. Bajar el timeout a 1–2 s es más barato pero solo reduce el residuo. Recomiendo **no** hacerlo ahora: encaja mejor en T2.2/T3.1, con la carga de `/history` ya presente. **No lo he cambiado.**

## 5. Mi lectura de la guarda de regresión — útil, pero es 1 aserción, no 2

**No es teatro**: verifiqué su poder discriminante de forma independiente (`guard-discriminating-power.txt`) construyendo pools alternativos. Un pool **sin** las opciones deja ambas en `undefined` → la guarda falla; un pool con **solo `statement_timeout`** también la falla. Detecta de verdad las dos regresiones que importan.

Tres reservas honestas:

1. **El segundo test no añade poder de detección.** Su assert (`query_timeout` `toBeDefined()`) es un **subconjunto estricto** del primero (`query_timeout > 0`): cualquier cambio que rompa el segundo ya rompe el primero. Su nombre promete guardar contra la sustitución por `statement_timeout`, pero **nunca comprueba que `statement_timeout` esté ausente**. Es documentación valiosa con forma de test. Por eso el control negativo «2 tests rojos» sobreestima la cobertura: es **1 aserción efectiva fallando dos veces**. Sugerencia (no la aplico): fusionarlo en el primero como comentario, o hacerlo real con `expect(options.statement_timeout).toBeUndefined()`.
2. **No fija el valor**: `> 0` pasaría con `1` ms, que rompería la app bajo cualquier latencia normal. Un rango (p. ej. 1 s–30 s) sería más apretado.
3. **Solo guarda `createDb`**. Un `makeDb(pool)` con pool construido por el llamante queda fuera. Hoy no es camino de producción (el único consumidor de prod es `server/db.ts`), pero conviene saberlo.

Como aserción de configuración es la elección correcta: la prueba de comportamiento real (pause/unpause de un contenedor) sería demasiado pesada y frágil para la suite, y queda documentada aquí con números.

## Gate y suites post-fix (ejecutados por mí)

| Suite | Resultado |
|---|---|
| `pnpm gate` | **verde** — **53 ficheros, 520 tests** (coincide con lo reportado) |
| `pnpm test:e2e` | **verde** — **18 passed** (1,3 min) |

## Veredicto final tras el arreglo

**PASS** — el arreglo hace lo que promete, medido con el mismo arnés que detectó el defecto: el cuelgue indefinido (>25 s) pasa a **200 con la cadena correcta en ~5,1 s**, la anónima sigue en 24 ms, y la BD caída en 21 ms. El razonamiento sobre `statement_timeout` es correcto y verificado de forma independiente; las migraciones usan su propio `Client` y no pueden abortar. Las 5 comprobaciones de la Verificación, la validación de sesión contra BD y los controles negativos siguen en verde. Coste **$0**.

**Deuda anotada (no bloqueante)**: residuo de ~5 s con BD congelada, disparable por un anónimo — el arreglo de fondo es sacar el registro del camino de respuesta. Y la guarda de regresión tiene 1 aserción efectiva, no 2.
