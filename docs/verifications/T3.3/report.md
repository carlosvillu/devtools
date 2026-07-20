# Verificación T3.3 — E2E de fase F3 (cierre del proyecto v1)

- **Tarea**: T3.3 · E2E de fase F3 (`planning.md`)
- **Fecha**: 2026-07-20
- **Ejecutor**: agente `verifier` · agent-browser (npx) · sesiones `t3.3` (vuelta 1) y `t3.3b` (vuelta 2)
- **Veredicto final**: ✅ **PASS** (vuelta 2, contra producción = `5d6fb35`)
- **Historial**: 🔴 FAIL en la vuelta 1 (producción `684bc53`) → arreglo `5d6fb35` → ✅ PASS en la vuelta 2.

> Este report conserva **a propósito** la traza completa del FAIL y de su causa: es la evidencia de que el E2E de fase hizo su trabajo. El defecto que bloqueó el cierre de v1 lo encontró esta verificación, no la suite.

## Verificación esperada (literal de planning.md)

> **cierra el criterio 14.10 del PRD**: desde fuera del VPS, `https://devtools.carlosvillu.dev` con certificado válido, el recorrido de 14.1 (pegar un JWT → cadena) funciona en producción, y el backup produce un dump restaurable. Además, sin regresión: `pnpm test:e2e` completo en verde contra el entorno local. Parada de fin de fase y cierre del proyecto v1.

Criterios del PRD implicados, literales:

> **14.10** — Desde fuera del VPS, `https://devtools.carlosvillu.dev` sirve la app con certificado válido y el recorrido de 14.1 funciona en producción. Forzar el backup produce un dump legible por `pg_restore --list` (F3).
>
> **14.1** — Pegado en `/` un `Authorization: Bearer <JWT>` real, el navegador muestra en < 1 s la cadena `jwt → json` con el payload formateado y la expiración en lenguaje natural, sin que el usuario elija nada (CU1).
>
> **CU1** (PRD §3, línea 86) — **El token opaco.** Está depurando una petición fallida y tiene un `Authorization: Bearer …`. **Lo pega entero (con el prefijo `Bearer`)** y obtiene el payload del JWT formateado y la fecha de expiración en lenguaje natural.

---

# VUELTA 1 — FAIL (producción `684bc53`) · traza conservada

## El defecto: producción no reconocía `Authorization: Bearer <JWT>`

Pegué en `/` de producción, con **pegado real de portapapeles** (evento `paste`, sin botón), la cadena literal que nombra 14.1. Observado (`12-cadena-render.txt`, `13-FALLO-authorization-bearer.png`):

```
1 paso · terminal
No se reconoció ningún formato conocido
Se intentó detectar jwt, json, base64, timestamp, url, uuid y hash.
```

Aislamiento de la causa contra la API de producción (`17-api-prefijo-bearer.txt`):

| Entrada | Detección | Cadena |
|---|---|---|
| `Authorization: Bearer eyJ…` | `text` (0.01) | ❌ 1 paso |
| `Bearer eyJ…` | `jwt` (0.95) | ✅ 3 pasos |
| `eyJ…` desnudo | `jwt` (0.95) | ✅ 3 pasos |

El motor recortaba `Bearer ` pero **no** el nombre de cabecera `Authorization: `.

## El agujero de cobertura que lo dejó pasar

**Ningún test del repo ejercitaba la forma con `Authorization: `.** Los 14 fixtures de JWT usaban `Bearer <jwt>` — incluido `apps/web/e2e/phases/f1.spec.ts:31`, bajo el test titulado *"CU1 (14.1)"*. **El E2E que se declaraba guardián de 14.1 verificaba una entrada más fácil que la que el criterio especifica.** Por eso 27 tests en verde convivían con el recorrido roto.

---

# VUELTA 2 — PASS (producción `5d6fb35`) · re-verificación COMPLETA

