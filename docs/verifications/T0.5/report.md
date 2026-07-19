# Verificación T0.5 — E2E de fase F0

- **Tarea**: T0.5 · E2E de fase F0 (`planning.md`)
- **Fecha**: 2026-07-19
- **Ejecutor**: agente `verifier` (contexto fresco) · agent-browser (npx) · sesión `t0.5`
- **Sistema**: commit `0d1579a` + único fichero sin commitear `apps/web/e2e/phases/f0.spec.ts` (el entregable de T0.5). `git diff` de tracked = vacío al terminar.
- **Stack**: `docker compose -f docker-compose.dev.yml` (proyecto `devtools-dev`, Postgres `127.0.0.1:5433`, volumen `devtools-pg-data` RECREADO desde cero) + `pnpm dev` en :3000. Producción (`devtools-web-1`, `devtools-postgres-1`, `devtools-pg-prod-data`) y vecinos (`ugc-factory-*`, `edge-caddy`) INTACTOS.

## Verificación esperada (literal de planning.md)

> con `docker compose -f docker-compose.dev.yml up -d` desde cero y BD vacía: `pnpm db:migrate` crea el esquema, `pnpm gate` en verde, `pnpm test:e2e` en verde, y el recorrido signup → refresh → logout se completa en el navegador. `/api/health` devuelve `{ok:true, db:true}`.

## Pasos ejecutados

1. Snapshot del estado previo de la BD de dev (`01-db-before-wipe.txt`): existían el esquema `drizzle` (con `__drizzle_migrations`) y las 3 tablas.
2. **Desde cero de verdad**: `docker compose -f docker-compose.dev.yml -p devtools-dev down -v` → volumen `devtools-pg-data` ELIMINADO (`02`). Verificado que los volúmenes/contenedores de producción y vecinos sobreviven intactos.
3. `up -d` + espera a `healthy` (`03`). BD vacía confirmada con `\dn` + `\dt`: **solo el esquema `public`, sin esquema `drizzle`, sin tablas** (`04`). El gotcha del journal superviviente queda descartado por observación, no por confianza.
4. `pnpm db:migrate` (`05`) y `\dn`/`\dt`/`\di` después (`06`): 3 tablas + 7 índices + `drizzle.__drizzle_migrations` creados donde no había nada.
5. `pnpm gate` (`07`) — verde.
6. `pnpm test:e2e` (`08`) — verde, con la spec de fase ejecutándose.
7. Filtrado por tags en las dos direcciones (`09`).
8. **Control negativo propio** sobre el assert del logout (`10`), restauración y `git diff` limpio.
9. **Anti-flake**: la spec de fase 5 veces seguidas (`11`).
10. `pnpm dev` + `/api/health` (`12`).
11. Recorrido **signup → refresh → logout** a mano en el navegador con agent-browser (`13`, `14-0*.png`), incluida la **reinyección manual de la cookie revocada**, y consola del navegador (`15`).

## Resultado observado vs esperado

| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | Desde cero + BD vacía, `pnpm db:migrate` **crea** el esquema | Antes: solo `public`, 0 tablas, **sin esquema `drizzle`**. Después: `user`, `session`, `history_entry` + 7 índices (`user_email_lower_uq`, `history_entry_user_created_idx`, `session_user_id_idx`, `session_expires_at_idx`, 3 pkey) + `drizzle.__drizzle_migrations` | `04`, `05`, `06` | ✅ (con hallazgo A) |
| 2 | `pnpm gate` en verde | lint + typecheck + format + knip + readme:status + **50 ficheros / 501 tests passed**, exit 0 | `07-gate.txt` | ✅ |
| 3 | `pnpm test:e2e` en verde, incluida `phases/f0.spec.ts` | **18/18 passed** en 1.3 m; `f0.spec.ts:41` verde y visible en el listado | `08-e2e-full.txt` | ✅ |
| 4 | Tags `@f0 @phase` presentes **y funcionando** | `--grep @phase` → selecciona f0.spec (7 tests, 2 ficheros); `--grep-invert @phase` → la EXCLUYE (11 tests, 3 ficheros); `--grep @f0` → f0.spec + auth.spec (5 tests) | `09-tag-filtering.txt` | ✅ |
| 5 | La spec NO es un duplicado de `auth.spec.ts` | Confirmado leyendo ambas: `auth.spec.ts` son 4 tests independientes con cuenta propia y refresh **tras signup**; f0.spec es UN `test()` con estado acumulado (una cuenta: signup → logout intermedio → login por formulario → refresh **tras login** → logout). El assert de reinyección de cookie revocada **no existe en `auth.spec.ts`** | lectura + `09` | ✅ |
| 6 | El assert del logout prueba revocación EN SERVIDOR (control negativo repetido por mí) | Ver sección siguiente: rojo exactamente en la línea 122 | `10-negative-control-RED.txt` | ✅ |
| 7 | Sin flakes | 5/5 verdes consecutivas (`--repeat-each=5 --workers=1`) | `11-flake-repeat5.txt` | ✅ |
| 8 | Recorrido signup → refresh → logout **en el navegador** | Ver sección del recorrido | `13`, `14-01..05` | ✅ |
| 9 | `/api/health` → `{ok:true, db:true}` | `HTTP/1.1 200` + `{"ok":true,"db":true}` | `12-health.txt` | ✅ (con hallazgo B) |

