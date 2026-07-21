# Verificación T5.4 — El header de la landing refleja la sesión

- **Tarea**: T5.4 · El header de la landing refleja la sesión (`planning.md`, F5)
- **Fecha**: 2026-07-21
- **Ejecutor**: verifier · agent-browser 0.32.1 · sesión `t5.4`
- **Sistema**: working tree sobre commit `f02b6fa` (los cambios de T5.4 son 3 ficheros SIN commitear: `landing-home.tsx`, `page.tsx`, `landing.spec.ts` — `git diff --stat HEAD` = 3 files, +101/-10). Servido con `next build && next start -p 3119`, `TRUST_PROXY=1`, `COOKIE_SECURE=false`, contra Postgres 16 dev (127.0.0.1:5433, migrado). `/api/health` → `{ok:true,db:true}`. Build confirma `/` como `ƒ (Dynamic)`.

## Verificación esperada (literal de planning.md)
> Levantado el sistema (`next build && next start`, `TRUST_PROXY=1`), un usuario **con sesión** que carga `/` ve su email + «Salir» en el header y **no** ve «Entrar»; un usuario **anónimo** ve «Entrar» y **no** ve ningún email. Pulsar el Wordmark en `/analyze` estando logueado lleva a `/` con el header ya coherente (sin «Entrar»). **Control negativo**: revertir el header a estático (siempre «Entrar») pone el spec logueado en **rojo**. `pnpm gate` + `pnpm test:e2e` verdes.

## Pasos ejecutados
1. `pnpm gate` (raíz) → verde: 60 test files, **674 passed**.
2. Levantado el sistema real: `next build` (`/` = Dynamic) + `next start -p 3119` con `TRUST_PROXY=1`; health `{ok:true,db:true}`.
3. CUA `/` **anónimo** (sesión limpia): snapshot muestra `link "Entrar"`, tagline «Pega algo. Lo desenreda.» presente, ningún email. URL `/`. → `01-anon-landing.png`.
4. **Signup** de cuenta nueva `t54-cua-1784627101@e2e.local` desde `/signup` (como un humano, formulario real) → aterriza en `/analyze` (cookie de sesión puesta).
5. CUA `/` **con sesión**: snapshot muestra el email en el header, `button "Salir"`, y **ningún** `link "Entrar"`. Tagline presente, URL `/`. → `02-loggedin-landing.png`.
6. **Recorrido Wordmark**: en `/analyze` (logueado) click en `link "devtools — inicio"` → `wait --url` a `/` → header coherente: email + «Salir», sin «Entrar». → `03-wordmark-to-landing.png`.
7. Consola y errores del navegador: **vacíos** (`browser-console.txt`, `browser-errors.txt` = 0 bytes).
8. `pnpm test:e2e` (suite completa, stack propio en 3118) → **35 passed** (incluye los 2 tests `@f5` de T5.4).
9. **Control negativo reproducido**: revertido SOLO el bloque de sesión de `landing-home.tsx` a «Entrar» estático → `playwright test landing.spec.ts --grep "con sesión iniciada"` → **1 failed** (`getByText(email)` no visible en `landing.spec.ts:171`). Fichero **RESTAURADO** (`git diff HEAD` byte-idéntico al original) y T5.4 vuelto a verde (2 passed).

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | Anónimo en `/`: «Entrar» (link) visible, sin email | `link "Entrar"`, sin email, tagline y URL `/` | 01-anon-landing.png | ✅ |
| 2 | Con sesión en `/`: email + «Salir», sin «Entrar» | email + `button "Salir"`, sin «Entrar», tagline y URL `/` | 02-loggedin-landing.png | ✅ |
| 3 | Wordmark en `/analyze` (logueado) → `/` coherente | Aterriza en `/` con email + «Salir», sin «Entrar» | 03-wordmark-to-landing.png | ✅ |
| 4 | Control negativo: header estático → spec logueado ROJO | 1 failed (email no visible); restaurado y re-verde | negctrl.log / restore-check.log | ✅ |
| 5 | `pnpm gate` verde | 674 passed | gate.log | ✅ |
| 6 | `pnpm test:e2e` verde | 35 passed | e2e.log | ✅ |
| 7 | Consola del navegador limpia | 0 errores / 0 mensajes | browser-console.txt, browser-errors.txt | ✅ |

## Coste real
$0 — verificación puramente de UI/servidor local, sin APIs de pago (estimado planning: $0).

## Veredicto
**PASS** — el header de la landing refleja la sesión en los dos estados, el recorrido Wordmark aterriza en `/` coherente, y el control negativo muerde de verdad (visto ROJO con mis ojos, luego restaurado).

Notas / rarezas (no bloquean):
- **La tagline «Pega algo. Lo desenreda.» NO es exclusiva de `LandingHome`**: en `/analyze` aparece como el `h1` (`heading "Pega algo. Lo desenreda." [level=1]`). El comentario del spec (`landing.spec.ts`) afirma exclusividad, pero el ancla de capa REAL es `toHaveURL('/')`, que sí distingue la landing de `/analyze`; por eso el spec sigue siendo correcto. Solo es una imprecisión en el comentario, no un defecto de código ni del test.
- Incidencia operativa del propio verifier (sin efecto en el veredicto): al restaurar el control negativo usé `git checkout` que, al estar T5.4 sin commitear, revirtió a la versión pre-T5.4; se reconstruyó el fichero y se confirmó byte-idéntico al original vía `git diff HEAD` + re-run verde de los 2 specs T5.4.
