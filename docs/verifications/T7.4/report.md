# Verificación T7.4 — La imagen OG dinámica por receta (parte LOCAL)

- **Tarea**: T7.4 · La imagen OG dinámica por receta (`planning.md`, fase F7)
- **Fecha**: 2026-07-23
- **Ejecutor**: verifier (contexto fresco) · sin navegador (superficie crawler = curl, sin JS)
- **Sistema**: working tree sin commitear (`page.tsx` modificado + `compose/og/` y `compose-og.spec.ts` untracked) · stack E2E de producción (`scripts/e2e-stack.ts` → `next build` + `next start`) en `localhost:3118` · Postgres testcontainer · `/api/health` → `{ok:true, db:true}`
- **Alcance**: SOLO la parte LOCAL. La verificación contra la **imagen de producción** (empaquetado standalone / trampa de fuentes de F5) la cierra **T7.5** → marcada PENDIENTE.

## Verificación esperada (literal de planning.md)
> pedir la imagen OG de un `/compose?r=…` **como un crawler** (curl, sin ejecutar JS) → 200 `image/*` que refleja los pasos de la receta; `?r=` inválido → fallback sin error (14.18, parte local). **Parada de juicio humano**: aspecto de la OG (captura, OK del usuario). La verificación contra la imagen de prod la cierra T7.5. `pnpm gate` verde.

(El OK del ASPECTO ya fue concedido por el usuario — renders de 3/8 pasos + fallback. Aquí se verifica el CONTRATO y el CONTENIDO, no la estética.)

## Recetas usadas (elegidas por el verifier, distintas de las del implementer/e2e)
Aritmética confirmada independientemente decodificando con el codec real de core (`decodeRecipe`), no comparando `encodeRecipe` consigo mismo:
- **R5 (5 pasos)** `base64.encode-text~url.encode-text~json.minify-json~base64url.encode-text~jwt.sign-jwt`
- **R1 (1 paso)** `json.stringify-text` (comprueba el singular «1 paso»)
- **R8 (8 pasos, tope MAX_COMPOSE_STEPS)** `json.minify~base64.encode~base64url.encode~url.encode~jwt.sign~json.stringify~json.minify~base64.encode`
- **R9 (9 pasos, excede el tope)** → `decodeRecipe` da `ok:false` → debe caer a fallback

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | `?r=` VÁLIDO → **200 `image/png` DIRECTO** (sin seguir redirect) | R5->200/40771B, R1->200/28522B, R8->200/47310B; `--max-redirs 0`, ningún 307 | 01-crawler-curls.txt | OK |
| 2 | La imagen **refleja los pasos** (N + ids en orden), no una imagen fija | R5 pinta «Receta · 5 pasos» + base64.encode->url.encode->json.minify->base64url.encode->jwt.sign; R8 «8 pasos» con los 8 ids en orden; R1 «Receta · 1 paso» (singular) + json.stringify | vrf-og-5steps/8steps/1step.png (leídas visualmente) | OK |
| 3 | El 200 NO es el fallback camuflado | sha256(R5) != sha256(`/opengraph-image.png`); sha256(R1) != sha256(R5) -> cada receta produce su propia imagen | comparación cmp/sha256 | OK |
| 4 | `?r=` inválido/ausente -> **307 a `/opengraph-image.png`, NUNCA 500** | 8 inputs hostiles (vacío, sin `?r=`, `jwt.forge-jwt`, `basura%ZZ`, `%25%25basura%25%25`, `a-b-c`, `json.minify-json~` trailing, **9 pasos**) -> TODOS 307 -> `/opengraph-image.png`. Ningún 500. | 01-crawler-curls.txt | OK |
| 5 | El fallback ES la og genérica de F5 | forge-id seguido con `-L` es byte-idéntico a `/opengraph-image.png` (wordmark + «Pega algo. Lo desenreda.») | vrf-fallback-followed.png = vrf-generic-static.png | OK |
| 6 | `<head>` de `/compose?r=` declara og:image ABSOLUTA (host prod) a la ruta dinámica | og:image = `https://devtools.carlosvillu.dev/compose/og?r=<R5>`; og:title «Receta · 5 pasos»; twitter `summary_large_image`. El `r=` lleva SOLO los 5 ids. | 02-html-meta-and-privacy.txt | OK |
| 7 | Sin `?r=`, `/compose` cae a la og genérica estática | og:image = `/opengraph-image.png`, og:title de marca | 02 | OK |
| 8 | La og de `/` (F5) sigue INTACTA | og:image `/opengraph-image.png`, título «devtools», claim intacto | 02 | OK |
| 9 | `/analyze` y `/history` NO ganan tags og/twitter (D7/14.8) | 0 metas og/twitter en `/analyze`; 0 en `/history` (-> /login) | 02 | OK |
| 10 | La metadata de `/compose?r=` NO filtra fuente ni secreto (§11) | El único `secret`/`sub` del HTML es copy estático del Callout («no uses secretos de producción») y substrings de clases (`text-subtle`); `sharedRecipe` del payload RSC = solo `{transform_id, kind}` (allowlist) | 02 | OK |
| 11 | Test Playwright permanente `@f7` que blinda el contrato | `compose-og.spec.ts` tag `@f7`; suite `--grep @f7` = **10 passed** (6 de T7.4: 200-directo con `maxRedirects:0`, fallback 307, id inventado, sin `?r=`, metadata absoluta host-prod, genérica). | 03-e2e-f7.txt | OK |
| 12 | `pnpm gate` verde | exit 0, **1190 tests** (73 ficheros), lint/typecheck/format/knip/readme:status verdes | consola gate | OK |

## Notas / rarezas (no bloquean)
- **Never-500 sobre throw de render**: el fallback infalible se ejercita LOCALMENTE solo por el camino de input hostil (receta inválida -> 307). Forzar un fallo del render de una receta VÁLIDA (fuente que no viaja / satori que revienta — la trampa standalone de F5) exigiría editar código, prohibido al verifier; ese camino y el empaquetado standalone quedan para **T7.5**. Se leyó el código: `.arrayBuffer()` materializa el render DENTRO del `try`, el `catch` loguea `err_name`/`err_message` sin loguear `r` (§11), y `fontsPromise` resetea la caché en el rechazo (un fallo transitorio no envenena el proceso) — implementados como el implementer declara. Durante los renders válidos NO se emitió ningún `compose_og_recipe_render_failed` en el log del servidor (confirma que renderizaron de verdad, no cayeron al fallback).
- **Warnings de build pre-existentes**: `instrumentation.ts` emite «Ecmascript file had an error … process.cwd/node:fs no soportado en Edge Runtime» durante el `next build`. Es un fichero NO tocado por T7.4 (fuera del diff), son avisos de análisis estático de Edge (no errores de runtime: el build completó, health 200, todos los tests verdes). No es regresión de T7.4.

## Coste real
$0 — sin APIs de pago (vs estimado $0).

## Veredicto
**PASS (parte LOCAL)** — la og:image dinámica por receta cumple el contrato: `?r=` válido -> 200 `image/png` directo que refleja fielmente N pasos + ids en orden (verificado leyendo los píxeles de 3 recetas distintas, cada una con su propia imagen); todo input hostil -> 307 a la og genérica de F5, cero 500; la metadata de `/compose` apunta a la ruta dinámica con host de prod sin filtrar fuente/secreto; `/`, `/analyze`, `/history` intactos; test `@f7` permanente verde; `pnpm gate` verde.

**PENDIENTE (T7.5)**: verificación contra la imagen de PRODUCCIÓN (empaquetado standalone — la carga de fuentes `.ttf` module-relative, la lección de F5/T5.5).
