# Verificación T7.5 — E2E de fase F7 + producción (parte LOCAL)

- **Tarea**: T7.5 · E2E de fase F7 + producción (`planning.md`)
- **Fecha**: 2026-07-23
- **Ejecutor**: verifier · agent-browser (npx, core skill cargada) · sesiones `t7.5`, `t7.5b`, `t7.5-bad1/2`
- **Sistema**: commit `62afbbb` (HEAD) + único cambio sin commitear = `apps/web/e2e/phases/f7.spec.ts` (untracked, solo test; la superficie de producto —`/compose`, `/compose/og`— ya está committeada de T7.3/T7.4). Stack real levantado: docker compose dev (Postgres 16 healthy) + `pnpm db:migrate` + `pnpm dev` (Next 16.2.10, proceso fresco en **:3000**, `/api/health` → `{ok:true,db:true}`). F7 es anónima (D6): sin seed/login para el CUA.

## Alcance

Se verifica **solo la parte LOCAL** de T7.5 (14.17 / 14.18-local / 14.19 + no-regresión). **La parte de PRODUCCIÓN queda PENDIENTE** (ver sección final): el deploy a `devtools.carlosvillu.dev` y la verificación de la OG contra la **imagen de prod** (standalone) la gobierna el bucle con confirmación del usuario. El empaquetado standalone/Docker de la OG —justo lo que rompió en F5— **no** lo ejercita ni `pnpm dev` ni el `next start` del suite e2e; es el check diferido por diseño.

## Verificación esperada (literal de planning.md)
> **Verificación (E2E de fase)**: cierra **14.17** (round-trip de compartir; fuente/secreto **no** en la URL, control negativo con positivo), **14.18** (OG contra la **imagen de prod**, pedida sin JS como un crawler), **14.19** (`?r=` inválido ignorado). Sin regresión: `pnpm test:e2e` **completo** verde (F0–F6, en particular **14.1**, **14.14** cero-red anónima y el control de URL sin input de F5) y `pnpm gate` verde. **En producción tras el deploy**: `https://devtools.carlosvillu.dev/compose?r=…` sirve la pantalla y su imagen OG con TLS válido **contra la imagen de prod**, no `next dev`. Revisión de READMEs de fin de fase (paso 9). **Parada de fin de fase**: resumen y esperar OK del usuario.

## Método escéptico
Inputs **elegidos por el verifier**, no los fixtures del implementer:
- Fuente: `{"sub":"1","name":"verifier-src-7q2","role":"admin"}`
- Secreto canario: `verifier-canary-9x4-not-a-secret`

El recorrido compartir→abrir→OG se condujo **como usuario en el navegador**. La URL compartida **no se fabricó**: se leyó el valor exacto que el botón real «Copiar enlace» pasa a `navigator.clipboard.writeText` (la lectura directa del portapapeles está bloqueada headless por permisos; se envolvió `writeText` para **observar** —no simular— lo que el clic real produce, y se cotejó que el estado del botón viró a «Copiado»). URL capturada: `http://localhost:3000/compose?r=json.minify-json~jwt.sign-jwt`.

