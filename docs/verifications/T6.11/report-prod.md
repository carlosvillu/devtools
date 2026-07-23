# Verificación T6.11 (cláusula prod-only) — E2E de fase F6 en producción

- **Tarea**: T6.11 · E2E de fase F6 — cláusula **prod-only** (`planning.md`)
- **Fecha**: 2026-07-23
- **Ejecutor**: agente `verifier` · agent-browser 0.32.1 · sesión `t611-prod` · navegador real (HeadlessChrome 151, `--no-sandbox`)
- **Sistema**: **producción viva** `https://devtools.carlosvillu.dev/compose` — imagen standalone de prod (NO `next dev`, NO localhost). Deploy en curso corre `d3115ae` (HEAD, T6.11 part 1) según contexto del bucle; TLS Let's Encrypt válido hasta `Sep 21 2026`.
- **Modo**: **anónimo** (sin sesión). Link «Entrar» visible en el header → confirma ventana anónima; nunca se inició sesión.

## Cláusula esperada (literal de planning.md, T6.11)
> **En producción tras el deploy**: `https://devtools.carlosvillu.dev/compose` sirve la pantalla con TLS válido y el recorrido de **14.14** funciona **contra la imagen de prod**, no contra `next dev`.

Criterio 14.14 (PRD):
> Escrito un valor en `/compose` y encadenados `json.minify` + `jwt.sign`, el navegador muestra los dos pasos con su tipo detectado y el resultado copiable, **sin una sola petición de red** durante la composición (D10, §5.3).

## Pasos ejecutados (navegador real contra el dominio vivo)
1. `open https://devtools.carlosvillu.dev/compose` → carga la pantalla de componer: heading «Compón algo. Lo empaqueta.», tab «codificar» [selected], textbox «entrada», botón «añadir paso». `isSecureContext=true`, `protocol=https:`, host `devtools.carlosvillu.dev`. Curl externo: HTTP 200, `ssl_verify_result=0`. → prod-01-compose-inicial.png, prod-09-secure-context.txt
2. **Listener de red adjuntado ANTES de componer**: `network har start` justo tras la carga y antes de teclear nada. La ventana HAR = la ventana de composición completa.
3. Tecleado JSON multilínea `{"sub":"1","name":"carlos"}` en «entrada» → visible en el textbox.
4. «añadir paso» → paleta → **json.minify**. Paso 1 muestra badge «produce json». → prod-02-json-minify.png
5. «añadir paso» → paleta → **jwt.sign**; algoritmo HS256; secreto de firma = canario `t611-prod-verifier-not-a-secret` (literal de test, NO secreto real). Paso 2 muestra badge «produce jwt». → prod-03-dos-pasos-resultado.png
6. Resultado final = JWT `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsImlhdCI6MTc4NDc5NDU1OH0.…`; payload decodifica a `{"sub":"1","name":"carlos","iat":…}` → confirma minify + firma encadenados.
7. **Copiar el resultado**: hook sobre `navigator.clipboard.writeText` antes del click → capturó exactamente el JWT completo. Botón funcional.
8. `network har stop` + `network requests --json` (24 reqs de carga) + `console` + `errors`.

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | `/compose` sirve la pantalla con TLS válido | Heading + conmutador «codificar» + «añadir paso»; `isSecureContext=true`, cert válido a sep-2026, HTTP 200 `ssl_verify=0` | prod-01, prod-09 | OK |
| 2 | Dos pasos con su tipo detectado | Paso 1 «produce json» (json.minify), Paso 2 «produce jwt» (jwt.sign) | prod-02, prod-03 | OK |
| 3 | Resultado copiable | Botón «Copiar el resultado» escribe el JWT exacto al portapapeles (spy sobre writeText) | prod-03 | OK |
| 4 | **Sin una sola petición de red durante la composición** | **HAR (abierto antes de componer) = 0 entradas.** Ninguna petición de app durante teclear+encadenar+firmar+copiar | prod-05-composicion.har | OK |
| 5 | Control por-petición (sin eximir framework) | Las 24 reqs de carga: **todas GET**, **0 con body**, **0 a `/api/`**, **0 con el texto/secreto** en URL/headers (dominio descontado) | prod-06-requests.json/.txt | OK |
| 6 | Bundle de prod sano (sin errores JS del producto) | `console` vacío, `errors` vacío | prod-07, prod-08 | OK |

### Detalle del control de red
- **Ventana de composición (HAR, autoritativa)**: 0 peticiones. El motor corre 100 % en el navegador sobre el bundle de PROD.
- **Peticiones acumuladas de carga de página (24, previas a componer)**: documento `/compose`, fuentes woff2, chunks JS/CSS de `/_next/`, `icon.svg`, y prefetch RSC de Next (`/login`, `/history`, `/analyze`, `/` con `_rsc=`, más `/login?next=%2Fhistory` como destino del redirect del prefetch de «historial» estando anónimo). Descontado el prefetch de framework del CONTEO, **quedan 0 peticiones de app**. Aun sin eximir ninguna del control por-petición: **todas GET, sin cuerpo, ninguna a `/api/`, ninguna transporta `carlos`/`sub`/`jwt`/`t611-prod-verifier`/`not-a-secret`** (comprobado tras descontar el literal del dominio `carlosvillu.dev`).

## Coste real
$0 — sin APIs de pago (composición 100 % en el navegador; sin backend implicado).

## Veredicto
**PASS** — En producción viva, `/compose` sirve la pantalla con TLS válido y el recorrido 14.14 (json.minify + jwt.sign) funciona contra la imagen standalone de prod: dos pasos con tipo detectado, resultado copiable, **cero peticiones de red durante la composición** y consola limpia. La capa que solo ve el empaquetado de prod queda verde.

### Rarezas (aunque PASS)
- `docs/verifications/T6.11/sha.txt` registra `8e8c971` (commit T6.10, escrito durante la parte LOCAL antes del commit de T6.11). El deploy en curso corre `d3115ae` (HEAD) según el contexto del bucle; el comportamiento observado en prod es coherente con el bundle actual de T6.11. No edito `sha.txt` (fuera de mi ámbito); se anota la discrepancia de registro.
- La lectura de portapapeles vía `clipboard.readText()` está bloqueada por permisos del navegador headless (no es fallo de la app); se verificó la escritura con un spy sobre `writeText`, que capturó el JWT íntegro.
