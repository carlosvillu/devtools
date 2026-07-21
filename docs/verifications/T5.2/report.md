# Verificación T5.2 — La landing en `/` (mockup «Home estilo Google»)

- **Tarea**: T5.2 · La landing en `/` (mockup «Home estilo Google») (`planning.md`, F5)
- **Fecha**: 2026-07-21
- **Ejecutor**: verifier · agent-browser 0.32.1 · sesión `t5.2`
- **Sistema**: working tree con el diff de T5.2 SIN commitear sobre `0449b98` (verifier corre pre-commit) · **BUILD DE PRODUCCIÓN** (`next build` + `next start`, PORT 3333, `TRUST_PROXY=1`, `COOKIE_SECURE=false`, `DATABASE_URL` → Postgres dev `127.0.0.1:5433`) · Postgres dev vía `docker-compose.dev.yml` + `db:migrate` · `/api/health` = `{ok:true,db:true}`
  - **Rareza del entorno**: `next dev` no hidrata en esta máquina (journal). Verificación de navegador contra el build de producción. Prod build exige `TRUST_PROXY=1` (sin él arranca en 500, esperado). `/` es `○ (Static)` en el build → la redirección de T5.1 se retiró.

## Verificación esperada (literal de planning.md)
> En `/`, se ve el wordmark, el campo, los badges y el footer; NO se ve ninguna cadena. **Pegar** un JWT navega a `/analyze` y allí aparece la cadena, **con la URL de `/analyze` sin el input** (control negativo §11). **Enter** con un JWT tecleado hace lo mismo. Teclear sin Enter no navega. **«Pega un ejemplo»** lleva a `/analyze` con su cadena. El enlace «Entrar» es `role=link`. `pnpm gate` + `pnpm test:e2e` verdes; `ds-reviewer` sin hallazgos mecánicos.

## Pasos ejecutados
1. `pnpm gate` → verde (674 tests / 60 ficheros, exit 0). Ver `gate.txt`.
2. `next build` + `next start` en 3333, DB migrada → `/api/health` = `{ok:true,db:true}`.
3. CUA abre `/` (desktop 1280×900) → snapshot: `historial`→`/history`, `Entrar`→`/login` (ambos `link`), `heading "devtools"` (h1=Wordmark), textbox, `Pega un ejemplo` (button), `github`. NINGUNA cadena. `01-landing-desktop.png`.
4. Foco del campo → `borderColor` acento + `box-shadow` ring 2px, `activeElement=TEXTAREA`. `02-field-focus.png`.
5. Teclear sin Enter → URL sigue `/`, valor presente, 0 cadenas.
6. Shift+Enter → URL sigue `/`, salto de línea insertado, NO navega.
7. `fill` `Authorization: Bearer <JWT>` + Enter → `/analyze`, cadena `jwt.decode`/`json.format`. BARRA REAL: `search=""`, `hash=""`, sin marker `eyJzdWIiOiIx…`, sin `Bearer`. Input llegó al campo; `sessionStorage['devtools:pending-input']`=`null` (consumido). `03-analyze-after-enter.png`.
8. «Pega un ejemplo» → `/analyze`, cadena `jwt→json`, `search=""`/`hash=""`. `04-analyze-ejemplo.png`.
9. Paste real: CUA headless DENIEGA `navigator.clipboard.writeText`. Cubierto por `landing.spec.ts:75` (Ctrl+V real, permisos clipboard) → PASS @f5. `handoff()` (común a los 3 disparos) verificado en vivo por Enter y ejemplo.
10. Móvil 375×720 → sin overflow horizontal, badges 2 filas, footer intacto. `05-landing-mobile-375.png`.
11. Contraste WCAG (canvas→sRGB) light + dark (tabla). `06-landing-dark.png`.
12. `historial` click → `/login?next=%2Fhistory` (auth-gate anónimo; el link es `/history`, `next` es ruta, sin §11).
13. Consola y `errors` del navegador: vacías (prod limpio). `browser-console.txt`.
14. `test:e2e -g @f5` → 6 passed (fresh server), incl. paste real. `e2e-f5.txt`.
15. `pnpm --filter @app/web test:e2e` (SUITE COMPLETA, fresh server 3118, mis propias signups) → **33 passed** (exit 0), sin el artefacto de rate-limit. `e2e-full.txt`.

