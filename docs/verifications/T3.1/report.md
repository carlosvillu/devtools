# Verificación T3.1 — Producción del producto COMPLETO sobre la infra de T1.8

## Veredicto

**PASS** — `https://devtools.carlosvillu.dev` sirve el producto completo con certificado válido sobre un build de producción real (`docker compose` + `node apps/web/server.js`); login funciona; el JWT de §6.5 devuelve la cadena esperada; y **ambos controles negativos se ejercitaron de verdad**, incluido el (b), que el implementer había declarado no comprobable.

- **Tarea**: T3.1 · Producción del producto COMPLETO sobre la infra de T1.8 (`planning.md`)
- **Fecha**: 2026-07-20
- **Ejecutor**: agente `verifier` · agent-browser (npx) · sesión `t3.1`
- **Sistema**: commit `684bc53a2a284ba6681f4b0a89e7acd7872bfaa9`, árbol limpio (solo `docs/verifications/T3.1/` sin trackear) · `docker-compose.prod.yml` proyecto `devtools` · `devtools-web-1` Up (healthy), `devtools-postgres-1` Up (healthy)
- **Gate**: `pnpm gate` **exit 0** — 59 ficheros, 610 tests (`00-gate.txt`)

## Verificación esperada (literal de planning.md)

> desde **fuera** del VPS, `https://devtools.carlosvillu.dev` sirve la app con certificado válido; login funciona; pegar el JWT del ejemplo de §6.5 devuelve la cadena. **Gotcha conocido y de verificación obligatoria**: `next start` no resuelve rutas como `next dev` — la verificación ejercita `docker compose up` REAL, no el modo dev. Controles negativos: (a) `ss -ltn` en el VPS muestra el 3110 escuchando **solo en loopback** y desde fuera `http://80.190.75.149:3110` no responde; (b) el rate limit distingue dos clientes con `CF-Connecting-IP` distinta, en vez de contar a todo Cloudflare como uno solo.

## Limitación de vantage (declarada por honestidad)

**El bucle corre DENTRO del VPS** (`hostname vmi3440324`, IPv4 pública `80.190.75.149` = `VPS_IP`). "Desde fuera del VPS" no es literalmente ejecutable desde este shell. Mitigación, por assert:

| Assert | Vantage usado | ¿Suficiente? |
|---|---|---|
| HTTPS sirve la app + cert válido | **WebFetch (infra de Anthropic, genuinamente externa)** → `{"ok":true,"db":true}`; y `r.jina.ai` (tercero externo) → 200. Además curl desde el VPS **atraviesa el borde de Cloudflare** (remote_ip = 104.21.x / 2606:4700:x), no es loopback | Sí — dos vantages externos independientes |
| `http://80.190.75.149:3110` no responde desde fuera | **`ss -ltn`** (dispositivo, ver abajo) + **`r.jina.ai` (externo)** con dos controles | Sí |
| `ss -ltn` loopback-only | VPS (es donde tiene sentido) | Sí |

**La evidencia dispositiva de (a) es el bind, no la sonda externa.** Un socket ligado a `127.0.0.1:3110` es inalcanzable por el kernel desde cualquier interfaz que no sea loopback — no hace falta cortafuegos para garantizarlo. `ss -ltn` por sí solo ya prueba "desde fuera no responde"; la sonda externa lo corrobora.

Aun así, la sonda se desambiguó con **dos** controles (`04-external-port3110.txt`):
- *Control positivo 1*: el mismo fetcher devuelve **200** contra `https://devtools.carlosvillu.dev` ⇒ el fetcher funciona.
- *Control positivo 2*: el mismo fetcher contra `https://80.190.75.149` (origen, **puerto 443**) devuelve `ERR_SSL_PROTOCOL_ERROR`, **no** un timeout ⇒ llegó a establecer TCP con la IP de origen y falló solo en el handshake TLS (SNI/cert). Es decir, ese vantage **sí alcanza `80.190.75.149`**.

Por tanto el **timeout** contra `:3110` es "puerto cerrado/filtrado", no "IP de origen inalcanzable desde ese vantage" — que era la única lectura alternativa.