Re-ejecuté **el flujo entero**, no solo la cláusula que falló: el binario de producción cambió, así que no heredo mi propio PASS anterior.

**Sistema**: HEAD local `5d6fb35` = producción. Contenedor `devtools-web-1` reconstruido 2026-07-20T13:58:14Z (`40-estado-sistema.txt`). **El arreglo está en el binario que se sirve**, no solo en el repo — `grep` dentro del contenedor encuentra `Authorization:\s*)?Bearer` en los chunks SSR y estáticos servidos (`54-log-fatal-final.txt`).

## 1. El recorrido de 14.1 con la cadena LITERAL ✅

Pegado real de portapapeles de `Authorization: Bearer <JWT>` contra `https://devtools.carlosvillu.dev` (`41-14.1-literal-REVERIFY.txt`, `43-14.1-literal-OK.png`):

```
3 pasos · terminal
la cadena   jwt → json
0  jwt 0.95 jwt.decode
   exp: 2026-09-01T12:00:00Z (caduca en 1 mes)
1  json 0.99 json.format   → JSON formateado a 2 espacios
2  json 0.99               → Sin más transformaciones aplicables
```

Cada sub-cláusula de 14.1, comprobada: cadena `jwt → json` ✅ · payload formateado ✅ · **expiración en lenguaje natural** (`(caduca en 1 mes)`, no solo el ISO) ✅ · **sin que el usuario elija nada** (el pegado dispara el análisis, sin botón) ✅ · **< 1 s**: 5 medidas contra producción con la cadena literal → **0,080–0,130 s** (`55-latencia-reverify.txt`) ✅.

## 2. No regresión + alcance del arreglo ✅

Matriz completa contra producción (`45-matriz-prefijos.txt`):

| # | Entrada | Resultado | Veredicto |
|---|---|---|---|
| 1 | `Authorization: Bearer <jwt>` | 3 pasos, `jwt` 0.95, `jwt.decode` | ✅ arreglada |
| 2 | `authorization:   bearer <jwt>` | 3 pasos, `jwt` 0.95 | ✅ case-insensitive + espacios |
| 3 | `Bearer <jwt>` | 3 pasos, `jwt` 0.95 | ✅ **sin regresión** |
| 4 | `<jwt>` desnudo | 3 pasos, `jwt` 0.95 | ✅ **sin regresión** |
| 5 | `Cookie: Bearer <jwt>` | 1 paso, `text` 0.01 | ✅ alcance acotado |
| 6 | `X-Api-Key: Bearer <jwt>` | 1 paso, `text` 0.01 | ✅ alcance acotado |

Lo que ya funcionaba sigue funcionando, y el alcance es exactamente el declarado (solo `Authorization`).

## 3. La fuga de privacidad, verificada end-to-end contra la BD ✅

Nadie la había comprobado end-to-end. La verifiqué con un **canario**: un JWT cuyo payload contiene marcadores únicos (`CANARIO-T33-FUGA-9471`, `NO-DEBE-APARECER-EN-BD-9471`) que puedo buscar en la BD entera (`61-jwt-canario.txt`).

Recorrido humano completo en producción: signup → pegar `Authorization: Bearer <canario>` → `/history` (`60`, `62`, `63`, `64`).

- **UI de `/history`** (`64-history-preview-redactado.png`): preview = `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.….…` — se conserva la **cabecera** del JWT (que es solo `{"alg":"HS256","typ":"JWT"}`) y se redactan **payload y firma**. Coincide con la política que la propia página declara ("De un JWT guardamos solo la cabecera").
- **La fila en la BD** (`65-fuga-canario-bd.txt`): `input_kind = jwt` — **este es el punto**. Antes del arreglo caía en `kind=text`, y `redactInput` devuelve el input VERBATIM para `text` (la página lo dice: "El resto (texto, hashes…) se guarda tal cual"). Al detectarse ahora como `jwt`, entra por la rama de redacción.
- **Prueba más dura**: `pg_dump --data-only` de la BD **completa**, grepeado por los tres marcadores del canario (incluido el segmento base64 crudo del payload) → **0 coincidencias**.

