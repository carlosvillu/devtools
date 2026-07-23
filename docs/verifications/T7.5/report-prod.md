# Verificación T7.5 — E2E de fase F7 · parte de PRODUCCIÓN

- **Tarea**: T7.5 · E2E de fase F7 + producción (`planning.md`)
- **Fecha**: 2026-07-23
- **Ejecutor**: verifier (contexto fresco) · agent-browser (npx, core skill cargada, `--no-sandbox`) · sesiones `t7.5prod`, `t7.5prodbad` (sin login — compartir es anónimo, D6)
- **Sistema verificado**: **producción viva** `https://devtools.carlosvillu.dev`. Contenedor `devtools-web-1` (imagen `devtools-web`, standalone/prod, **NO** `next dev`), `Up 2 minutes (healthy)` en el VPS `vmi3440324` (80.190.75.149). Repo del VPS en HEAD `84849f5` ("fix: the recipe OG fallback redirect pointed at the internal container origin"). `/api/health` -> `{ok:true,db:true}`.
- **TLS**: cert de Google Trust Services (CN carlosvillu.dev), válido `notBefore Jun 23 2026` / `notAfter Sep 21 2026`. HTTP/2 tras Caddy central + Cloudflare.

## Alcance de este report
Cierra **la cláusula prod-only** de T7.5 y **14.17/14.18/14.19 contra la imagen de prod**, ejercitando lo que `pnpm dev` y el `next start` del suite E2E **no** ven (empaquetado standalone/Docker — la lección de F5/T5.5). La parte local ya está en `report.md`. Aquí: navegador real + crawler contra el dominio vivo.

## Verificación esperada (literal de planning.md)
> **En producción tras el deploy**: `https://devtools.carlosvillu.dev/compose?r=...` sirve la pantalla y su imagen OG con TLS válido **contra la imagen de prod**, no `next dev`.

