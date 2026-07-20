# Verificación T4.1 — Redacción defensiva del preview: ningún payload de JWT sobrevive, sea cual sea el kind

- **Tarea**: T4.1 · Redacción defensiva del preview (`planning.md`, F4 — Post-v1)
- **Fecha**: 2026-07-20
- **Ejecutor**: agente `verifier` · agent-browser (npx) · sesión `t4.1`
- **Sistema**: base `ac2139e` + **el diff de T4.1 SIN COMMITEAR** (working tree) · docker compose dev (Postgres 16, `127.0.0.1:5433`) · `pnpm dev` en `localhost:3000` · `{"ok":true,"db":true}` (`02-health.txt`)
- **Entorno**: LOCAL. **No se tocó producción** (`https://devtools.carlosvillu.dev`).
- **BD**: baseline 70 filas / 10 usuarios (`00-db-baseline.txt`) → **restaurada a 70 / 10** (`14-db-restaurada-final.txt`).
- **Gate**: `pnpm gate` **verde, exit 0** — lint, typecheck, prettier, knip, readme:status y **670 tests / 60 ficheros** (`15-gate.txt`). Re-corrido por el verifier, no citado de terceros.

## Verificación esperada (literal de planning.md)

> Con cuenta iniciada, pegar en `/` una **petición HTTP completa** que contenga `Authorization: Bearer <JWT canario>` más una cabecera con punto (`Host: api.example.com`); después, `pg_dump --data-only` de la BD **completa** grepeado por los marcadores del canario **y** por el segmento base64 crudo del payload → **0 coincidencias** (mismo método que cerró la fuga en T3.3). **Control negativo obligatorio**: revertir el barrido y comprobar que ese mismo grep **encuentra** el payload (si no lo encuentra, el test no prueba nada). Sin regresión: los kinds ya cubiertos (`jwt`, `json`, `base64`, `url`) mantienen su redacción actual, y `hash`/`uuid`/`unix_timestamp` siguen verbatim a propósito.

## Metodología anti-fantasma

Tres decisiones tomadas **antes** de ejecutar, porque sin ellas un PASS no probaría nada:

1. **Canarios propios, no los del implementer.** Se acuñaron 11 JWT nuevos (`make-canaries.mjs`, `make-canaries2.mjs`), cada uno con su marcador **al principio** del JSON del payload para que el segmento base64 crudo diverja desde los primeros caracteres y el grep sea discriminante.
2. **El objetivo del grep sobrevive al truncado.** El preview se trunca a 120 **después** de redactar; si el prefijo del payload cayera más allá del corte, un 0-coincidencias lo habría producido el truncado, no el barrido. Se verificó que los 7 prefijos de 28 chars sobreviven al truncado verbatim (`01-truncation-check.txt`).
3. **Grep idéntico en la corrida buena y en el control negativo** (el mismo `grep-canaries.sh`), y **controles positivos** que deben dar >0 (el header, `api.example.com`, `access_token=`) para probar que la fila se escribió y el grep apunta bien.

**Un fantasma cazado durante la ejecución**: el primer canario de «padding» **no tenía padding**. `{"alg":"HS256","typ":"JWT"}` son 27 bytes, divisibles por 3, así que base64 no genera ningún `=`. Se re-acuñaron headers de 26 y 25 bytes para obtener `=` y `==` reales (`canaries2.json`) y se repitió el caso. Sin esta comprobación, la fuga (3) habría quedado «verificada» sobre un input que nunca la ejercitaba.

## Pasos ejecutados

Todo el pegado se hizo **desde la UI con agent-browser**, como un humano (`fill` sobre el textarea de `/`), con cuenta creada e iniciada desde el navegador. No se usó la API para el paso verificado.