**No hay fuga.** Y queda confirmado que el arreglo cierra una fuga **preexistente**: la cadena causal (`Authorization:` → `kind=text` → preview verbatim) es consistente con lo observado en la vuelta 1.

> **NO VERIFICADO**: no reproduje el estado *pre-arreglo* de la fuga contra producción — exigiría revertir el binario de producción, inaceptable con un usuario real. La afirmación de que antes se persistía en claro descansa en la cadena causal de arriba y en la demostración del revisor adversarial, no en una observación mía.

## 4. Desde fuera del VPS, con certificado válido ✅

**Vantage declarado** (el bucle corre DENTRO del VPS, así que "desde fuera" exige vantage prestado):

- **Alcanzabilidad externa**: `WebFetch` desde infraestructura de Anthropic — genuinamente fuera del VPS y de su red. Devolvió el contenido real de la app. No es un `curl` a localhost. *(Precisión: `WebFetch` **no** expone el código HTTP — él mismo lo dice. El `http=200` lo establecen mis sondas `curl` de latencia; la aportación del WebFetch es el **contenido real devuelto desde fuera**, que es la prueba de alcanzabilidad.)*
- **Certificado público, no el del origen**: comprobé antes que el dominio resuelve a **IPs de Cloudflare** (`172.67.183.119`, `104.21.83.241`, `2606:4700:30…`) y **no** a `80.190.75.149` ni a loopback (`01-dns.txt`, `51-tls-cert-reverify.txt`).
- **El recorrido de navegador se origina DENTRO del VPS** (el CUA solo puede correr aquí) aunque atraviesa Cloudflare + TLS + Caddy. **No lo presento como "desde fuera"**: demuestra que la app del dominio funciona; la alcanzabilidad externa la cubre el WebFetch.

Cadena re-verificada (`51-tls-cert-reverify.txt`):

```
depth=2 GTS Root R4 · depth=1 GTS WE1 · depth=0 CN = carlosvillu.dev
Verify return code: 0 (ok)
issuer = C = US, O = Google Trust Services, CN = WE1
notBefore = Jun 23 2026 · notAfter = Sep 21 08:26:33 2026 GMT
SAN: DNS:carlosvillu.dev, DNS:*.carlosvillu.dev
```

SAN cubre el subdominio; caduca **63 días** en el futuro. Válido.

## 5. El backup produce un dump restaurable ✅

Ejercitado por mí sobre el estado nuevo (`52-backup-reverify.txt`, `53-pg-restore-list-reverify.txt`):

- Dump nuevo forzado: `devtools-20260720T140617Z.dump` (8700 B, sha256 `ba21576a…`).
- **`pg_restore --list` independiente** (contenedor `postgres:16` limpio, no el del script): **RC=0**, 27 entradas TOC, formato CUSTOM, las 4 `TABLE DATA`. Es el literal de 14.10.
- **Restore real** sobre BD desechable `devtools_restore_test`: creada vacía, restaurada (`__drizzle_migrations=1`, `history_entry=1`, `session=4`, `user=1` — coincide con producción tras mi limpieza) y **destruida** al terminar.

## 6. `pnpm test:e2e` completo en verde ✅

Re-ejecutado por mí en esta vuelta (`50-e2e-reverify.txt`): **27 passed (58,3 s)**, exit 0. Ahora con el fixture de CU1 alineado a la cadena literal del criterio, así que la suite por fin protege lo que dice proteger.

---

## El check de logs: era MÍO (hipótesis del coordinador CONFIRMADA)

`verify.sh` marcaba «1 línea de error/fatal en los logs recientes». Investigado (`42-log-fatal-attribution.txt`, `54-log-fatal-final.txt`):

