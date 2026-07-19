# Verificación T2.4 — Ampliar la redacción del `preview` más allá de `jwt`

> **Nota de procedencia**: el harness bloquea al subagente `verifier` la escritura de
> ficheros `.md`, así que el bucle persiste aquí su informe **tal como lo emitió**. El
> veredicto, las mediciones y el criterio son suyos, no del bucle. Las evidencias de esta
> carpeta las escribió él directamente.

- **Tarea**: T2.4 · Ampliar la redacción del `preview` más allá de `jwt` (`planning.md`)
- **Fecha**: 2026-07-19
- **Ejecutor**: agente `verifier` · agent-browser · sesión `t2.4`
- **Sistema**: base `f678725` + diff de T2.4 sin commitear (5 ficheros de producto/test) · `next build` + `next start -p 3000` (build de PRODUCCIÓN, no `next dev` — ver Rareza 1) · `DATABASE_URL` fijado explícitamente a `127.0.0.1:5433/devtools` (Postgres del compose **dev**, proyecto `devtools-dev`)
- **Producción**: NO tocada. `devtools-web-1` sano y `https://devtools.carlosvillu.dev/api/health` → 200 al inicio, durante y al final de la sesión.

## Verificación esperada (literal de planning.md)

> analizar con sesión un **base64 cuyo contenido decodificado sea un literal inconfundible** (p. ej. `SGVsbG8gV29ybGQgc2VjcmV0`→`Hello World secret`) → en `psql`, la fila **no contiene ese literal decodificado ni el base64 completo**, con **control positivo** (algo del preview sí aparece, para probar que el grep apunta bien); lo mismo para un `json` con un valor sensible. Sin regresión del caso `jwt` de 14.8 ni del recorrido de fase F2. `pnpm gate` y `pnpm test:e2e` en verde.

## VEREDICTO: **FAIL**

La Verificación literal **pasa entera** y la redacción de `base64` y `json` es sólida: resistió todas mis variantes adversarias. **Lo que bloquea no es un fallo de la redacción, sino que los ENTREGABLES de T2.4 son defectuosos:**

1. la **tabla de reglas** escrita en `redact.ts` —entregable explícito de la ficha («dejando escrita la regla por kind»)— afirma DOS garantías que el sistema real NO tiene;
2. los **dos unit tests** que las «demuestran» son **inertes**: pasan un par `(input, kind)` que el detector no puede producir. Es exactamente el anti-patrón de T2.3 que esta tarea fue creada para eliminar, y viola el criterio (c) de la Entrega («la regla es pura y unit-testable»);
3. el **copy de usuario** introducido por esta tarea promete «nunca guardamos secretos en claro» — una promesa de privacidad **absoluta y falsa**, renderizada en `/history`.

**T2.4 no regresó nada**: el enrutado `text` → verbatim es pre-existente y está aprobado en la tabla. Lo defectuoso es el texto de la regla, los tests y el copy — todo ello introducido o mantenido por esta tarea.

---

## 1. Verificación literal — inputs PROPIOS del verifier (no los fixtures del implementer)

Literales elegidos por mí: base64 `VG9wU2VjcmV0UGFzc3dvcmQxMjM=` → `TopSecretPassword123`; JSON `{"api_key":"zebra-quokka-9182","port":8443,"admin":true,"note":null}`. Ambos cortos: sobreviven al truncado de 120 chars, así que los `not.toContain` **pueden** fallar de verdad.

Flujo ejecutado como humano en el navegador (agent-browser, build de producción): signup → pegar cada entrada en `/` → `/history`.

### Las filas crudas en `psql` (`psql-rows.txt`)

```
-[ RECORD 1 ]------------------------------------------------------------------
id         | 1c1fa11b-02cf-4883-acae-ceb160ddd878
input_kind | base64
preview    | … (28 caracteres)
chain      | [{"kind": "base64", "transformId": "base64.decode"}, {"kind": "text", "transformId": null}]
-[ RECORD 2 ]------------------------------------------------------------------
id         | f2be3de9-f26d-4fe9-8c68-377f6d3b3b4e
input_kind | json
preview    | {"api_key":…,"port":…,"admin":…,"note":…}
chain      | [{"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]
-[ RECORD 3 ]------------------------------------------------------------------
id         | f72749f6-f547-4fd1-a654-e893fd3748d8
input_kind | jwt
preview    | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.….…
chain      | [{"kind": "jwt", "transformId": "jwt.decode"}, {"kind": "json", "transformId": "json.format"}, {"kind": "json", "transformId": null}]
```