## Resultado observado vs esperado
| # | Esperado | Observado | OK |
|---|---|---|---|
| 1 | `/` wordmark+campo+badges+footer, NO cadena | Todo presente, 0 cadenas, fiel al mockup | ✅ |
| 2 | Pegar → `/analyze`, URL sin input | Paste no emisible en CUA (clipboard denegado); e2e real Ctrl+V PASS + handoff común | ✅ (e2e) |
| 3 | Enter tecleado → `/analyze`, URL sin input §11 | `jwt→json`; `search=""`/`hash=""`, sin marker/Bearer; input por sessionStorage (consumido) | ✅ |
| 4 | Teclear sin Enter → no navega | URL `/`, valor presente, 0 cadenas | ✅ |
| 5 | Shift+Enter → salto, no navega (brief) | URL `/`, `\n` insertado | ✅ |
| 6 | «Pega un ejemplo» → `/analyze` con cadena, URL limpia | `/analyze`, `jwt→json`, `search=""`/`hash=""` | ✅ |
| 7 | «Entrar» = `role=link` | snapshot `link "Entrar" url=/login` | ✅ |
| 8 | historial → `/history` | link `/history`; anónimo → `/login?next=/history` | ✅ |
| 9 | Footer solo GitHub + privacidad COMPLETA (2 frases) | github + ambas frases | ✅ |
| 10 | `/analyze` Callout mismo texto (fuente única) | Callout idéntico (`lib/privacy-notice.ts`) | ✅ |
| 11 | Responsive sin romper | 375px sin overflow, badges 2 filas | ✅ |
| 12 | Visual = mockup | wordmark grande, tagline, píldora+icono+foco, 7 badges, header mínimo, footer | ✅ |
| 13 | `pnpm gate` verde | 674 tests / 60 ficheros, exit 0 | ✅ |
| 14 | `pnpm test:e2e` verde | @f5 6 passed; **suite completa 33 passed re-corrida por mí (fresh)** | ✅ |
| 15 | `ds-reviewer` sin hallazgos | LIMPIO (reportado por el bucle en step 5c; no re-ejecutado aquí) | ✅ |
| 16 | Consola sin errores | console/errors vacías (prod) | ✅ |

## Contraste WCAG (obligatorio cua.md) — canvas→sRGB, texto/fondo
| Elemento | Light | Dark | Umbral |
|---|---|---|---|
| badge jwt | 6.97 | 10.16 | 4.5 ✅ |
| badge base64 | 5.12 | 12.22 | 4.5 ✅ |
| badge json | 6.25 | 12.58 | 4.5 ✅ |
| badge timestamp | 4.70 | 11.21 | 4.5 ✅ |
| badge url | 5.14 | 11.91 | 4.5 ✅ |
| badge uuid | 5.12 | 12.22 | 4.5 ✅ |
| badge hash | 6.60 | 11.60 | 4.5 ✅ |
| «Entrar» | 17.94 | 17.94 | 4.5 ✅ |
| tagline | 7.25 | 7.45 | 4.5 ✅ |
| hint ⌘V | 4.62 | 5.57 | 4.5 ✅ |
| footer privacidad | 4.83 | 5.11 | 4.5 ✅ |
| **historial** | 7.25 | **2.58** | 4.5 ⚠️ |
| **github** | 7.57 | **2.37** | 4.5 ⚠️ |

- **Hallazgo (route-to-user, NO bloqueante)**: en tema OSCURO, `historial` y `github` (ambos `text-text-muted`=`--text-muted`→`gray-400` en dark) caen a 2.58 / 2.37, por debajo de AA 4.5. La landing USA el token del DS correctamente (no hardcodea); el mismo token es app-wide (`site-header`, `callout`, `dialog`, `badge` neutral, `design-system`). Por la regla de cua.md un fallo de contraste cuyo color viene del DS es defecto de los valores del token (decisión del usuario), se REPORTA, no bloquea. En light (tema por defecto; no hay conmutador global fuera de `/design-system`) ambos pasan (7.25 / 7.57). `globals.css:91` documenta que `--text-muted` se afinó para AA solo en light. **Señal accionable para quien arregle el DS**: en el MISMO fondo del footer en dark, la privacidad `<p>` (`text-subtle`, 5.11) contrasta MÁS que `github` (`text-muted`, 2.37) — es decir, el `--text-muted` de dark (gray-400) queda más apagado que `--text-subtle`, invertido respecto a la intención (muted debería ser más legible que subtle).

## Coste real
$0 — sin APIs de pago. Motor puro local + Postgres dev.

## Veredicto
**PASS** — la landing cumple la Verificación literal: wordmark/campo/badges/footer sin cadena; los tres disparos (pegar/Enter/ejemplo) relevan a `/analyze` con `jwt→json`; el control negativo §11 reproducido en la BARRA REAL (`search`/`hash` vacíos, sin marker ni `Bearer`; input por sessionStorage, consumido). «Entrar» es `role=link`, footer solo github + aviso completo, `/analyze` comparte el texto. Gate 674 verde, @f5 6 passed (incl. paste real), consola limpia, visual fiel al mockup en desktop y móvil.

**Notas / rarezas (aunque PASS)**:
- Paste real no ejercitable por CUA (clipboard denegado en headless); cubierto por `landing.spec.ts` (Ctrl+V real) + handoff común probado en vivo.
- Contraste dark de `historial`/`github` por debajo de AA (2.58/2.37): defecto de los valores del token `--text-muted` en dark, app-wide, route-to-user; no bloquea T5.2.
