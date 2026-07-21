# Verificación T5.3 — E2E de fase F5 (la landing)

- **Tarea**: T5.3 · E2E de fase F5 (`planning.md`, sección «F5 — La landing»)
- **Fecha**: 2026-07-21
- **Ejecutor**: agente `verifier` · agent-browser (npx -y) · sesión `t5.3`
- **Sistema**: commit `aab6eab38b1b17d152e2535af687c60dee61a227` (== `main`, árbol limpio en `apps/web/**` y `packages/**`) · **build de producción** (`next build && next start`) con `TRUST_PROXY=1` en el puerto **3210** · docker compose dev (Postgres 16) + `pnpm db:migrate`. Health: `{"ok":true,"db":true}`.
- **Nota de método**: `next dev` no hidrata bien en esta máquina (journal) → se verifica contra el build de prod, como exige el brief.

## Verificación esperada (literal de planning.md)
> Un usuario llega a `/` (landing), pega un JWT y aterriza en `/analyze` con la cadena `jwt → json`, **sin que el input aparezca nunca en la URL** en ningún punto del recorrido (control negativo dispositivo de §11, verificado sobre la barra real). El botón «Pega un ejemplo» produce el mismo aterrizaje. Sin regresión: `pnpm test:e2e` completo en verde, y el recorrido de 14.1 sigue funcionando en `/analyze`. Parada de fin de fase.

## Gate previo
- `pnpm gate` verde: **674 tests / 60 ficheros**, lint + typecheck + format + knip + readme:status:check OK.
- `pnpm build` (prod) OK: `/` estático (landing), `/analyze` dinámico.

## Canario usado
- JWT canario (input tecleado): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkNBTkFSWXQ1M2Zsb3ciLCJpYXQiOjE1MTYyMzkwMjJ9.SIGNATUREt53xxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (payload decodifica a `name:"CANARYt53flow"`, marcador para grepear la URL).
- Prefijo base64 del payload buscado en la URL: `eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkNBTkFSWXQ1M2Zsb3ciLCJpYXQiOjE1MTYyMzkwMjJ9`.

## Sobre el gesto «pegar»
El **paste real por portapapeles del SO falla en headless** en esta máquina: `clipboard write` -> `NotAllowedError: Write permission denied`. Por tanto se usó **teclado + Enter**, que en la landing (T5.2) recorre **exactamente el mismo código** que el paste («Enter -> igual que pegar»: escribe `sessionStorage['devtools:pending-input']` y `router.push('/analyze')`). Antes de disparar se verificó que el campo contenía el JWT **íntegro** (len 159, match exacto). Además, el spec E2E `landing.spec.ts:75` («pegar un JWT hace el relevo a /analyze con la cadena y la URL LIMPIA») ejercita el **evento paste** de verdad y pasa -> cubre el gesto paste literal.

## Pasos ejecutados y observados
1. `/` (landing) -> wordmark «devtools», tagline «Pega algo. Lo desenreda.», campo píldora, hint «⌘V pega y analiza · Enter para analizar», 7 badges (jwt·base64·json·timestamp·url·uuid·hash), footer con GitHub + aviso de privacidad COMPLETO (2 frases). **NO se ve ninguna cadena.** URL: `href=http://localhost:3210/`, `search=""`, `hash=""`. -> 01-landing.png
2. Campo relleno con el JWT canario (verificado íntegro) -> **Enter** -> aterriza en `/analyze` con **LA CADENA: jwt > json** (nodo 0 `jwt`/jwt.decode, nodo 1 `json`/json.format; payload muestra `CANARYt53flow`). Consola del navegador **vacía**. -> 02-analyze-chain.png
3. **Control dispositivo §11** tras el relevo: `href` == `http://localhost:3210/analyze` **exacto**, `contains_jwt=false`, `contains_payload=false`, `search=""`, `hash=""`.
4. Reset a `/` -> click **«Pega un ejemplo»** -> aterriza en `/analyze` con cadena `jwt -> json` (JWT de juguete evidente: `sub:"test-user-not-a-secret"`, `name:"devtools demo"`). URL exacta `/analyze`, `search=""`, `hash=""`. -> 03-ejemplo-chain.png
5. **Regresión 14.1** en `/analyze` (entrada directa, campo vacío confirmado): campo con `Authorization: Bearer <JWT>` -> cadena `jwt -> json`, payload decodificado (el prefijo `Authorization: Bearer ` se despega, criterio de T3.3). URL exacta `/analyze`, sin input. -> 04-analyze-bearer-regression.png
6. `pnpm test:e2e` completo (servidor fresco, stack propio en :3118): **33 passed (1.9m)**. Incluye los specs de F5 `landing.spec.ts` (relevo por paste, por Enter, teclear-sin-Enter no navega, «Pega un ejemplo», URL limpia) y el recorrido F1 CU1 (14.1).

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | `/` es landing (wordmark, campo, badges, footer), sin cadena, URL limpia | Todo presente, sin cadena, `search`/`hash` vacíos | 01-landing.png | OK |
| 2 | Pegar JWT -> `/analyze` con cadena `jwt -> json` | Cadena `jwt > json` con payload canario | 02-analyze-chain.png | OK |
| 3 | **§11 dispositivo**: input NUNCA en la URL en ningún punto | `href` exacto `/analyze`, sin JWT ni prefijo del payload; `/` limpia antes | evals inline + 01/02 | OK |
| 4 | «Pega un ejemplo» -> mismo aterrizaje | `/analyze` con cadena, URL limpia | 03-ejemplo-chain.png | OK |
| 5 | Regresión 14.1: `Authorization: Bearer <JWT>` en `/analyze` -> cadena | Cadena `jwt -> json`, prefijo despegado | 04-analyze-bearer-regression.png | OK |
| 6 | `pnpm test:e2e` completo en verde | 33 passed | salida en el report | OK |
| 7 | Sin errores de consola en el flujo | Consola vacía en `/analyze` | console-analyze.txt (vacío) | OK |