## Pasos ejecutados
1. `/compose` → componer `json.minify` + `jwt.sign` con el secreto canario → aparece «listo para compartir» (`01-compose-listo.png`).
2. Clic real en «Copiar enlace» → estado «Copiado» → URL capturada del `writeText` real → greps con control positivo/negativo (`02-url-leak-grep.txt`).
3. Abrir la URL en **sesión fresca** `t7.5b` → los 2 pasos precargados, sin paso 3, `entrada` y `secreto` **vacíos**, aviso «Abriste una receta compartida» (`03-opened-empty-fields.png`).
4. Leer `og:image`/`og:title` del `<head>` (lo que ve un crawler) → apunta a `/compose/og?r=<misma receta>` en el host de PROD (metadataBase) (`07-og-meta-noleak.txt`).
5. `curl --max-redirs 0` de la ruta OG **local** equivalente → 200 `image/png` directo; comparación `cmp` contra `/opengraph-image.png` → distintas; lectura visual del PNG (`04-og-crawler.txt`, `og-recipe.png`).
6. Control: `?r=` roto en la ruta OG → **307** a la og genérica → prueba que el 200 es un render real, no un 200 en blanco (`05-og-fallback-control.txt`).
7. `?r=` inválido (malformado y con id fuera del catálogo) en **sesiones frescas** → pantalla limpia y funcional, sin paso, sin aviso (`06-badr-invalid.txt`, `06-badr-case1.png`, `06-badr-case2.png`).
8. Consola del navegador limpia (solo ruido dev de framework) (`browser-console-t7.5.txt`).
9. `pnpm test:e2e` **completo** (prod build, no `next dev`) y `pnpm gate` → totales confirmados (`08-e2e-results.txt`, `08-gate-totals.txt`, `gate.log`).

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 14.17-url | La URL compartida NO lleva fuente ni secreto; los ids SÍ | `verifier-src-7q2`/`verifier-canary…`/`not-a-secret`/`admin`/`"sub"`/`role` → 0; `json.minify`/`jwt.sign` → 1; ancla `^json\.minify-\w+~jwt\.sign-\w+$` coincide | 02, shareUrl.txt | OK |
| 14.17-open | Abierto el enlace: mismos pasos, fuente y secreto vacíos, aviso | 2 pasos (json.minify, jwt.sign), sin paso 3, ambos campos `""`, «Abriste una receta compartida» presente | 03 | OK |
| 14.18 | OG como crawler (sin JS) → 200 image/* reflejando los pasos, directo | `--max-redirs 0` → **200** `image/png`, 1200×630, 31 KB; **≠** genérica (cmp); PNG muestra «Receta · 2 pasos» + chips `json.minify → jwt.sign`; roto → 307 (prueba de que el 200 es render real) | 04, 05, og-recipe.png | OK |
| 14.18-noleak | La OG/metadata no filtra dato | og:image/title solo llevan ids; el PNG solo muestra ids | 07, og-recipe.png | OK |
| 14.19 | `?r=` inválido → pantalla limpia sin paso, funcional | Malformado y id-inventado (sesión fresca): 0 pasos, 0 aviso, `entrada` vacía, «añadir paso» presente | 06 | OK |
| no-reg e2e | `pnpm test:e2e` completo verde (F0–F6 + 14.1 + 14.14 + url-limpia F5) | **66 passed**, 0 fallos, **0 skips** (el «pending» es el nombre `analyze-pending.spec.ts`, ✓); f7 `@phase` ejecutado (#66); 14.14 cero-red, 14.1, url-limpia F5 ✓ | 08-e2e-results.txt | OK |
| no-reg gate | `pnpm gate` verde (lint+typecheck+format+knip+readme:status+test) | **exit 0**, 1190 tests / 73 ficheros, knip + readme:status:check verdes | 08-gate-totals.txt, gate.log | OK |
| consola | Sin errores JS de código propio | Solo React DevTools info + HMR/Fast Refresh (dev-only) | browser-console-t7.5.txt | OK |

## Coste real
$0 — sin APIs de pago (todo local; la OG la renderiza satori en el propio servidor).

## Veredicto
**PASS (parte LOCAL)** — el recorrido de fase F7 se sostiene entero en el sistema real: una receta con secreto se comparte por `?r=` **sin filtrar** fuente ni secreto (control negativo con positivo y ancla estructural), el enlace se reabre con los pasos y los campos vacíos, su OG responde a un crawler con **200 image/png directo reflejando los pasos** (distinta de la genérica, un `?r=` roto cae al 307), y un `?r=` inválido se ignora en pantalla limpia y funcional. `pnpm test:e2e` **66 passed** (0 skips, f7 `@phase` incluido) y `pnpm gate` **exit 0** (1190 tests).

### PENDIENTE — parte de PRODUCCIÓN (fuera de mi alcance)
Queda por hacer, gobernado por el bucle con OK del usuario: (1) **deploy** del commit exacto a `devtools.carlosvillu.dev` vía skill `deploy`; (2) verificar `https://devtools.carlosvillu.dev/compose?r=…` con TLS válido y su OG **contra la imagen de prod** (empaquetado standalone/Docker — la lección de F5/T5.5, no cubierta por `pnpm dev` ni por el `next start` del suite); (3) revisión de READMEs de fin de fase (paso 9); (4) parada de fin de fase.

### Notas / rarezas
- La lectura directa del portapapeles (`clipboard read` / `readText`) está **bloqueada headless** por permisos de Chrome (no hay flag de grant en agent-browser). Se observó la URL envolviendo `writeText` (captura del argumento real del botón), no fabricándola — cotejado con el estado «Copiado». No es un defecto del producto: en un navegador de usuario real la copia funciona (el estado del botón lo confirma).
- El `og:image` apunta al host de **prod** por `metadataBase` (control negativo heredado de T5.5/T7.4: nunca `localhost`); por eso la imagen se pidió a la ruta local equivalente `pathname+search`, como hace el spec.