### Greps sobre `row_to_json(h)` de las 3 filas, con CONTROL POSITIVO

```
=== NEGATIVE (must be 0) ===
b64 decoded 'TopSecretPassword123'     0
b64 decoded frag 'SecretPassword'      0
b64 FULL string                        0
b64 PREFIX 'VG9wU2Vj'  (EL QUE MUERDE) 0
b64 prefix short 'VG9w'                0
json value 'zebra-quokka-9182'         0
json value frag 'zebra'                0
json number 8443                       0
json bool true                         0
=== POSITIVE CONTROL (must be >0) ===
'caracteres' (descriptor de base64)    1
'api_key'    (clave json conservada)   1
'port'       (clave json conservada)   1
jwt header (14.8, sin regresión)       1
```

**Sobre la trampa del base64**: confirmado que `not.toContain('TopSecretPassword123')` es **INERTE por sí solo** — el literal decodificado nunca es substring del base64. El assert que muerde es el **prefijo del propio base64** (`VG9wU2Vj` / `VG9w`), que sobrevive al truncado y solo desaparece por la redacción. **Ambos existen** en el código del implementer (unit, integración y e2e) y en esta verificación. Correcto y bien razonado.

**Valores numéricos y booleanos SÍ se redactan** (`8443`, `true`, `null` → `…`): comprobado en la fila real, no solo en unit.

## 2. Resultado observado vs esperado

| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | base64: la fila no contiene el decodificado | 0 hits (`TopSecretPassword123`, `SecretPassword`) | psql-rows.txt | ✅ |
| 2 | base64: la fila no contiene el base64 completo | 0 hits (completo Y prefijos `VG9wU2Vj`/`VG9w`) | psql-rows.txt | ✅ |
| 3 | Control positivo del grep | `caracteres`, `api_key`, `port` → 1 hit c/u | §1 | ✅ |
| 4 | json con valor sensible redactado | `{"api_key":…,"port":…,"admin":…,"note":…}`; 0 hits de `zebra-quokka-9182` y `8443` | psql-rows.txt | ✅ |
| 5 | Sin regresión del `jwt` de 14.8 | `eyJhbGci….…` — header + `.….…` intacto | psql-rows.txt | ✅ |
| 6 | Sin regresión del recorrido F2 | 8 specs `@f2` verdes, incl. aislamiento entre cuentas | e2e.txt | ✅ |
| 7 | `pnpm gate` verde | **58 ficheros, 593 tests passed** | gate.txt | ✅ |
| 8 | `pnpm test:e2e` verde | **27 passed (1.8m)**, 0 flaky | e2e.txt | ✅ |
| 9 | La regla escrita describe el sistema real | **NO** — 2 filas de la tabla falsas + copy de usuario falso | §3 | ❌ |

## 3. Ataque a la REGLA — los 13 intentos de colar datos (`hole-poking.txt`)

Clave del ataque: **la redacción está condicionada al `kind` DETECTADO**. La regla vale lo que valga la detección. Cada probe: input → kind detectado → `preview` REAL en la fila.