```
2026-07-20 13:06:22.877 UTC [87430] FATAL:  role "postgres" does not exist
```

- **Ocurrencia única**: 1 sola en 6 h, y **no recurre** tras el deploy.
- **Coincidencia temporal exacta**: el host es `Europe/Madrid` (CEST, +0200), así que 13:06:22 UTC = **15:06:22 CEST**, el minuto exacto en que mi sonda de la vuelta 1 corrió `docker exec … psql -U postgres` y devolvió **ese mismo error literal** (fue el primer intento fallido antes de que corrigiera el usuario a `devtools`).
- **Nada del proyecto usa el rol `postgres`**: `POSTGRES_USER=devtools`, y el healthcheck del compose usa `pg_isready -U "$POSTGRES_USER"`.

**Conclusión: fue mi propia sonda. No es un hallazgo del producto.** Coste de la honestidad: la anoto para que nadie la persiga otra vez.

### Barrido de logs de la vuelta 2 (`57-barrido-logs-vuelta2.txt`)

Como en la vuelta 2 creé y borré una cuenta y lancé análisis contra producción, barrí los logs desde el deploy (13:59Z) para comprobar que **mi actividad no dejó errores nuevos**:

- **web**: **cero** líneas de nivel error/fatal. El recorrido completo (signup, análisis, `/history`, logout) no generó ni una.
- **postgres**: una línea nueva, `14:02:39 UTC ERROR: column "kind" does not exist` — **también mía**: fue mi primer `select … kind …` contra `history_entry` antes de mirar el esquema real (la columna es `input_kind`). Error de mi consulta, no del producto.
- El `FATAL` de `role "postgres"` sigue siendo **1 sola ocurrencia** en 6 h y no recurre.

> ⚠ **Aviso para el cierre**: esas **dos** líneas (13:06 FATAL y 14:02 ERROR) son **mías y benignas**, pero siguen dentro de la ventana de "logs recientes" de `verify.sh`. Si el bucle ejecuta `verify.sh` al cerrar, **puede marcar ese check en rojo hasta que envejezcan**. No es un defecto: no confundir con un hallazgo.

## `pnpm gate` verde, ejecutado por mí (`56-gate-verifier.txt`)

El protocolo del gate CUA exige confirmar el gate **en mi propio contexto**, no heredarlo. Lo corrí entero desde la raíz:

```
lint ✓ · typecheck ✓ (4 proyectos) · format:check ✓ · knip ✓ · readme:status ✓
Test Files  60 passed (60)
      Tests  646 passed (646)
```

Verde completo, coincide con lo reportado por el bucle.

## Hallazgo inesperado: el baseline de `history_entry` estaba desactualizado

Se me dio como baseline «1 usuario real, **0** history». Al medirlo encontré **1 fila** (`46`, `47-history-row-inesperada.txt`):

```
id         | cdb08c12-87e2-4a6d-85ce-f90f2c3f2438
user_id    | 5ea89cb1-…  (= carlosvillu@gmail.com, el usuario REAL)
preview    | … (16 caracteres)
input_kind | base64
created_at | 2026-07-20 13:35:47.930899+00
```

Es del **usuario real**, creada entre mi FAIL (13:06Z) y el deploy (13:58Z). **No la toqué.** Está correctamente redactada (`… (16 caracteres)`), así que no es una fuga. Lo señalo porque un verifier que hubiera asumido «0 history» y "limpiado" hasta llegar a 0 **habría borrado datos del usuario real**.

## Producción: sin daño

- Cuenta de prueba `verifier-t33b-throwaway@example.com` creada y **borrada** (cascade).
- **Recuento final** (`66-cleanup-recuento-final.txt`): **1 usuario** — `5ea89cb1…`, `carlosvillu@gmail.com`, `created_at 2026-07-19 09:52:12` idéntico al baseline — y **1 history_entry**: exactamente la fila preexistente `cdb08c12…` del usuario real, con su `created_at` intacto.
- **0 sesiones huérfanas**; las 4 sesiones vivas pertenecen todas al usuario real.
- Los ensayos de restore corrieron siempre sobre `devtools_restore_test`, **nunca** sobre la BD viva. **No se redesplegó nada.**