1. Alta + login en el navegador → `/` con sesión iniciada.
2. **Caso literal**: pegada la petición HTTP completa con `Authorization: Bearer <canario>` + `Host: api.example.com` (`03-http-request.png`).
3. Pegadas las **otras 8 formas de fuga**: `alg:none` con firma vacía, prefijo pegado por punto `v2.local.`, padding `=` y `==`, y las tres formas `clave=<JWT>` (**cookie, query param, cuerpo de formulario**).
4. Pegados el **residual declarado** (`foo.<b64>.bar`) y una línea de **no-regresión** (host, semver, sha256, md5, uuid).
5. `pg_dump --data-only` de la BD **completa** → grep (`04`, `05`).
6. **Control negativo** (sección propia) → `06`, `07`.
7. **Sin regresión por kind**: un input de cada kind → `10`, `11`, `12`.
8. Consola del navegador (`09`), `/history` renderizado (`13`), BD restaurada (`14`), `pnpm gate` (`15`).

## Resultado observado vs esperado

### A. Las fugas — `pg_dump` completo grepeado (`05-grep-resultado.txt`)

Las 9 formas cayeron en `input_kind = 'text'` (asertado, no supuesto: es lo que prueba que actúa **el barrido** y no la rama `jwt` de siempre).

| # | Forma | Preview persistido | marcador | payload b64 | OK |
|---|---|---|---|---|---|
| 1 | **HTTP completa** (cláusula literal) | `Authorization: Bearer eyJhbGci….….…` | 0 | 0 | OK |
| 2 | `alg:none`, firma vacía | `Bearer eyJhbGciOiJub25lIi….….…` | 0 | 0 | OK |
| 3 | Prefijo pegado por punto `v2.local.` | `Bearer v2.local.eyJhbGci….….…` | 0 | 0 | OK |
| 4 | Padding `=` (real, `pad1`) | `Bearer …IkpXIn0=.….…` | 0 | 0 | OK |
| 5 | Padding `==` (real, `pad2`) | `Bearer …IkoifQ==.….…` | 0 | 0 | OK |
| 6 | **`Cookie: access_token=<JWT>`** | `Cookie: access_token=eyJhbGci….….…` | 0 | 0 | OK |
| 7 | **`?id_token=<JWT>` (query param)** | `GET /cb?id_token=eyJhbGci….….…&state=x` | 0 | 0 | OK |
| 8 | **`id_token=<JWT>` (form body)** | `grant_type=refresh&id_token=eyJhbGci….….…&x=1` | 0 | 0 | OK |
| 9 | Cookie **+ padding** combinados | `Cookie: access_token=…IkpXIn0=.….…` | 0 | 0 | OK |

**Las tres formas `clave=<JWT>` (6, 7, 8) son el hueco que el implementer declaró NO VERIFICADO contra la BD. Queda cerrado aquí: verificadas contra el `pg_dump` real, no solo a nivel unitario.**

### B. Controles positivos — prueban que el canal lleva datos y el grep apunta bien

| Sonda | hits | Lectura |
|---|---|---|
| `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9` (el header) | 8 | la fila se escribió; el header se conserva a propósito |
| `api.example.com` | 14 | **el barrido no se come los hosts** |
| `access_token=` | 2 | el nombre del parámetro sobrevive; se elide lo de detrás |
| `a1b2c3…` (sha256), `550e8400-…` (uuid), `v20.11.1` | 1 / 3 / 1 | digests, UUID y semver intactos |

### C. Control negativo obligatorio (`07-grep-negcontrol.txt`) — **el rojo**

No se podía revertir el barrido editando `redact.ts` (mandato: el verifier no toca código de producto). Se hizo algo **más fiel**: se creó un **worktree en `ac2139e` (HEAD, pre-T4.1, sin `sweepJwtLike`)** y se ejecutó **el `buildPreview` REAL de antes de la tarea** sobre los mismos canarios; sus salidas se insertaron como filas de historial y se corrió **el mismo `grep-canaries.sh`** contra un `pg_dump` nuevo.