Nota: el primer intento de sonda externa (`api.allorigins.win`) fue **descartado por inconcluyente** — su control positivo también falló (500), así que no probaba nada. Queda en `04-external-port3110.txt` como registro.

## Pasos ejecutados

1. `pnpm gate` → exit 0, 610 tests verdes (`00-gate.txt`).
2. Estado del sistema desplegado (`01-system-state.txt`): sha `684bc53`, `devtools-web-1` corriendo **`node apps/web/server.js`** (Next standalone de producción, `NODE_ENV=production`) — **no `next dev`**, gotcha cubierto. `TRUST_PROXY=1` confirmado *dentro del contenedor en marcha*, no solo en el compose.
3. Site file (`02-caddy-sitefile.txt`): el instalado en `~/infra/caddy/sites/` es **byte a byte idéntico** al del repo (`diff` → IDENTICAL). Sigue el patrón del vecino `ugc.carlosvillu.dev.caddy` (`reverse_proxy 127.0.0.1:<port>` + `header_up X-Forwarded-For {client_ip}`) y añade el matcher `@not_cloudflare` + `request_header -CF-Connecting-IP`.
4. `~/AGENTS.md` §3 (`03-agents-md.txt`, **fichero fuera del repo, no sale en el diff**): devtools registrado con dominio, bloque 3110–3119, puerto 3110, runtime y ruta; además una nota nueva que documenta que el site file lo manda el repo.
5. Sonda externa del 3110 con control positivo (`04-external-port3110.txt`) + `ss -ltn` (`01-…`): `LISTEN 127.0.0.1:3110` y nada en `0.0.0.0`.
6. Certificado (`05-tls-cert.txt`): `CN=carlosvillu.dev`, SAN `*.carlosvillu.dev`, emisor Google Trust Services WE1, válido 2026-06-23 → 2026-09-21 (hoy dentro de ventana), `ssl_verify_result=0`.
7. Baseline de BD (`06-db-baseline.txt`): 1 usuario (`carlosvillu@gmail.com`).
8. Navegador contra producción: home hidratada, **JWT de §6.5 pegado** → cadena de 3 pasos (`11-cadena-jwt.txt`, `11-cadena-jwt.png`).
9. Signup de cuenta desechable → logout → **login** → `/history` autenticado (`13-login-ok.png`, `14-history.txt`). Consola y errores del navegador **vacíos** (`15-browser-console.txt`).
10. **Control (b)** ejercitado literal (`20-control-b-ipv4-vs-ipv6.txt`).
11. **(b2)** borrado del header forjado en el borde (`21-control-b2-forgery.txt`).
12. Los tres rate limits (`22-tres-rate-limits.txt`).
13. Limpieza y recuento (`23-cleanup.txt`).

## El control (b): ejercitado, no sustituido

El implementer afirmó (etiquetado NO VERIFICADO) que la cláusula (b) «no se puede comprobar inyectando dos `CF-Connecting-IP` distintas» y propuso partirla en (b1)+(b2). **Ese razonamiento es incorrecto y la cláusula sí es ejecutable tal cual está escrita.**

Esta máquina tiene **doble pila** y el dominio resuelve A y AAAA por Cloudflare. Una petición por IPv4 y otra por IPv6 salen a internet, llegan al **borde de Cloudflare** y el borde fija `CF-Connecting-IP` con **dos valores genuinamente distintos** (`80.190.75.149` y `2605:a144:2344:324::1`). Son dos clientes distintos a ojos de la app — que ambos sean la misma máquina es irrelevante y la app no puede ni debe saberlo.

Límite de login: 5 fallos / 15 min.

| Fase | Petición | Código | Cuerpo | Lectura |
|---|---|---|---|---|
| 1 | IPv4 intentos 1–5 | 401 | `unauthorized` | consumen cupo |
| 1 | IPv4 intento 6 | **429** | `rate_limited` + `request_id` | el muro salta |
| 2 | **IPv6 intento 1** | **401** | `unauthorized` | **bucket distinto** ← la cláusula |
| 3 | IPv4 intento 7 | **429** | `rate_limited` | el bloqueo es real, no timing |