| Intento | kind | preview en la fila | Veredicto |
|---|---|---|---|
| base64 url-safe sin padding | `base64` | `… (27 caracteres)` | ✅ aguanta |
| base64 con `-` y `_` | `base64` | `… (27 caracteres)` | ✅ aguanta |
| JSON anidado profundo | `json` | `{"a":{"b":{"c":…}}}` | ✅ corta a prof. 3 |
| Array de secretos | `json` | `[…,…,…]` | ✅ aguanta |
| URL con token en **query** | `url` | `https://api.example.com/…` | ✅ aguanta |
| URL con token en **fragment** | `url` | `https://example.com/…` | ✅ aguanta |
| URL con **userinfo** `admin:hunter2pass@` | `url` | `https://example.com/…` | ✅ `new URL` lo tira |
| uuid | `uuid` | verbatim | ✅ documentado |
| **JSON malformado** `{"pw":"leakme123",}` | **`text`** | **`{"pw":"leakme123",}`** | 🔴 **contradice la regla escrita** |
| **Escalar de nivel superior** `"supersecretvalue"` | **`text`** | **`"supersecretvalue"`** | 🔴 **contradice la regla escrita** |
| Secreto en la **CLAVE** `{"sk-live-abc123xyz":true}` | `json` | `{"sk-live-abc123xyz":…}` | 🟡 residual |
| Token API de 64 hex | `hash` | verbatim entero | 🟡 residual |
| Texto plano con secreto | `text` | verbatim | 🟡 por diseño |

Grep de confirmación sobre la fila real — estos secretos **sobreviven legibles en la BD** (`leak-text-rows.txt`):

```
leakme123                          hits=1
supersecretvalue                   hits=1
sk-live-abc123xyz                  hits=1
hunter2pass                        hits=1
a1b2c3d4e5f60718293a4b5c6d7e8f90   hits=1
```

### 🔴 3.1 — La tabla de reglas afirma dos garantías que el sistema no da

`redact.ts` documenta como propiedad de seguridad:

> `| json | estructura + CLAVES; todo VALOR → … |` … **«JSON inválido → `…`»**
> y en el código: *«Escalar (incluido el JSON de nivel superior `"secreto"` o `42`): nunca sobrevive.»*

**Las dos son falsas end-to-end.** Causa raíz en `detectors.ts`: `detectJson()` exige que `JSON.parse` funcione **y** que el resultado «no sea un escalar desnudo». Por tanto:

- un JSON **malformado** nunca llega a `redactJson()` → cae en `text` → **verbatim**;
- un **escalar de nivel superior** nunca llega a `redactJson()` → cae en `text` → **verbatim**.

`redactJson()` sí hace lo que promete — pero para entradas que el sistema **no puede** enrutar hacia él. La regla describe la **función aislada**, no el **sistema**.

### 🔴 3.2 — Los dos unit tests que lo «protegen» son inertes

`redact.test.ts:107` y `:112`:

```ts
it('un JSON de nivel superior escalar no deja rastro', () => {
  expect(redactInput('"hunter2"', 'json')).toBe('…');      // kind='json' IMPOSIBLE para este input
  expect(redactInput('1752624000', 'json')).toBe('…');     // idem
});
it('JSON inválido falla hacia el lado seguro (… entero)', () => {
  expect(redactInput('{"password":"hunter2"', 'json')).toBe('…');  // kind='json' IMPOSIBLE para este input
});
```

Pasan en verde forzando a mano un par `(input, kind)` que el detector jamás produce. Describen una protección que no existe. **Es el mismo defecto de T2.3 que originó esta tarea**, reintroducido en la tarea que venía a arreglarlo (forma 8 del anti-patrón en la skill `testing`).

### 🔴 3.3 — El copy de usuario promete algo que el producto no cumple

`history-panel.tsx` sustituye el texto anterior por una promesa **absoluta**:

```diff
-Tus últimas 50 entradas — vista previa redactada, nunca el dato crudo.
+Tus últimas 50 entradas — vista previa redactada: nunca guardamos secretos en claro.
```

Renderizado y confirmado en `/history` (`curl` sobre la página servida). Es **demostrablemente falso**: `leakme123`, `supersecretvalue`, `hunter2pass` y un token de 64 hex están en claro en la BD. El copy anterior («nunca el dato crudo») era vago pero defendible; el nuevo es una garantía de privacidad que el sistema no honra — **peor que el hueco original**, porque el usuario decide qué pegar confiando en ella.

### Qué debe arreglar el implementer (accionable)

1. **Cerrar el hueco o corregir la regla escrita** — decisión de producto, no del verifier:
   - *opción A*: enrutar a la rama de redacción también lo que «parece JSON pero no parsea» (tras `trim()`, empieza por `{`/`[`/`"` → `…` entero). Cubre malformado y escalar entrecomillado.
   - *opción B*: corregir la tabla de `redact.ts` para que describa el sistema **end-to-end** («JSON inválido y escalar de nivel superior NO se redactan: caen en `text` y se persisten verbatim») y elevarlo a residual explícito del PRD §8.
