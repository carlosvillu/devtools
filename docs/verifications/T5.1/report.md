# Verificación T5.1 — Mudar la experiencia de análisis a `/analyze` (sin cambio visual)

- **Tarea**: T5.1 · Mudar la experiencia de análisis a `/analyze` (sin cambio visual) (`planning.md`, F5)
- **Fecha**: 2026-07-21
- **Ejecutor**: verifier · agent-browser (npx -y, core skill) · sesión `t5.1`
- **Sistema**: working tree con el diff de T5.1 SIN commitear sobre `adfaf53` (verifier corre pre-commit) · `next build` + `next start` (BUILD DE PRODUCCIÓN, PORT 3333, `TRUST_PROXY=1`, `COOKIE_SECURE=false`, `DATABASE_URL` → Postgres dev en 127.0.0.1:5433) · Postgres dev vía docker-compose.dev.yml + `db:migrate`
  - **Rareza del entorno**: `next dev` no hidrata en esta máquina (journal). Toda la verificación de navegador va contra el build de producción, NO `next dev`. Un `next dev` viejo del vecino ocupaba el 3000; se levantó el build limpio en 3333.

## Verificación esperada (literal de planning.md)
> `/analyze` sirve la experiencia de hoy y pegar un JWT produce la cadena `jwt → json` (14.1 intacto). Entrar directo a `/analyze` sin pending → campo vacío funcional. Escribir un JWT bajo `sessionStorage['devtools:pending-input']`, navegar a `/analyze`: se auto-analiza y la clave queda **borrada** (recargar no re-analiza). **Control negativo de privacidad**: tras el flujo, la URL de `/analyze` no contiene el input (ni query ni fragment). `pnpm gate` + `pnpm test:e2e` verdes.

## Pasos ejecutados
1. `pnpm gate` → verde: 60 ficheros / 674 tests, lint/typecheck/format/knip/readme:status OK (`gate.txt`).
2. `next build` + `next start` (prod) en 3333 con env de prod → `/api/health` = `{ok:true,db:true}`.
3. `/` (curl y navegador) → **307 server-side** a `/analyze`; en el navegador la barra queda en `/analyze` con h1 «Pega algo. Lo desenreda.», sin flash de contenido de `/` (`05-*.png`).
4. Entrar directo a `/analyze` limpio → textarea vacío (`""`), header + h1 + campo + aviso de privacidad COMPLETO (dos frases) (`01-*.png`).
5. Nav: «el campo» → `href=/analyze` con `aria-current=page`; «historial» sin current; Wordmark «devtools — inicio» → `/`.
6. Sembrar `sessionStorage['devtools:pending-input']` con la cabecera `Authorization: Bearer <JWT>` (185 chars) y navegar a `/analyze` → **auto-análisis**: cadena `jwt.decode` + `json` visible, sin pulsar nada; el input aparece en el campo (`02-*.png`).
7. Control negativo de privacidad (medido en el navegador real): `location.search=""`, `location.hash=""`, `href` NO contiene el marcador del payload `eyJzdWIiOiIxIiwibmFt` ni `Bearer`.
8. `sessionStorage['devtools:pending-input']` tras el consumo = `null` (clave BORRADA).
9. Recargar `/analyze` → campo vacío, sin cadena: NO re-analiza (`03-*.png`).
10. Input manual (typed) de un JWT en `/analyze` → cadena `jwt → json` sin botón (14.1); URL sigue limpia (`04-*.png`).
11. Consola y errores del navegador (prod) → **vacías** (`browser-console.txt`).
12. `pnpm test:e2e` → **28 passed** (`e2e.txt`), incluida la nueva `analyze-pending.spec.ts` (@f5) y las specs reapuntadas a `/analyze`.

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | `/analyze` sirve la experiencia de hoy; input → `jwt → json` (14.1, sin botón) | Chain `jwt.decode`+`json` al teclear; sin botón | 04-*.png | OK |
| 2 | `/analyze` directo sin pending → campo vacío funcional | Textarea `""`, header/h1/campo/aviso completo | 01-*.png | OK |
| 3 | Pending en sessionStorage + navegar a `/analyze` → auto-analiza | Cadena sin acción; campo con el input | 02-*.png | OK |
| 4 | Clave borrada; recargar NO re-analiza | `getItem`=null; reload → campo vacío, sin cadena | 03-*.png | OK |
| 5 | **Privacidad**: URL sin input (ni query ni fragment) | `search=""`, `hash=""`, sin marcador ni `Bearer` | eval paso 7 | OK |
| 6 | `/` redirige a `/analyze` (307, sin flash) | 307 server-side; barra en `/analyze`, h1 correcto | 05-*.png | OK |
| 7 | Nav «el campo» activa en `/analyze`; Wordmark → `/` | `aria-current=page`; Wordmark href=`/` | snapshot/eval | OK |
| 8 | «Ir al campo» → `/analyze`; «Reabrir» = diálogo in situ | Diff + e2e (history.spec.ts:148 nav, :203-211 dialog) | e2e.txt | OK |
| 9 | `pnpm gate` + `pnpm test:e2e` verdes | 674 unit / 60 files; 28 e2e | gate.txt, e2e.txt | OK |

## Coste real
$0 — sin APIs de pago (motor puro + Postgres local, sin red externa). Estimado: $0.

## Veredicto
**PASS** — `/analyze` reproduce la experiencia de hoy sin cambio visual; el input pendiente viaja por sessionStorage, se consume una sola vez y **jamás toca la URL** (search/hash vacíos, sin marcador del payload), verificado en la barra real del build de producción. Redirección `/` → `/analyze` server-side sin flash; nav con `aria-current` correcto; consola de prod limpia; gate y e2e (28, incl. la nueva `@f5`) verdes.

Notas / rarezas:
- Verificado contra el BUILD DE PRODUCCIÓN (no `next dev`) por la rareza conocida de hidratación de esta máquina; el prod build exige `TRUST_PROXY=1` (instrumentation hook) — sin él arranca en 500, esperado, no es defecto de T5.1.
- El intento de paste real vía `navigator.clipboard.writeText` fue denegado por permiso del navegador headless; el 14.1 se comprobó con input tecleado (misma ruta de auto-análisis sin botón) y el path de pegado/immediate queda cubierto por el consumo del pending (mismo disparo) y por f1.spec.ts CU1.