## Control negativo del assert del logout (ejecutado por el verifier, no heredado)

**Qué saboteé**: en `apps/web/src/server/session.ts`, `revokeSession()` — sustituí `if (sessionId) await deleteSession(db, sessionId);` por una lectura de la cookie sin efecto. Es decir, el logout **limpia la cookie pero NO borra la fila** de `session`.

**Qué se puso rojo** (`10-negative-control-RED.txt`):

```
Error: expect(locator).toBeVisible() failed
Locator: getByRole('link', { name: /^entrar$/i })
> 122 |       await expect(page.getByRole('link', { name: /^entrar$/i })).toBeVisible();
```

Lo relevante y comprobado: el fallo cae en el step **`logout: la sesión queda revocada en el SERVIDOR, no solo en la UI`**, en la línea **122** — la que sigue a la reinyección de la cookie revocada. Los beats anteriores (incluido el **logout intermedio**, que pasa solo con borrar la cookie y por tanto NO discrimina) siguieron en verde. El assert aísla exactamente la revocación en servidor: **no es un test que no pueda fallar**.

**Restauración**: `git checkout apps/web/src/server/session.ts` → `git diff` vacío (solo quedan sin trackear el entregable `f0.spec.ts` y este directorio de evidencia). Re-verde confirmado por la tanda anti-flake de 5 ejecuciones POSTERIOR a la restauración.

## Recorrido en el navegador (agent-browser, sesión `t0.5`)

Cuenta creada por el verifier (no reutilicé fixtures del implementer): `t05-cua-1784420856@verifier.local`.

| Beat | Observado en pantalla | Captura |
|---|---|---|
| Formulario de alta | `/signup` con Email, Contraseña, «Crear cuenta» | `14-01-signup-form.png` |
| **Signup** | Redirige a `/`; cabecera muestra `t05-cua-1784420856@verifier.local` + «Salir» | `14-02-tras-signup.png` |
| **Refresh** | Tras `reload`, la cabecera sigue mostrando el email + «Salir»: la sesión sobrevive | `14-03-tras-refresh.png` |
| **Logout** | Clic en «Salir» → cabecera muestra «Entrar»; en BD `select count(*) from session` → **0** | `14-04-tras-logout.png` |
| **Reinyección manual de la cookie revocada** | `cookies set devtools_session <id-revocado>` + recarga de `/` → la cabecera muestra **«Entrar»**, no el email | `14-05-cookie-revocada-reinyectada.png` |

La cookie viva capturada antes del logout (`devtools_session=37d402c8-…`) coincidía **exactamente** con el `session.id` de la fila en Postgres: el reinject reproduce a mano, en un navegador real, lo mismo que afirma el assert de la línea 122.

**Consola del navegador** (`15-browser-console.txt`): limpia. Solo `[info]` de React DevTools y `[log]` de HMR/Fast Refresh (ruido propio de `next dev`). `agent-browser errors` → **vacío**.

## Hallazgos (ninguno bloquea el PASS, ambos deben rutearse)

### A — `pnpm db:migrate` tal cual lo documenta el README NO funciona (deuda pre-existente, F0)

`pnpm db:migrate` sin `DATABASE_URL` en el entorno **aborta con exit 1** y no crea nada:

```
db:migrate — falta DATABASE_URL. Exporta la connection string de la BD destino ...
```

Es una salvaguarda **deliberada y documentada** en `packages/db/src/migrate.cli.ts` ("SEGURIDAD (VPS compartido): `DATABASE_URL` es OBLIGATORIA"), y T0.3 verificó su cláusula equivalente exactamente igual: exportando la variable (`docs/verifications/T0.3/report.md`). Por eso la cláusula 1 se da por cumplida.