## Coste real
**$0** — sin APIs de pago (todo el análisis es local). Estimado: $0.

## Veredicto
**PASS** — el recorrido completo de F5 funciona en el build de producción: la landing releva el input a `/analyze` produciendo `jwt -> json`, «Pega un ejemplo» aterriza igual, y el criterio dispositivo de §11 se cumple con rigor — el input **nunca** aparece en la barra real (`href` exacto `/analyze`, sin JWT ni prefijo de payload) en ninguno de los tres flujos. Regresión 14.1 intacta y `pnpm test:e2e` 33/33 en verde. Parada de fin de fase.

**Notas/rarezas (aun siendo PASS):**
- Paste por portapapeles del SO no disponible en headless (permiso denegado); se usó teclado+Enter (mismo code path) y el paste literal queda cubierto por `landing.spec.ts:75`. No es defecto de producto.
- El comando `type` de agent-browser dejó caer caracteres iniciales al teclear la cadena larga de una vez (artefacto del harness, no del producto): el primer intento clasificó el input truncado como `text`. Se resolvió usando `fill` y **verificando el valor del campo (len 159, match exacto) antes de disparar**. Sin impacto en el veredicto.

---

## Verificación en producción (dominio real) — 2026-07-21

Segunda mitad, pedida por el coordinador tras el deploy de F5 a producción (commit `689dee8`, ya vivo). Cubre lo que la verificación local no podía: el recorrido **desde fuera**, contra `https://devtools.carlosvillu.dev` a través del CDN/Cloudflare + Caddy + el build de prod desplegado. **Recorrido anónimo** — no se tocó el 1 usuario real ni datos. Backup pre-deploy `devtools-20260721T084229Z.dump` (verificado restaurable por el bucle, no re-medido aquí).

- **Ejecutor**: agente `verifier` · agent-browser · sesión `t5.3prod`.
- **TLS**: `curl` a `https://devtools.carlosvillu.dev/` → `http_code=200`, `ssl_verify=0` (cadena válida). Cert `CN=carlosvillu.dev`, emisor Google Trust Services (WE1), vigencia `Jun 23 2026 → Sep 21 2026` (válido hoy 2026-07-21). Navegador: `location.protocol="https:"`.

### Pasos y observaciones (dominio)
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| P1 | `/` sirve 200 la landing, ya NO redirige | Landing completa (wordmark, tagline, campo, 7 badges, «Pega un ejemplo», «historial», footer GitHub + aviso completo), sin cadena; `search`/`hash` vacíos, `https:` | prod-01-landing.png | OK |
| P2 | Teclear JWT + Enter → `/analyze` con `jwt → json` | Campo íntegro (len 159, match) → Enter → `LA CADENA: jwt › json`, payload `CANARYt53flow` decodificado | prod-02-analyze-chain.png | OK |
| P3 | **§11 dispositivo en producción**: input nunca en la barra real | `href` == `https://devtools.carlosvillu.dev/analyze` **exacto**, `search=""`, `hash=""`, `contains_jwt=false`, `contains_payload=false` | eval inline + prod-02 | OK |
| P4 | «Pega un ejemplo» → `/analyze` con cadena | `/analyze` con `jwt → json` (toy JWT `test-user-not-a-secret`/`devtools demo`), URL exacta, sin query/fragment | prod-03-ejemplo-chain.png | OK |
| P5 | 14.1 sin regresión | `POST /api/analyze` con `Authorization: Bearer <JWT>` → **3 pasos** | curl (report) | OK |
| P6 | TLS válido + sin errores de consola | Cert válido; consola del navegador **vacía** en todo el recorrido | prod-console-analyze.txt (vacío) | OK |

### Veredicto (mitad producción)
**PASS** — el recorrido completo de F5 funciona idéntico contra el dominio real sobre HTTPS válido: la landing releva el input a `/analyze` produciendo `jwt → json`, «Pega un ejemplo» aterriza igual, y el **criterio dispositivo §11 se cumple sobre la barra real de producción** (el input nunca aparece en la URL — `href` exacto `/analyze`, sin JWT ni prefijo del payload, en ambos flujos). Sin errores de consola. 14.1 intacto en el endpoint real. Nada del CDN degradó el recorrido.

**Veredicto global T5.3 (local + producción): PASS.**