## Consola del navegador

**Limpia** en las dos vueltas: `console` y `errors` sin una sola entrada (`16-browser-console.txt`, `44-console-reverify.txt`, ambos vacíos).

## Resultado por punto (vuelta 2)

| # | Cláusula | Observado | OK |
|---|---|---|---|
| 1 | 14.1 literal `Authorization: Bearer <JWT>` en producción | 3 pasos, `jwt → json` | ✅ |
| 1b | payload formateado | JSON pretty 2 espacios | ✅ |
| 1c | expiración en lenguaje natural | `(caduca en 1 mes)` | ✅ |
| 1d | sin que el usuario elija nada | pegado sin botón | ✅ |
| 1e | < 1 s | 0,080–0,130 s (5 medidas) | ✅ |
| 2 | No regresión (`Bearer …`, JWT desnudo) | 3 pasos ambos | ✅ |
| 3 | Alcance acotado (`Cookie:`, `X-Api-Key:`) | siguen en `text` | ✅ |
| 4 | Preview redactado en `/history` + BD | `…….…`; `kind=jwt`; 0 canarios en dump completo | ✅ |
| 5 | Desde fuera del VPS | WebFetch externo, contenido real | ✅ |
| 6 | Certificado válido | GTS WE1→Root R4, verify=0, SAN `*.carlosvillu.dev`, vence 2026-09-21 | ✅ |
| 7 | Backup → dump legible por `pg_restore --list` | RC=0, 27 TOC, 4 TABLE DATA + restore real | ✅ |
| 8 | `pnpm test:e2e` completo verde | 27 passed (58,3 s) | ✅ |
| 8b | `pnpm gate` verde (ejecutado por mí) | lint/typecheck/format/knip/readme ✓ · 646 tests / 60 ficheros | ✅ |
| 9 | Datos de producción intactos | 1 usuario / 1 history preexistente / 0 huérfanas | ✅ |

**Criterios del PRD: 14.1 CERRADO** (en su forma literal) y **14.10 CERRADO** (dominio con cert válido desde fuera + recorrido de 14.1 en producción + dump legible por `pg_restore --list`).

## Coste real

**$0** (estimado $0), sumando las dos vueltas. Sin APIs de pago: tráfico HTTP contra infraestructura propia, dos `WebFetch` y contenedores locales.

## Rarezas y notas

1. **Casi produzco un falso PASS en la vuelta 1**: mi primer `wait --text "jwt"` dio verde porque el mensaje de **error** dice "Se intentó detectar **jwt**, json, base64…". El texto del fallo contenía la palabra del éxito. Solo leer la página entera lo destapó. **Un `wait --text` sobre una palabra que también aparece en el estado de error no es un assert.**
2. En la vuelta 2 el `wait --text "la cadena"` dio timeout **aunque el contenido sí estaba** (lo confirmó `read`). El veredicto se apoya en el contenido leído, no en el wait. Merece mirarse si el texto se parte en varios nodos.
3. `clipboard write` falló con `NotAllowedError` tras navegar a una página nueva; se resuelve enfocando el campo (`click`) antes de escribir al portapapeles. Útil para futuras verificaciones.
4. El baseline de `history_entry` que circula en el bucle (0) **está desactualizado**: hoy es 1, del usuario real. Conviene re-medirlo en vez de heredarlo.
5. La poda de retención sigue sin ejercitar su rama de borrado en producción (23 dumps, ninguno > 14 días) — deuda ya anotada en T3.2.
6. Ningún test del repo usa un JWT **firmado de verdad** (el motor no valida firma, así que no bloquea).
