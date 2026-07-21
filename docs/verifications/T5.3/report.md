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
