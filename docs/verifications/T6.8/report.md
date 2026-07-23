# Verificación T6.8 — El paso con secreto: `jwt.sign` en la UI (y la prueba de que no sale)

- **Tarea**: T6.8 · El paso con secreto: `jwt.sign` en la UI (y la prueba de que no sale) (`planning.md`, F6)
- **Fecha**: 2026-07-23
- **Ejecutor**: agente `verifier` · agent-browser 0.32.1 · sesiones `t6.8` / `t6.8b`
- **Sistema**: base `96aedcd` + **el diff de T6.8 SIN COMMITEAR** (working tree: `compose-builder.tsx`, `privacy-notice.ts`, `compose.spec.ts`) · docker compose dev (Postgres 16, `127.0.0.1:5433`) · `pnpm dev` en `localhost:3000` · `{"ok":true,"db":true}`.
- **Entorno**: LOCAL. No se tocó producción. **Ningún código de producto se modificó**: solo se escribió bajo `docs/verifications/T6.8/`.
- **BD**: 12 users / 70 history / 12 sessions al empezar y al terminar (la verificación solo LEYÓ vía `pg_dump`; no hay ruta de escritura compose→BD en T6.8).
- **Gate**: `pnpm gate` **verde, exit 0** — lint, typecheck, prettier, knip, readme:status y **1093 tests / 70 ficheros** (`gate.txt`). Re-corrido por el verifier.
- **E2E**: `pnpm test:e2e` **verde, exit 0** — **49 passed** (2.4 min), incluido el nuevo spec de firma `compose.spec.ts:364` (`16-e2e.txt`).

## Verificación esperada (literal de planning.md)

> en el navegador, componer `{"sub":"1"}` → `jwt.sign` con el secreto canario `test-signing-secret-not-a-secret` → el JWT resultante, pegado en `/analyze`, se abre y muestra el payload (**el producto probándose a sí mismo en las dos direcciones**); **control negativo del canario**: `grep` del secreto sobre (a) los logs de la web, (b) un `pg_dump --data-only` de la BD completa y (c) el registro de peticiones del navegador → **0 coincidencias en las tres**, con **control positivo** (grepear algo que sí debe estar, para probar que el grep apunta bien) — mismo método que cerró T4.1. `pnpm gate` + `pnpm test:e2e` verdes.

## Metodología anti-fantasma (decisiones tomadas ANTES de ejecutar)

1. **La ida-y-vuelta se hizo en el navegador real** (agent-browser), como un humano: `fill` sobre el textarea, `click` en la paleta, `fill` en el campo de secreto. No se usó la API ni la suite para el paso verificado.
2. **La firma se cruzó contra `node:crypto` propio** (`03-jwt-crosscheck.txt`): no basta con que aparezca un JWT — se comprobó que el HMAC-SHA256 del `<header>.<payload>` con el canario produce EXACTAMENTE la firma del token. Así se prueba que la firma es real y usa el secreto, no un literal decorativo (la fase advierte que el `SIGNED` del artboard es decorativo).
3. **El registro de peticiones se capturó con HAR** (`network har start` ANTES de teclear nada, `network har stop` tras la firma): es el registro autoritativo de «durante todo el flujo de firma», no el buffer acumulado de toda la sesión.
4. **Controles positivos independientes por canal**, con valores que YO sé que están (email real de la BD, ruta `GET /compose` en el log, `woff2` en el HAR): un 0-coincidencias sin positivo no prueba nada.
5. **El assert de conteo se probó que MUERDE** (ver §D): la parte que un PASS no puede discharge por lectura.

## Pasos ejecutados

1. `/compose` → `fill {"sub":"1"}` → `añadir paso` → `jwt.sign`. El panel aparece DERIVADO del motor: `Select` **Algoritmo = HS256 (única opción)** + `Input` **Secreto de firma\*** con icono de llave (`01-panel-firma-vacio.png`). Confirmado `type="password"`, `autocomplete="new-password"`.
2. Tecleado el canario `test-signing-secret-not-a-secret` → el secreto se pinta enmascarado (`••••`), aparece la barra **«resultado · listo para compartir»** y el JWT (`02-firmado-resultado.png`). Copy real del panel visible y verificado (§C).
3. JWT extraído del DOM: `eyJhbGci….eyJzdWIiOiIxIiwiaWF0IjoxNzg0NzY1OTkwfQ.307cVsbk…` → **3 segmentos**, payload `{"sub":"1","iat":1784765990}`, la firma **coincide con el HMAC del canario** recomputado por `node:crypto`, y **el token NO contiene el secreto en claro** (`03-jwt-crosscheck.txt`, `jwt-token.txt`).
4. **Ida-y-vuelta**: el JWT pegado en `/analyze` se reabre — la cadena muestra `jwt.decode` → `json.format` y **el payload `{"sub":"1","iat":1784765990}` SE MUESTRA formateado en pantalla** (`04-analyze-reabierto.png`, `06-…` payloadSnippet).
5. Comprobaciones de privacidad en el navegador (`06-inbrowser-privacy-checks.txt`) + los tres greps del canario con controles positivos (§B) + contraste (§E) + assert-muerde (§D).

