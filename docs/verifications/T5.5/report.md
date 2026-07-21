# Verificación T5.5 — `og:image` de la portada para compartir en redes (cierre de F5)

- **Tarea**: T5.5 · `og:image` de la portada para compartir en redes (`planning.md`)
- **Fecha**: 2026-07-21
- **Ejecutor**: subagente `verifier` · curl + Read (imagen) + vitest/playwright · sin navegador CUA (superficie observable = HTML del `<head>` + fichero PNG servido)
- **Sistema**: working tree con el diff de T5.5 (untracked: `site-url.ts`, `site-url.test.ts`, `tagline.ts`, `og-image.spec.ts`, `public/opengraph-image.png`; modificados: `layout.tsx`, `page.tsx`, `analyze/page.tsx`, `landing-home.tsx`) sobre HEAD `e7f0cc7`. Build de **producción** local: `next build && next start -p 3119` con `TRUST_PROXY=1`, `COOKIE_SECURE=false`, sobre docker compose dev (Postgres 16, migraciones aplicadas). Healthcheck `/api/health` → `{ok:true, db:true}`.

## ALCANCE
Cubre **LA PARTE LOCAL**. La confirmación en el dominio vivo `https://devtools.carlosvillu.dev/` (curl real contra producción tras el deploy) **queda pendiente del deploy del bucle** — no se ejecuta aquí.

## Verificación esperada (literal de planning.md)
> el `<head>` de `/` incluye `og:image` (y `twitter:image`) apuntando a una URL **absoluta**; esa URL se sirve `200` con `Content-Type: image/*`. **Verificado en producción tras el deploy** (curl contra `https://devtools.carlosvillu.dev/`): la `og:image` resuelve al dominio de producción, **no a `localhost`** (mismo rigor que el control §11 sobre la barra real). La imagen muestra el wordmark sobre blanco + el claim (inspección visual). **E2E de fase F5 sin regresión**: `pnpm test:e2e` completo en verde (el recorrido de T5.3 y el header de T5.4 intactos). **Parada de fin de fase**.

## Pasos ejecutados
0. **Higiene de puertos**: maté 2 next-server huérfanos de `developer` (puertos 3000 y 3210). 3118/3119/3120 libres antes de arrancar. (2 next-server de `ubuntu` sin puertos, no míos: no se tocan.)
1. **Gate previo**: `pnpm gate` → **verde** (lint + typecheck + prettier + knip + readme:status + 679 tests) — `outputs/gate-clean.txt`. Un primer intento dio 1 rojo en `packages/core/src/history/redact.test.ts` (assert de timing `556ms < 500ms`), test AJENO al diff de T5.5 que corrió bajo carga concurrente con mi `next build`; en aislamiento pasa 3/3 y el re-run limpio del gate pasa 679/679.
2. **Punto 1 — `<head>` de `/`**: `curl http://localhost:3119/` → `og:image` y `twitter:image` absolutas al host de producción — `outputs/root-meta-tags.txt`.
3. **Punto 2 — imagen servida**: `curl /opengraph-image.png` → `200`, `Content-Type: image/png`, 19528 B, PNG 1200×630, **idéntica** (`cmp`) a `public/opengraph-image.png` — `outputs/og-image-headers.txt`.
4. **Punto 3 — inspección visual**: `public/opengraph-image.png` → wordmark **devtools** tinta oscura + cursor azul, claim «Pega algo. Lo desenreda.» gris, fondo **blanco**, 1200×630. Legible — `og-image.png`.
5. **Punto 4 — aislamiento privacidad**: `/analyze` (200) → **0** tags `og:`/`twitter:`, **0** `devtools.carlosvillu.dev`. `/history` sin sesión redirige a `/login` (0/0). `/history` **autenticado** (signup + cookie) renderiza «Historial» con **0** tags y **0** dominio — `outputs/analyze-page.html`, `outputs/history-auth.html`.
6. **Punto 5 — control negativo guard**: `site-url.test.ts` baseline 5/5 verde. Flip `DEFAULT_SITE_URL='http://localhost:3000'` → **2 tests ROJOS** (`expected 'localhost:3000' to be 'devtools.carlosvillu.dev'`). Restaurado → 5/5 verde. El guard muerde — `outputs/guard-negative-control.txt`.
7. **Punto 6 — E2E F5**: `pnpm test:e2e` completo → **36 passed** (fresh build + Testcontainers PG en 3118, aislado de mi 3119). Incluye `og-image.spec.ts`, `landing.spec.ts` (T5.3/T5.4), privacidad `history.spec.ts`/`f2.spec.ts`, `f0/f1` — `outputs/e2e.txt`.

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | `<head>` de `/` con `og:image` Y `twitter:image` absolutas, host = prod | ambas = `https://devtools.carlosvillu.dev/opengraph-image.png`; 0 localhost | root-meta-tags.txt | OK |
| 2 | og servida 200 `Content-Type: image/*` | `200`, `image/png`, 1200×630, idéntica a public/ | og-image-headers.txt | OK |
| 3 | wordmark sobre blanco + claim, tinta oscura, 1200×630 | wordmark oscuro + cursor azul + claim sobre blanco, 1200×630 | og-image.png | OK |
| 4 | `/history` y `/analyze` sin tags og/twitter ni dominio prod | 0 tags y 0 dominio en `/analyze`, `/login` y `/history` autenticado | analyze-page.html, history-auth.html | OK |
| 5 | guard prod-fallback + rechazo no-http(s); visto ROJO al romperlo | 2 tests ROJOS al flip, verde tras restaurar | guard-negative-control.txt | OK |
| 6 | `pnpm test:e2e` completo verde | 36 passed | e2e.txt | OK |

## Coste real
$0 — sin APIs de pago (metadatos estáticos, PNG committeado, tests locales). Estimado: $0.

## Veredicto
**PASS** — el `<head>` de `/` emite `og:image` y `twitter:image` absolutas al dominio de producción (metadataBase deriva de `resolveSiteUrl(env)` con fallback al dominio real → URL correcta incluso en local), la imagen se sirve 200 image/png 1200×630 con wordmark + claim sobre blanco, la og está acotada SOLO a `/`, el guard permanente muerde y el E2E de fase F5 pasa entero (36/36).

**Notas / rarezas**:
- Primer `pnpm gate` con 1 rojo por test de timing (`redact.test.ts`, T2.4) sensible a carga concurrente; ajeno a T5.5, verde en aislamiento y re-run limpio. No bloquea T5.5. Deuda de flakiness pre-existente.
- La og:image se sirve como fichero estático de `public/` (no hay ruta `/opengraph-image` en el build): convención de fichero de Next borrada a propósito.
- **Pendiente del bucle**: tras el deploy, `curl https://devtools.carlosvillu.dev/` debe resolver la og:image al dominio vivo (200, image/*) — cláusula de la Verificación diferida a producción.
- **Parada de fin de fase F5**: T5.5 es el cierre de F5; el bucle presenta resumen y espera OK (incl. revisión de READMEs).