```
### FUGAS — se espera 0 coincidencias en cada una
http         marcador=CANARYHTTP41       hits=0   payload28=eyJjIjoiQ0FOQVJZ… hits=1   *** FUGA ***
algnone      marcador=CANARYNONE41       hits=0   payload28=eyJjIjoiQ0FOQVJZ… hits=1   *** FUGA ***
paseto       marcador=CANARYPASETO41     hits=0   payload28=eyJjIjoiQ0FOQVJZ… hits=1   *** FUGA ***
padding      marcador=CANARYPADDING41    hits=0   payload28=eyJjIjoiQ0FOQVJZ… hits=1   *** FUGA ***
cookie       marcador=CANARYCOOKIE41     hits=0   payload28=eyJjIjoiQ0FOQVJZ… hits=1   *** FUGA ***
query        marcador=CANARYQUERY41      hits=0   payload28=eyJjIjoiQ0FOQVJZ… hits=1   *** FUGA ***
form         marcador=CANARYFORM41       hits=0   payload28=eyJjIjoiQ0FOQVJZ… hits=1   *** FUGA ***
pad1         marcador=CANARYPAD1x41      hits=0   payload28=eyJjIjoiQ0FOQVJZ… hits=1   *** FUGA ***
pad2         marcador=CANARYPAD2x41      hits=0   payload28=eyJjIjoiQ0FOQVJZ… hits=1   *** FUGA ***
VEREDICTO GREP: *** HAY FALLOS ***
```

**El grep encuentra el payload en las 9 formas cuando el barrido no está.** El 0-coincidencias de la sección A es por tanto un hecho sobre el código, no un artefacto del método. Filas del control negativo borradas después.

> **Matiz honesto sobre la cláusula literal.** La Verificación pide grepear «por los marcadores del canario **y** por el segmento base64 crudo». El marcador **decodificado** da 0 incluso en el control negativo: nada en este canal decodifica el payload hacia la fila, así que esa sonda **no es discriminante por sí sola** — el que muerde es el **segmento base64 crudo**. Se ejecutaron ambas, y esto coincide con lo que el propio test de integración del implementer anota como «guarda de regresión FUTURA, no el assert que muerde».

### D. Sin regresión por kind (`10`, `12`)

| kind | Preview observado | Esperado | OK |
|---|---|---|---|
| `jwt` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.….…` | header, resto elidido | OK |
| `json` | `{"password":…,"user":…}` | claves sí, valores no | OK |
| `base64` | `… (32 caracteres)` | ni un carácter del contenido | OK |
| `url` | `https://api.example.com/…` | esquema+host, resto `/…` | OK |
| `hash` | `a1b2c3…d8e9` (64 hex) | **verbatim a propósito** | OK |
| `uuid` | `550e8400-e29b-41d4-a716-446655440000` | **verbatim a propósito** | OK |
| `unix_timestamp` | `1752624000` | **verbatim a propósito** | OK |

Grep de los canarios de kind redactado (`CANARYJWTKIND41`, `CANARYJSON41`, `CANARYB64KIND41`, `CANARYURL41`): **0 coincidencias las cuatro**.

### E. Residual declarado (punto 5 del encargo)

`foo.c3VwZXItc2VjcmV0LUNBTkFSWVJFU0lEVUFMNDEtdmFsdWU.bar` (ningún segmento decodifica a JSON con `alg`) → **se persiste VERBATIM**, como estaba declarado. El comportamiento coincide con las palabras: está nombrado en `redact.ts` (§ «ASIMETRÍA ASUMIDA → SUB-redacta») **y** en el PRD §301 (bloque «Lo que esta regla NO promete»). Sigue siendo cierto y sigue estando nombrado.

### F. Las tres superficies de texto (punto 4 del encargo)

Leídas **contra el comportamiento observado**, no contra el diff. **Ninguna promete más de lo que el código hace** — el modo de fallo de las vueltas 1 y 2 (el absoluto «de un JWT nunca sobrevive el payload») está corregido en las tres: las tres dicen explícitamente que es una **red ancha, no un absoluto**, y las tres nombran el residual del token opaco.

| Superficie | Afirmación | ¿La respalda lo observado? |
|---|---|---|
| README | barre HTTP entera / cookie / query param / form body | Sí: las 4 verificadas (casos 1, 6, 7, 8) |
| README | «alguna parte del token descodifique a JSON con `alg`»; lo que no, se guarda entero | Sí: verificado con el residual (E) |
| PRD §301 | cubre `alg:none`, prefijo por punto, padding `=` | Sí: los 3 verificados (casos 2, 3, 4-5) |
| `history-panel.tsx` | «también cuando viaja dentro de un texto más largo: petición HTTP, cookie, parámetro de URL» | Sí: verificadas; renderiza correcto (`13-history-copy.png`) |