2. **Rehacer los dos tests inertes**: deben partir del **input crudo** y pasar por detección real (`buildHistoryRecord(input, chain)` con la `chain` que produce el motor), nunca inyectando `kind='json'` a mano. Un test de privacidad que fija el `kind` no prueba nada del sistema.
3. **Añadir un caso de integración con JSON malformado**, que es el que hoy fuga.
4. **Arreglar el copy** de `/history` para que sea cierto para TODOS los kinds.
5. **Nombrar los dos residuales** (`hash` verbatim y secreto-como-clave-JSON) en el PRD §8.

## 4. Criterios pedidos explícitamente

**Residual de `hash` (token de 64 hex guardado entero) — NO bloquea; sí debe documentarse.**
El criterio (b) de la ficha es «nunca se conserva algo que pueda **descodificar** a texto legible». Un hex de 64 es opaco: no descodifica a nada, a diferencia de un base64. Además `hash` queda **fuera del mandato** de la ficha («al menos `base64` y `json`»), y un digest es justo el dato **útil** de ver en el historial — redactarlo dejaría la entrada sin sentido. El riesgo real (un bearer token que resulta ser hex, indistinguible de un digest) es **inherente a la detección por forma**, no arreglable dentro de esta tarea. Veredicto: **residual aceptable**, pero debe subir del comentario de código al **PRD §8** como residual asumido y nombrado, igual que se hizo con el hueco de `jwt`.

**`url` — NO es scope creep censurable; está bien justificado y bien implementado.**
La ficha dice «**al menos** `base64` y `json`» y encarga «los kinds que con más probabilidad transportan secretos»: una URL con `?access_token=` es exactamente eso, así que `url` cae **dentro** del mandato. Comprobado empíricamente que no filtra por ningún lado: query fuera, fragment fuera, y el **userinfo** (`admin:hunter2pass@`) lo descarta `new URL` sin código extra. Se conserva `scheme://host`, que es lo que hace la entrada reconocible; el host es un residual menor y consciente (revela *con qué servicio* habló el usuario, no sus credenciales). **Se mantiene tal cual.**

**Límites del producto — no se rebajó ninguno.**
El cambio de `history.spec.ts` solo añade `extraHTTPHeaders: {'x-forwarded-for': '203.0.113.22'}` a la spec —una cabecera que cualquier cliente real manda— para sacarla del bucket compartido `'unknown'` donde colisionaba con `auth.spec.ts`. Los límites (10 altas / 15 min por IP) siguen intactos en el código de producto, que el diff **no toca**. Patrón ya usado en `f0`/`f2`. Correcto: es un refuerzo del aislamiento del test, no un debilitamiento del producto.

## 5. Rarezas y deuda

1. **`next dev` NO hidrata la app en esta máquina — invalida `next dev` como entorno CUA.** Con `pnpm dev` / `next dev -p 3000`, el formulario de signup queda **sin hidratar** (`Object.keys(form)` sin ninguna clave `__react*`): el submit se va como **GET nativo y la contraseña acaba en la barra de direcciones** (`/signup?email=…&password=…`), y no se crea ningún usuario. Sin errores en consola; los chunks base cargan pero nunca llega el chunk de la página. Con `next build && next start` **hidrata perfecto** y todo funciona. **No es un defecto de T2.4** (no toca auth ni build) y no afecta a producción ni al e2e (ambos usan `next start`), pero obliga a que cualquier gate CUA de este proyecto corra contra el build de producción. Merece una línea en `cua.md` junto al gotcha de `next start` que ya existe, y que alguien mire si es Turbopack o configuración.
2. **Ruido pre-existente en `next dev`**: `instrumentation.ts` emite decenas de *«Ecmascript file had an error / A Node.js module is loaded ('node:path') which is not supported in the Edge Runtime»*. Ya está asumido por comentario en el propio fichero. No aparece en `next start`.
3. **Consola del navegador limpia** en el build de producción durante todo el recorrido (`errors` vacío; solo el aviso informativo de React DevTools).
4. **Deuda menor**: el secreto **en la clave** de un JSON (`{"sk-live-abc123xyz":…}`) sobrevive. Es consecuencia deliberada de conservar claves (son lo que hace la entrada reconocible) y no bloquearía por sí solo, pero merece una línea en la tabla de la regla — hoy dice «las claves son nombres de campo, no el dato», que es una suposición, no una garantía.