## Resultado observado vs esperado

### A. Ida-y-vuelta (el producto probándose en las dos direcciones)

| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | `{"sub":"1"}` + `jwt.sign`(canario) produce un JWT | JWT de 3 segmentos; firma = HMAC-SHA256(canario) verificado con `node:crypto` | 02, 03 | OK |
| 2 | El JWT en `/analyze` se abre y **muestra el payload** | `jwt.decode`→`json.format`; payload `{"sub":"1","iat":…}` renderizado | 04, 06 | OK |

### B. Control negativo del canario — 0 coincidencias en las TRES, con control positivo

| Canal | Negativo: canario (esperado 0) | Positivo (esperado >0) | Evidencia | OK |
|---|---|---|---|---|
| (a) **Logs de la web** (`pnpm dev`) | canario -> **0** · token/firma -> **0** | `GET /compose` -> 2 · `/api/health` -> 1 | `13-web-server.log`, `14-grep-weblog.txt` | OK |
| (b) **`pg_dump --data-only` BD completa** | canario -> **0** · token -> **0** | email real de la BD -> 1 · `history_entry` -> 2 | `11-pgdump-dataonly.sql`, `12-grep-pgdump.txt` | OK |
| (c) **Registro de peticiones del navegador** (HAR del flujo de firma) | canario -> **0** · token -> **0** · `/api/` -> **0** | `woff2` (fuente) -> 3, registro no vacío · `postData` -> 0 | `05-network.har`, `15-grep-har.txt` | OK |

El único tráfico durante el flujo de firma fue **1 GET de una fuente** (`__nextjs_font/geist-latin.woff2`), sin cuerpo. **Cero llamadas a la aplicación**, cero `/api/compose` (confirmado además: `apps/web/src/app/compose/` solo tiene `page.tsx`, no hay route handler). El negativo es estructural: en T6.8 no existe ninguna ruta compose→servidor ni compose→BD (la receta la persiste T6.10).

### C. El secreto no se persiste / no se copia / copy VERDADERO

| Cláusula de la Entrega | Observado | Evidencia | OK |
|---|---|---|---|
| No en `sessionStorage`/`localStorage` | `storage.hasSecret = false`; **positivo**: el borrador SÍ está (`devtools:draft:compose = {"source":"{\"sub\":\"1\"}","transforms":["jwt.sign"]}`) — mecanismo vivo, secreto ausente | 06 | OK |
| No en la URL | `url.search=''`, `url.hash=''`, `href` sin canario | 06 | OK |
| No en cookies | `document.cookie` vacío, sin canario | 06 | OK |
| No entra en el estado serializado a la receta | El borrador serializa solo `source`+ids (`serializeComposeDraft`), nunca `options` | 06 + código | OK |
| No en el resultado copiado salvo dentro de la firma | Token no contiene el secreto en claro; solo sobrevive como HMAC | 03 | OK |
| El secreto se **resetea al cambiar la transformación** del paso (`changeTransform → options: {}`) | En vivo: canario tecleado → cambio del paso a `base64.encode` → vuelta a `jwt.sign` → campo **vacío** (`value=''`) y canario ausente del HTML | 18 | OK |
| Copy corregido = VERDAD | `SIGN_SECRET_NOTICE` («no sale de tu navegador… no se guarda… ni en esta pestaña, ni en la URL, ni en el historial»): cada afirmación verificada arriba; motor cliente, sin `/api/compose`, cero red | 02, 08, 10 | OK |

### D. El assert de ausencia MUERDE (lo que un PASS no puede discharge por lectura)

El assert endurecido: `expect(html.split(CANARY_SECRET).length - 1).toBe(1)` sobre `page.content()`, anclado a que la única aparición sea el `value` del campo `type="password"`.