**El 429 es de la app, no de Cloudflare**: cuerpo JSON propio (`{"code":"rate_limited",…,"request_id":…}`), no una challenge page del borde. Fase 3 descarta que la fase 2 pasara por expiración de ventana.

**¿Puede ponerse roja?** Sí: si todo Cloudflare cayera en un bucket único (el defecto que la cláusula teme), la fase 2 habría devuelto 429.

**Matiz honesto sobre qué prueba exactamente el split v4/v6.** IPv4 e IPv6 no solo llegan con `CF-Connecting-IP` distinta: también atraviesan **bordes de Cloudflare distintos** (`104.21.83.241` vs `2606:4700:3036::6815:53f1`). Así que el split v4/v6 *aislado* también sería compatible con el modo de fallo defectuoso (llevar la clave por el XFF que Caddy fija con `{client_ip}`, es decir la IP del borde). La cláusula queda satisfecha igualmente —pide distinguir dos clientes con `CF-Connecting-IP` distinta, y los distingue—, pero la prueba de que la clave es **`CF-Connecting-IP` y no la IP del borde** descansa en el **conjunto** de tres evidencias, no en el v4/v6 solo:

1. **Fase 1**: 6 peticiones con la **misma** `CF-Connecting-IP` (y el mismo borde) se acumulan en **un** bucket hasta el 429 ⇒ se ejercita la rama `if (cf)` de `clientIp()`.
2. **(b2)**: con el header **borrado por el borde** (conexión directa al origen, `remote_ip` fuera de rangos CF), seis IPs forjadas distintas colapsan en **un** bucket ⇒ se ejercita la rama de fallback y se demuestra que el header forjado no controla la clave.
3. **Lectura del código** (`client-ip.ts`): precedencia `CF-Connecting-IP` → última entrada de `X-Forwarded-For` → `LOOPBACK_KEY`.

Los tres juntos fijan el comportamiento sin ambigüedad.

### (b2) — verificado además, de forma independiente

Golpeando el **origen directamente** (`--resolve devtools…:443:127.0.0.1`, saltándose Cloudflare) con un `CF-Connecting-IP` **forjado y rotado** en cada petición: 5×401 y **429 a la sexta**. Es decir, las seis IPs falsas colapsaron en **un solo bucket** ⇒ el borde borró el header. Si el borrado fallara, cada IP forjada sería su propia clave y el muro no saltaría nunca.

Lo ejercité sobre el limiter de **login**, distinto del `/api/analyze` que usa la sonda de `verify.sh`: es una confirmación independiente, no una re-ejecución del script del implementer. Revisé además esa sonda (`verify.sh` líneas 97–147): sus asserts son correctos y **puede ponerse roja**; el interruptor es declarativo en `deploy.env` y no se deriva del artefacto verificado, así que borrar el control no apaga su detector. Diseño sólido.

## Los tres rate limits

Los tres se llevan por el **mismo y único** `clientIp()`, así que la decisión nueva los cubre a la vez (`22-tres-rate-limits.txt`):

| Muro | Fichero | Clave | Estado |
|---|---|---|---|
| login (T0.4) | `api/auth/login/route.ts:20` | `clientIp(req)` | ejercitado en vivo (arriba) |
| signup (T0.4) | `api/auth/signup/route.ts:21` | `clientIp(req)` | mismo `clientIp()` |
| `/api/analyze` (T1.4) | `api/analyze/route.ts:32` | `clientIp(req)` | mismo `clientIp()` |

Los dos defectos concretos que heredaba la tarea quedan cerrados: la clave ya **no** es rotable (el borde borra el header forjado; XFF lo sobrescribe Caddy), y el fallback ya **no** es un `'unknown'` global — es `LOOPBACK_KEY`, alcanzable solo desde el propio host, con `assertTrustProxyConfigured()` fallando **cerrado** en el arranque si faltara `TRUST_PROXY=1`.

## Resultado observado vs esperado

| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | HTTPS sirve la app desde fuera, cert válido | 200 desde WebFetch y r.jina.ai (externos); cert `*.carlosvillu.dev` GTS, en ventana, verify=0 | 04, 05 | ✅ |
| 2 | Login funciona | signup → logout → login → `/history` autenticado | 13-login-ok.png, 14 | ✅ |
| 3 | JWT §6.5 devuelve la cadena | 3 pasos: `jwt.decode` → `json.format` → terminal "Sin más transformaciones aplicables"; nota `exp: 2025-07-16T00:00:00Z` | 11 | ✅ |
| 4 | `docker compose up` REAL, no `next dev` | `node apps/web/server.js`, `NODE_ENV=production`; rutas `/`, `/login`, `/signup`, `/history`, `/api/*` resuelven | 01 | ✅ |
| 5 | (a) 3110 solo en loopback | `LISTEN 127.0.0.1:3110`; puerto docker `127.0.0.1:3110->3000` | 01 | ✅ |
| 6 | (a) `http://80.190.75.149:3110` no responde desde fuera | timeout desde fetcher externo, con control positivo 200 en el dominio | 04 | ✅ |
| 7 | (b) el rate limit distingue dos `CF-Connecting-IP` | IPv4 bloqueado (429) mientras IPv6 sigue en 401 | 20 | ✅ |
| 8 | web solo en `127.0.0.1:3110` | compose publica `127.0.0.1:3110->3000/tcp` | 01 | ✅ |
| 9 | site file con el patrón del vecino | idéntico al repo; mismo patrón que `ugc.…caddy` + control CF | 02 | ✅ |
| 10 | devtools en `~/AGENTS.md` §3 | registrado (bloque 3110–3119, puerto 3110) + nota del site file | 03 | ✅ |
| 11 | `TRUST_PROXY=1` | confirmado en el contenedor en marcha | 01 | ✅ |
| 12 | `DEPLOY.md` | existe, 7430 B, topología §10 documentada | 22 | ✅ |
| 13 | los tres rate limits revisados | los tres por el mismo `clientIp()` | 22 | ✅ |

## Datos de producción

Baseline 1 usuario (`carlosvillu@gmail.com`, id `5ea89cb1…`). Se creó **una** cuenta desechable (`verifier-t31-throwaway@example.com`) y se borró al terminar: recuento final **1 usuario**, mismo id y `created_at` que el baseline; `history_entry` = 0 antes y después. **El usuario real no se tocó.** (`06`, `23`)

## Coste real

**$0** — ninguna API de pago. Solo tráfico HTTP contra infraestructura propia y dos fetchers públicos gratuitos. Estimado del planning: $0. Sin desviación.

## Hallazgos y rarezas (aunque el veredicto sea PASS)

1. **Sub-verificación del implementer (proceso, no producto).** Su afirmación de que la cláusula (b) no era comprobable es **falsa**: la doble pila IPv4/IPv6 la ejercita literalmente y tardó 8 peticiones. La cláusula estaba escrita de forma ejecutable y se propuso sustituirla por dos proxies sin agotar la vía directa. El código pasa; lo que falló fue el esfuerzo de verificación. Vale la pena anotarlo en el journal: "no se puede verificar" merece una segunda mirada antes de aceptarse.
2. **El bucle corre dentro del VPS**, así que "desde fuera" siempre necesitará un vantage prestado. Documentado arriba por assert. Conviene que futuras tareas con cláusulas "desde fuera" lo prevean en vez de improvisarlo.
3. **Deuda consciente ya documentada** (no bloquea): la lista de rangos de Cloudflare del site file es una instantánea del 2026-07-20 y se degrada **abierta** si Cloudflare retira un rango. El propio fichero lo explica y propone Authenticated Origin Pulls como alternativa. La sonda de `verify.sh` detecta que el control desaparezca entero, no un rango caducado suelto. Merece una revisión anual con recordatorio real.
4. Consola del navegador **limpia** en todo el recorrido (sin warnings ni errores).
5. El control (b) deja el bucket de login de la IPv4 del VPS bloqueado ~15 min. Es en memoria del proceso y solo afecta a esa clave; el usuario real no comparte esa IP.