Lo que sí es un hueco real: **el quickstart del `README.md` (líneas ~80-84) está roto para un recién llegado incluso tras `cp .env.example .env` en ambos sitios** — nada inyecta `DATABASE_URL` en el proceso de `pnpm db:migrate` (el script es un `tsx src/migrate.cli.ts` pelado, sin dotenv; el `.env` de la raíz no tiene `DATABASE_URL` y el de `apps/web` solo lo lee Next). La app arranca igual porque las migraciones corren **on-boot** (decisión de T0.3), pero el comando publicado en la portada del repo falla.

**Ruteo**: deuda dejada por T0.2/T0.3 sobre una superficie pública, detectada en el cierre de fase. Arreglo de una línea (documentar el `DATABASE_URL=… pnpm db:migrate`, o cargar dotenv en el script). Decide el bucle/usuario si el sign-off de F0 espera a ese fix.

### B — Deriva local entre los dos `.env` (no committeado, no de F0)

`/.env` tiene `POSTGRES_PASSWORD=b0ecfe44…` (aleatoria) mientras `apps/web/.env` conserva la del ejemplo (`devtools-dev-not-a-secret`). Con el volumen recreado, la BD nace con la contraseña de la raíz y **la web no puede conectar**: las migraciones on-boot fallaron los 5 reintentos y `/api/health` devolvió `{"ok":true,"db":false}`.

- Verificado que la causa es la contraseña (no el puerto): desde el host, la del ejemplo da `password authentication failed`; la de la raíz conecta.
- **Transparencia**: para el recorrido levanté `pnpm dev` con `DATABASE_URL` explícita apuntando a la contraseña real. Con eso, migraciones on-boot OK y `/api/health` → `{ok:true, db:true}`.
- Ambos `.env` están gitignored y la deriva no existiría en un `cp .env.example .env` limpio (los dos ejemplos son coherentes entre sí); la contraseña aleatoria la introdujo trabajo posterior de deploy (F1/T1.9), no F0. Por eso **no bloquea**, pero conviene re-sincronizar los dos ficheros del VPS para no volver a tropezar.

### C — Rarezas menores (no bloquean)

- `next dev` emite en cada compilación un aviso de **código propio**: `./apps/web/src/instrumentation.ts:41 — A Node.js API is used (process.cwd) which is not supported in the Edge Runtime`, acompañado de `Ecmascript file had an error`. Las migraciones on-boot se aplican correctamente pese al aviso, no llega a la consola del navegador y no aparece en el stack E2E (build de producción), pero es ruido de código propio en el arranque de desarrollo: merece un vistazo (probablemente basta acotar el módulo al runtime Node).
- Convención de tags: `e2e.md` §10 prescribe la forma `{ tag: ['@f0'] }` (la que usa `auth.spec.ts`), mientras `f0.spec.ts` y `f1.spec.ts` los ponen en el título del `describe`. Funciona y el filtrado se comprobó en ambos sentidos, pero el proyecto tiene hoy dos estilos conviviendo.

## Coste real

**$0** — sin APIs de pago. Todo el trabajo es local (Docker, Vitest, Playwright, agent-browser sobre localhost).

## Estado del entorno al terminar

- **Levanté**: `devtools-dev-postgres-1` (recreado desde cero; **el volumen `devtools-pg-data` anterior se descartó**, tal como exigía la Verificación) y un `pnpm dev` en :3000, ya detenido.
- **Paré**: solo procesos propios, identificados por PID vía el puerto 3000 (evitando deliberadamente un `pkill` amplio que habría matado los `next-server` de los vecinos).
- **No toqué**: `devtools-web-1`, `devtools-postgres-1`, `devtools-pg-prod-data`, `ugc-factory-*`, `edge-caddy`. Producción sigue viva.

## Veredicto

**PASS** — el suelo de F0 se sostiene entero: sobre una BD **demostrablemente vacía** (esquema `drizzle` incluido) las migraciones crean el esquema completo, `pnpm gate` da 501/501, `pnpm test:e2e` da 18/18 con la spec de fase incluida, los tags `@f0 @phase` filtran de verdad en ambos sentidos, el recorrido signup → refresh → logout se completa en un navegador real con consola limpia, y `/api/health` responde `{ok:true, db:true}`.

El entregable resiste el escrutinio: la spec de fase **no** es un duplicado de `auth.spec.ts` (journey con estado acumulado, refresh tras login, y el assert de reinyección de cookie revocada que ninguna otra spec tiene), su assert clave **puede fallar** —el control negativo propio lo puso rojo exactamente en la línea 122, con el logout intermedio aún en verde— y no es flaky (5/5).

Queda pendiente de ruteo el hallazgo A (quickstart del README roto, deuda de T0.2/T0.3 sobre superficie pública) y de saneamiento el hallazgo B (deriva local entre los dos `.env` del VPS).