## Coste real

**$0** (estimado $0). Sin APIs de pago: todo el recorrido es local contra el compose dev y el build de producción en `127.0.0.1:3000`.

## Evidencias

- `psql-rows.txt` — las 3 filas crudas (base64, json, jwt)
- `hole-poking.txt` — los 13 intentos de colar datos, con kind detectado y preview real
- `leak-text-rows.txt` — las filas `text` que conservan secretos verbatim
- `gate.txt` — `pnpm gate` (58 ficheros / 593 tests passed)
- `e2e.txt` — `pnpm test:e2e` (27 passed, 1.8m)
- `01-history-redactado.png` — `/history` con las vistas previas redactadas

---

## ADDENDUM — Re-verificación tras el arreglo (2026-07-19)

- **Ejecutor**: agente `verifier` · agent-browser · sesión `t2.4b`
- **Sistema**: base `05e021b` + diff de T2.4 (los 5 ficheros de la tarea) · `next build` + `next start -p 3000` (build de PRODUCCIÓN, por la Rareza 1) · `DATABASE_URL` a `127.0.0.1:5433/devtools` (compose **dev**)
- **Producción**: NO tocada. `devtools-web-1` sano y health → 200 al inicio y al cierre.
- **Recorrido**: COMPLETO, no solo lo que falló. Cuenta nueva y **literales nuevos** (`TGF1bmNoQ29kZU9tZWdhNzc=` → `LaunchCodeOmega77`; `{"db_pass":"quokka-77-zulu",…}`), para no reutilizar ni los de la vuelta 1 ni los del implementer.

### VEREDICTO FINAL: **PASS** (revierte el FAIL de la primera pasada)

| # | Bloqueante de la vuelta 1 | Estado |
|---|---|---|
| 1 | Tabla de reglas con dos garantías falsas | **Resuelto**: describe el sistema end-to-end, con aviso de que el enrutado es por **kind REAL del detector**, y la fila `text` corregida |
| 2 | Dos unit tests inertes | **Resuelto**: parten del **input crudo** vía `buildHistoryRecord(input, analyze(input))` y **verifican su propia premisa** |
| 3 | Copy con promesa absoluta falsa | **Resuelto**: ya no afirma nada absoluto |

### 1. Verificación literal repetida entera

```
-[ RECORD 1 ] input_kind | base64  preview | … (24 caracteres)
-[ RECORD 2 ] input_kind | json    preview | {"db_pass":…,"retries":…,"tls":…,"tag":…}
-[ RECORD 3 ] input_kind | text    preview | …          <- JSON malformado (el arreglo)
-[ RECORD 4 ] input_kind | text    preview | …          <- escalar entrecomillado (el arreglo)
-[ RECORD 5 ] input_kind | jwt     preview | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.….…
```

```
=== NEGATIVE (must be 0) ===          === POSITIVE CONTROL (must be >0) ===
b64 decoded 'LaunchCodeOmega77'   0   'caracteres' (descriptor b64)      1
b64 FULL string                   0   'db_pass' (clave json conservada)  1
b64 PREFIX 'TGF1bmNo' (BITES)     0   'retries' (clave json conservada)  1
json value 'quokka-77-zulu'       0   jwt header (14.8 INTACTO)          1
json number 9182                  0
MALFORMED json value (el arreglo) 0
bare scalar 'barenakedsecret42'   0
jwt payload 'eyJzdWIi'            0
```

### 2. Control negativo — hecho por el verifier, sin tocar código de producto

Script propio que importa el **`analyze()` REAL** del motor y compara la redacción real contra una réplica **sin** la rama `looksLikeJson`:

```
caso                      kind      SIN-fix (hueco)              CON-fix (real)
JSON malformado           text      "{\"password\":\"leakme123\"" "…"  ✅ MUERDE
escalar entrecomillado    text      "\"supersecretvalue\""       "…"  ✅ MUERDE
array malformado          text      "[\"leakme123\","            "…"  ✅ MUERDE
```

El `kind` lo produce el **detector real** (`text`), así que **el rojo cae en un camino que producción recorre** — que era el defecto de la vuelta anterior.

**Auditoría de la regla 5 (no debilitar tests)**: comprobado con `git show HEAD:…` que los dos tests inertes **nunca estuvieron en HEAD committeado**; eran de la primera pasada sin commitear del implementer. Borrarlos no debilita nada establecido.

### 3. Ataque a la regla — 13 probes originales + 13 nuevos contra la frontera movida

Los dos huecos de la vuelta 1, **cerrados**. **Ningún kind pierde entradas por la nueva rama**, comprobado uno a uno: `jwt`, `Bearer eyJ…`, `base64`, `url`, `uuid`, `unix_timestamp`, IPv6 url → todos sin cambio. `trim()` no abre nada. Cobertura extra ganada: `{'pw':'leakme456'}` (comillas simples) → `…`.

### 4. Residuales — ninguno bloquea

Dos entradas siguen filtrando: `callback({"pw":"x"})` y `config x{"pw":"x"}` → `text` verbatim (JSON **embebido** que no empieza por el sigilo).

**No bloquean, y el discriminador es el de la vuelta 1**: aquel FAIL fue porque el **comportamiento contradecía la regla escrita**. Estos **coinciden** con ella (dice `text` verbatim *salvo que EMPIECE por* `{`/`[`/`"`). Comportamiento = afirmación. No son regresiones y caen fuera del mandato.

**Coste del remedio: razonable.** La foto es asimétrica y conviene decirla entera: el sigilo inicial **sobre-redacta** texto legítimo (`[INFO] user=admin` → `…`) y **sub-redacta** el JSON embebido. Ambas son inevitables en una heurística de primer carácter y coherentes con lo documentado. Buscar JSON en cualquier posición costaría mucha más superficie y falsos positivos.

**Copy: correcto, no bloquea.** Literalmente cierto para los kinds que nombra y **sin ninguna afirmación falsa**. Laguna menor: callaba sobre los verbatim y omitía `url` (que sí se redacta).

### 5. Gate y E2E (verificados por el verifier)

`pnpm gate` **58 ficheros / 597 tests**; `pnpm test:e2e` **27 passed (1.7m)**, 0 flaky; 8 specs `@f2` verdes; consola limpia.

### 6. Rarezas vigentes

1. **`next dev` no hidrata la app en esta máquina** (el signup sale como GET nativo con la contraseña en la URL); con `next build && next start` funciona. Toda la re-verificación se hizo sobre el build de producción. Merece la línea en `cua.md`.
2. Residual (c) sin nombrar en el módulo — *(cerrado por el bucle tras esta re-verificación)*.
3. El copy podría nombrar el otro lado de la regla — *(cerrado por el bucle tras esta re-verificación)*.

**Coste real**: **$0**.

### Evidencias de la re-verificación

`psql-rows-rerun.txt`, `greps-rerun.txt`, `hole-poking-rerun.txt`, `negative-control.ts`, `leak-check-rerun.txt`, `gate-rerun.txt`, `e2e-rerun.txt`, `02-history-copy-rerun.png`.

**T2.4 queda VERIFICADA: PASS.**

---

### Cierre del bucle sobre las dos recomendaciones (no bloqueantes)

Tras el PASS, el bucle aplicó las dos recomendaciones del verifier, por ser exactamente el objeto de esta tarea (que las afirmaciones de privacidad sean honestas):

- **Residual (c) nombrado** en `redact.ts`: un `text` que CONTIENE JSON sin empezar por `{`/`[`/`"` se guarda verbatim, con la asimetría escrita (sobre-redacta `[INFO] …`, sub-redacta el JSON embebido) y el porqué de no perseguirlo.
- **Copy completado**: añade «de una URL, el dominio» (que se redactaba y no se decía) y «El resto (texto, hashes, UUIDs y timestamps) se guarda tal cual», que cierra el silencio sobre los kinds verbatim.