**Hallazgo (no bloqueante, ver Rarezas)**: PRD §301 enumera **3** de las 4 formas cubiertas — omite justamente la familia `clave=<JWT>` (cookie / query / form body), la **más común** y la que se descubrió en la 2.ª vuelta. README y el copy del panel **sí** la nombran. Es un **undersell** (el PRD promete menos de lo que el código hace), no un overpromise, así que no falsea nada ante el usuario; pero las tres superficies **no dicen exactamente lo mismo**.

## Sobre `pnpm test:e2e` (decisión de alcance, no omisión)

**No se ejecutó**, y es deliberado. La regla 10 del planning lo pide para tareas cuya Entrega añada o modifique **comportamiento operable en navegador**; aquí la única superficie web tocada es `history-panel.tsx`, y el cambio es **copy estático** (un párrafo descriptivo): no añade interacción, estado ni ruta nueva. La Verificación literal de T4.1 vive en la BD (`pg_dump` + grep), y su comportamiento observable en navegador quedó cubierto por la sesión CUA (`03-http-request.png`, `13-history-copy.png`, consola limpia). Se suma que el brief marca la no-idempotencia de `pnpm test:e2e` (rate limit de signup 10/15 min) como **deuda preexistente del arnés, ajena a T4.1**. El equivalente permanente de esta tarea ya vive en `pnpm gate`: el test de integración contra la BD real de `analyze-history.test.ts` más los 206 nuevos casos unitarios de `redact.test.ts`, los 670 verdes.

## Coste real

**$0** — sin APIs de pago (vs estimado $0). Todo el trabajo fue local: Postgres en Docker, `pnpm dev`, agent-browser contra `localhost`.

## Higiene de la evidencia

Los `pg_dump` persistidos (`04`, `06`, `11`) llevan **elididas** las secciones `public."user"` y `public.session`: contenían `password_hash` e `id` de sesión de los usuarios de desarrollo, y CLAUDE.md prohíbe secretos en el árbol. **El grep de la Verificación sí corrió sobre el dump COMPLETO** (requisito literal); lo filtrado es solo el artefacto que se commitea. La sección `history_entry` —que es la evidencia— se conserva íntegra. Verificado: 0 hashes bcrypt y 0 emails en los ficheros persistidos.

## Veredicto

**PASS** — el barrido defensivo impide que el payload de un JWT llegue a la BD en las **9 formas de fuga ejercitadas** (incluidas las tres `clave=` que estaban sin verificar contra la BD), el control negativo demuestra en rojo que el grep sí las encontraría sin el barrido, no hay regresión en ningún kind y las tres superficies de texto son consistentes con el comportamiento real sin prometer un absoluto.

### Rarezas y notas (aunque el veredicto sea PASS)

1. **PRD §301 se queda corto**: enumera 3 de las 4 formas cubiertas, omitiendo la familia `clave=<JWT>` que README y el panel sí nombran. Undersell, no overpromise → no bloquea, pero conviene alinear las tres superficies.
2. **«algún segmento decodifica»** (PRD/README) es una simplificación: en la forma `clave=<JWT>` lo que decodifica es **lo que hay tras el último `=` dentro** del segmento, no el segmento entero. No engaña, pero no es literal.
3. **La sonda del marcador decodificado no discrimina** (da 0 también en el control negativo). Quien repita esta verificación debe apoyarse en el **segmento base64 crudo**.
4. **Prefijo pegado por `-` o `_`** (`token-<JWT>`): no ejercitado contra la BD, pero por lectura del código cae **dentro del residual ya declarado** (el segmento no decodifica → sobrevive). No es un defecto nuevo; es la asimetría que el código y el PRD ya nombran. Se anota por completitud.
5. **Consola del navegador limpia** (`09-browser-console.txt`): solo el aviso de React DevTools y logs de HMR. Ningún error ni warning de código propio.
6. **Fantasma cazado**: el primer canario de padding no tenía `=` (27 bytes ≡ 0 mod 3). Corregido y repetido; se anota porque es una trampa fácil de repetir.
7. **NO VERIFICADO**: el presupuesto de 500 ms del test de rendimiento del implementer **no se midió en CI lenta** (sigue tal como el implementer lo declaró). No forma parte de la Verificación literal de T4.1.