Criterios F7 sobre el sistema vivo: 14.17 (round-trip precarga pasos, fuente/secreto vacíos + aviso), 14.18 (OG como crawler sin JS: 200 image/* de la imagen de prod reflejando los pasos), 14.19 (`?r=` inválido -> pantalla limpia + OG cae al fallback que resuelve al dominio público, no `0.0.0.0`).

## Método escéptico
- Receta válida elegida por el verifier: `?r=json.minify-json~jwt.sign-jwt` (2 pasos con secreto).
- `?r=` inválido: `jwt.forge-jwt` (id inventado fuera del catálogo).
- OG pedida **como crawler** con `curl --max-redirs 0` (sin ejecutar JS), NO `page.goto`. Round-trip de la pantalla en **navegador real** (lo que el curl no ve). Comparación de bytes recipe-OG vs OG genérica con `sha256`/`cmp`. Evidencia de fuente externa (headers HTTP, bytes en disco, cert TLS), no logs del propio código.

## Pasos ejecutados y observado
1. **Navegador real -> `/compose?r=json.minify-json~jwt.sign-jwt`** contra prod. Carga entera (no 500/blanco). Título `devtools · Receta · 2 pasos`. Snapshot: **2 pasos precargados** (paso 1 = `json.minify` selected, paso 2 = `jwt.sign` selected). Campos: textarea `entrada` value `""` (VACÍO), input `type=password` (Secreto de firma) value `""` (VACÍO). Aviso presente: **"Abriste una receta compartida."** (`prod-03-valid-preloaded.png`). Consola y errores **vacíos** en el bundle minificado de prod (`prod-console-valid.txt`, `prod-errors-valid.txt`).
2. **OG como crawler** — del HTML de prod: `og:image = https://devtools.carlosvillu.dev/compose/og?r=json.minify-json%7Ejwt.sign-jwt`, `og:title = Receta · 2 pasos`, sin fuente/secreto (`prod-01-og-meta.txt`). `curl --max-redirs 0` -> **HTTP/2 200, image/png, DIRECTO (no 307)**, 31208 bytes, PNG 1200x630. `cmp`/`sha256` vs `/opengraph-image.png` (19528 bytes, RGB) -> **DIFIEREN** (render real de ESTA receta). Lectura visual: "**Receta · 2 pasos**" + chips `json.minify -> jwt.sign` + footer `devtools.carlosvillu.dev · una receta compartida` (`prod-og-recipe.png`).
3. **Fallback resuelve al dominio público** — `curl --max-redirs 0` de `/compose/og?r=jwt.forge-jwt` -> **HTTP/2 307**, `location: /opengraph-image.png` (redirect **relativo** — el fix de `84849f5`: resuelve contra el host público, nunca `0.0.0.0` ni origen interno). `-L` -> **200 image/png en `https://devtools.carlosvillu.dev/opengraph-image.png`** (`prod-02-og-crawler.txt`).
4. **14.19 en pantalla** — navegador real -> `/compose?r=jwt.forge-jwt` (id inventado). Pantalla **limpia**: 0 comboboxes de paso, **sin aviso**, `añadir paso` presente (funcional), título `devtools`, entrada vacía (`prod-04-invalid-clean.png`). Consola/errores vacíos.

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| TLS | TLS válido | Cert Google Trust Services vigente, HTTP/2 | openssl s_client | OK |
| prod-bundle | Imagen de prod, no `next dev` | `devtools-web-1` standalone healthy, HEAD `84849f5` | container inspect | OK |
| 14.17-carga | Precarga 2 pasos (json.minify, jwt.sign) | 2 comboboxes selected; título "Receta · 2 pasos" | prod-03 | OK |
| 14.17-vacío | Fuente y secreto VACÍOS | textarea `""`, input password `""` | prod-03 | OK |
| 14.17-aviso | Aviso de receta compartida | "Abriste una receta compartida." | prod-03 | OK |
| 14.18-directo | OG crawler -> 200 image/* DIRECTO | HTTP/2 200 image/png, 31208B, 1200x630 | prod-02, prod-og-recipe.png | OK |
| 14.18-!=genérica | Distinta de `/opengraph-image.png` | cmp DIFFER; 3a9bc9a0... != a02748ed... | prod-02 | OK |
| 14.18-refleja | Refleja «Receta · 2 pasos» + ids | "Receta · 2 pasos" + `json.minify -> jwt.sign` | prod-og-recipe.png | OK |
| 14.19-fallback | inválido -> 307 a dominio público (no 0.0.0.0) | 307 `location: /opengraph-image.png` (relativo->público); `-L` -> 200 en dominio público | prod-02 | OK |
| 14.19-pantalla | inválido -> pantalla limpia funcional | 0 pasos, sin aviso, "añadir paso" presente | prod-04 | OK |
| consola | Sin errores de producto en bundle minificado | console + errors vacíos (válido e inválido) | prod-console/errors-*.txt | OK |

## Coste real
**$0** — sin APIs de pago. OG renderizada por satori en el servidor de prod; resto curl + navegador headless contra dominio ya desplegado.

## Veredicto
**PASS (parte de PRODUCCIÓN)** — contra `https://devtools.carlosvillu.dev` (imagen standalone de prod, HEAD `84849f5`, TLS válido, **no** `next dev`): un enlace `/compose?r=<receta>` abierto en el navegador real precarga los 2 pasos con fuente y secreto **vacíos** y el aviso de receta compartida (14.17); su OG como crawler es **200 image/png directo** que refleja «Receta · 2 pasos» + los ids y **difiere** de la genérica (14.18, contra la imagen de prod); un `?r=` inválido da pantalla limpia y su OG cae al **307 relativo `/opengraph-image.png` que resuelve al dominio público** — nunca `0.0.0.0` ni origen interno (14.19, el fix de `84849f5`). Consola del bundle minificado de prod limpia.

### Notas / rarezas
- En la pantalla de la receta válida con campos vacíos aparecen los mensajes **esperados** "La entrada no es JSON válido" (paso 1) y "no se aplicó: un paso anterior de la cadena falló" (paso 2): consecuencia correcta de fuente/secreto vacíos — la receta compartida trae solo los pasos, no los datos (D11). No es defecto.
- El `Location` del fallback es un redirect **relativo** (`/opengraph-image.png`), no absoluto: es la forma que blinda el fix (nunca filtra el origen interno). `-L` lo resuelve a `https://devtools.carlosvillu.dev/opengraph-image.png`.
- No se persistió ni borró nada en prod: solo lecturas/composición anónima.
