# T0.2 · Docker Compose de desarrollo con Postgres — VERIFICACIÓN

- **Fecha**: 2026-07-18
- **Verifier**: subagente escéptico, contexto fresco
- **Veredicto**: **PASS**
- **Entorno**: VPS de producción compartido. Se operó SIEMPRE con `docker compose -f docker-compose.dev.yml` (proyecto `devtools`). Vecinos `ugc-factory-*` y `edge-caddy` intactos antes y después.

## Código bajo prueba

Working tree (sin commitear) = el código que corrió. Diff relevante de T0.2:
`docker-compose.dev.yml` (nuevo), `apps/web/src/server/db-health.ts` (nuevo),
`apps/web/src/app/api/health/route.ts` (mod), `packages/core/src/contracts/health.ts` (mod -> `{ok, db}`),
`.env.example` + `apps/web/.env.example` (nuevos). `.env` y `apps/web/.env` existían y están **gitignored**.

## Verificación LITERAL del planning

| # | Esperado | Observado | OK |
|---|----------|-----------|----|
| 1 | `docker compose -f docker-compose.dev.yml up -d` levanta Postgres | `devtools-postgres-1` creado y `healthy` | OK |
| 2 | `curl /api/health` -> `{ok:true, db:true}` | `{"ok":true,"db":true}` http 200 | OK |
| 3 | Parar SOLO el Postgres de devtools | `docker compose ... stop postgres` -> `Exited (0)`, web viva | OK |
| 4 | `curl /api/health` -> `{ok:true, db:false}` sin tumbar la app | `{"ok":true,"db":false}` http 200 x3 (web sigue sirviendo) | OK |
| 5 | (extra) Recuperación al volver Postgres | tras `start postgres` -> `{"ok":true,"db":true}` http 200 | OK |

Comandos y salidas crudas: `01-compose-up.txt`, `02-compose-ps.txt`, `04-health-db-true.txt`,
`05-postgres-stop.txt`, `06-health-db-false.txt`, `08-health-recovery.txt`.

## Reproducción (respetando la trampa de dos .env)

    cp .env.example .env                    # (ya existía) POSTGRES_* + POSTGRES_HOST_PORT para compose
    cp apps/web/.env.example apps/web/.env   # (ya existía) DATABASE_URL para la web en el HOST
    docker compose -f docker-compose.dev.yml up -d
    cd apps/web && PORT=3000 pnpm dev        # web corre en el HOST, no en compose
    curl -s localhost:3000/api/health        # {"ok":true,"db":true}
    docker compose -f docker-compose.dev.yml stop postgres
    curl -s localhost:3000/api/health        # {"ok":true,"db":false}  (web viva, 200)

## Seguridad del bind (loopback, no 0.0.0.0)

`docker port devtools-postgres-1` -> `5432/tcp -> 127.0.0.1:5433`
`inspect .NetworkSettings.Ports` -> `{"5432/tcp":[{"HostIp":"127.0.0.1","HostPort":"5433"}]}`
Publicado SOLO en loopback y en el puerto de host **5433** (no 5432, no roza al vecino). No se salta UFW. OK
Evidencia: `02-compose-ps.txt`.

## Seccion 11 — la sonda de BD no filtra secretos

`apps/web/src/server/db-health.ts` (leído): ante fallo emite
`getRequestLogger().warn({ err_name: errName }, 'db_health_probe_failed')` — solo `err_name`.
Provocado db:false, el log real muestra únicamente `request_id`, `route`, `err_name: "Error"`.
Scan del log (`grep -iE 'devtools-dev-not-a-secret|postgres://|DATABASE_URL|password'`) -> **sin coincidencias**. OK
Evidencia: `07-db-log-s11.txt`, `03-web-dev.log`.

## Sin secretos en el árbol

`.env.example` (raíz) y `apps/web/.env.example` contienen literales de desarrollo
(`devtools-dev-not-a-secret`), no credenciales reales. `.env` y `apps/web/.env` -> `git check-ignore` exit 0 (ignorados). OK

## Gate

`pnpm gate` desde raíz, exit 0. Los 6 pasos verdes:
lint (eslint) · typecheck (4 workspaces) · format:check (prettier OK) · knip · readme:status:check (OK) ·
test -> **Test Files 42 passed (42) · Tests 436 passed (436)**. Coincide con lo reportado por el implementer.
Evidencia: `10-gate.txt`.

## Limpieza / no-regresión

`docker compose -f docker-compose.dev.yml down` -> contenedor y red `devtools_*` eliminados;
web del host parada (nada en :3000); volumen `devtools-pg-data` persiste (permitido).
Vecinos tras terminar: `ugc-factory-worker-1`, `ugc-factory-web-1` (healthy), `ugc-factory-postgres-1` (healthy),
`edge-caddy` — todos vivos. OK Evidencia: `09-teardown.txt`.

## Coste real

$0 (sin APIs de pago; solo Docker + Postgres local + gate).

## Rarezas

- La web quedó lista ~1s tras `pnpm dev` porque Next compila `/api/health` on-demand al primer request; el primer curl real devolvió 200. No afecta al resultado.
- El working tree de T0.2 está sin commitear en el momento de la verificación (esperado: el commit lo hace el bucle tras el PASS). El código verificado es el del árbol.

## Veredicto

**PASS** — la Verificación literal del planning se cumple en el sistema real levantado, el bind es loopback:5433, la seccion 11 no filtra secretos, no hay credenciales reales en el árbol, el gate está verde (436 tests) y los vecinos del VPS quedaron intactos.