- **Satisfacible** (no imposible): la corrida real de `pnpm test:e2e` está **verde** con el spec de firma incluido → `page.content()` serializa el `value` del password **exactamente una vez** (`16-e2e.txt`, test #18).
- **Discrimina** (no siempre-verde): sobre la página real y correcta, el conteo que evalúa el assert es **1** (`toBe(1)` PASA). Inyectando una **segunda aparición** del secreto por otro canal (un `data-leak` en el DOM, idéntico en efecto al `data-leak` que declaró el implementer), `page.content()` lo cuenta **2** → `toBe(1)` FALLA (`Received: 2`). Medido en vivo: `countRealPage_before=1`, `countWithSecondLeak_after=2`, `assertWouldFailOnLeak=true` (`17-assert-bites.txt`).
- Nota de método: se intentó recompilar el leak en un git worktree (copia), pero Turbopack rechaza `node_modules` symlinkeado fuera del fs-root; la demostración se hizo entonces sobre el `page.content()` real, que es EXACTAMENTE el string sobre el que opera el assert — reproducción fiel de su discriminación, y coincide con la evidencia `data-leak → 2` del implementer.

Conclusión: el assert **no** es un `not.toContain` imposible de casar (que sería un falso PASS de seguridad), sino un conteo `== 1` que sube a `>=2` ante cualquier segundo canal de fuga.

### E. Contraste de texto (obligatorio) — panel nuevo, dark Y light

| Elemento | Light | Dark | Umbral | OK |
|---|---|---|---|---|
| Aviso `SIGN_SECRET_NOTICE` (12px, 400) | **6.88** | **5.71** | 4.5 | OK |
| Label «Algoritmo» (13px, 500) | 16.31 | 13.61 | 4.5 | OK |
| Label «Secreto de firma\*» (13px, 500) | 16.31 | 13.61 | 4.5 | OK |
| Valor del `Select` HS256 (13px, 400) | 17.94 | 16.31 | 4.5 | OK |

Medido con `getComputedStyle` (color `lab()` resuelto a sRGB vía canvas) y ratio WCAG (`07-contrast-light.txt`, `07-contrast-dark.txt`). Todo por encima de 4.5:1 en ambos temas.

### F. Consola / responsive

- **Consola del navegador limpia** durante todo el flujo: solo ruido de framework en dev (React DevTools info, HMR, Fast Refresh). Sin `errors`, sin `console.error` propio (`09-browser-console.txt`).
- **Móvil (390×844) y escritorio, dark y light**: el panel se apila correcto, el icono de llave y el aviso legibles (`08-panel-firma-dark.png`, `10-panel-firma-mobile.png`).

## Cobertura del spec permanente vs la Entrega

El spec protege: HS256 en el `Select`; token sin el secreto en claro; conteo del canario `==1` anclado al password; ausencia en `sessionStorage`/`localStorage` (con positivo); ausencia en URL (`search`/`hash`); **cero red** vía `page.on('request')`; y la ida-y-vuelta (`jwt.decode`+`json.format` en `/analyze`). Coincide con la lista de «Playwright permanente» del planning (HTML/almacenamiento/URL/red).

**Huecos del spec permanente respecto a la prosa de la Entrega — cerrados en vivo, no bloqueantes:**
- **Cookies**: la Entrega prosa nombra «…URL/cookies», pero la lista de «Playwright permanente» del planning NO nombra cookies y el spec no las asserta. No hay ruta de cliente que fije cookies; verificado en vivo (`document.cookie` vacío, §C). No bloquea.
- **«muestra el payload»**: el spec asserta los chips `jwt.decode`/`json.format`, no el texto del payload. Verificado en vivo que `{"sub":"1","iat":…}` se renderiza (§A).
- **Icono de llave**: el spec asserta `type="password"`, no el icono. Verificado en vivo + capturas (§F).

## Coste real

**$0** — sin APIs de pago (vs estimado $0). El motor de firma corre en el cliente; ninguna llamada externa.

## Veredicto

**PASS** — la firma con el canario produce un JWT real (firma cruzada con `node:crypto`) que `/analyze` reabre y cuyo payload `{"sub":"1"}` se muestra; el canario da **0 coincidencias** en logs de la web, `pg_dump` completo y registro de red del navegador, cada uno con su control positivo; el secreto no toca almacenamiento, URL, cookies ni la receta; el copy corregido es verdad contra el código; y el assert de ausencia **muerde** (satisfacible en verde, `Received: 2` ante un segundo canal). `pnpm gate` (1093 tests) y `pnpm test:e2e` (49) verdes.

**Rarezas (no bloqueantes):**
- `instrumentation.ts` emite warnings de Edge Runtime (`node:fs`/`node:path`/`process.cwd`) al arrancar `pnpm dev`. **Pre-existentes, fuera del diff de T6.8**, migraciones aplicadas OK, health `{ok:true,db:true}`. No afecta a esta tarea.
- Huecos del spec permanente vs prosa de la Entrega (cookies, texto del payload, icono) — todos cerrados en vivo por este CUA; ninguno es defecto del producto.
- **Flake latente (no defecto de seguridad)**: `assertNoComposeNetwork` filtra `_rsc=` y `/_next/`, pero NO `/__nextjs_font/` (no contiene la subcadena `/_next/`). Si una fuente `/__nextjs_font/*.woff2` se cargara DESPUÉS de adjuntar el listener, caería en `appRequests` y rompería `toEqual([])` — un FALSO FAIL sobre un asset benigno (el bucle por-petición seguiría probando sin-cuerpo/sin-`/api/`/sin-secreto), nunca un enmascaramiento de fuga. No ocurrió en la corrida e2e (las fuentes completan antes de `networkidle`); en el CUA sí apareció 1 fuente en el HAR. Vale la pena endurecer el filtro a `/__nextjs_font/` en el futuro; no bloquea.
