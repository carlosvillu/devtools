# Verificación T1.8 — Infra de producción + imagen que sirve F1 en local (VPS)

- **Tarea**: T1.8 · Infra de producción + imagen que sirve F1 en local (VPS) (`planning.md`, «Deploy temprano de F1»)
- **Fecha**: 2026-07-18
- **Ejecutor**: agente `verifier` · superficie backend (curl/`ss`/`ps`/`psql`, sin navegador) · proyecto compose `devtools`
- **Sistema**: HEAD `09f1bab` + working tree con la infra de T1.8 sin commitear (untracked `apps/web/Dockerfile`, `docker-compose.prod.yml`, `.dockerignore`, `.env.prod.example`, `apps/web/src/deploy-infra.test.ts`; modificado `apps/web/next.config.ts`). Imagen `devtools-web:latest` (263 MB) construida desde ESE working tree vía `COPY . .` (`.dockerignore` poda `.env`/`.git`/docs). `.env` de prueba creado con `cp .env.prod.example .env` (literales `*-not-a-secret`), gitignored (`git check-ignore .env` ✓), eliminado al terminar.

## Verificación esperada (literal de planning.md)
> en el VPS, `docker compose -f docker-compose.prod.yml up -d --build` (proyecto `devtools`, con el compose de dev abajo) levanta `web` **healthy** en `127.0.0.1:3110`; `curl 127.0.0.1:3110/` sirve la app y el recorrido de 14.1 (pegar el JWT de §6.5 → cadena `jwt → json`) funciona contra la imagen de PROD (no `next dev` — gotcha de `next start`); `/api/health` = `{ok:true, db:true}`. Controles negativos: `ss -ltn` muestra el 3110 **solo en loopback** y desde fuera `http://80.190.75.149:3110` no responde; los vecinos `ugc-factory-*` + `edge-caddy` intactos; entorno restaurado al bajar.

## Pasos ejecutados
1. `pnpm gate` → verde. 43 ficheros / 448 tests, incluye `apps/web/src/deploy-infra.test.ts`. (`02-gate.log`)
2. `pnpm test:e2e` (ruta NO-standalone, `next build && next start` sin `NEXT_OUTPUT`, puerto 3118) → 13 tests verdes (otra mitad de «ambas rutas verdes»). (`03-e2e.log`)
3. 0 contenedores `devtools-*` antes de levantar prod.
4. `docker compose -f docker-compose.prod.yml -p devtools up -d --build` → build ok (imagen 263 MB); postgres Healthy, web Healthy en `127.0.0.1:3110->3000`. (`01-build.log`, `04-up.log`, `05-ps.txt`)
5. `/api/health` → 1ª corrida `{"ok":true,"db":false}` por volumen sucio (ver Rareza); tras reset del volumen propio de devtools, primer arranque canónico → `{"ok":true,"db":true}`. (`06-curls.txt`, `07-curls-clean.txt`)
6. `GET /` → HTTP 200, `<title>devtools</title>`; CSS `/_next/static/chunks/24v4fd44lv5wl.css` → HTTP 200 (prueba de `COPY .next/static`). (`07-curls-clean.txt`)
7. `POST /api/analyze` con `{"input":"Bearer eyJ…"}` (JWT §6.5) contra PROD → `jwt.decode → json.format → terminal no_transform`, notas paso 0 = expiración en lenguaje natural. Idéntica a §6.5. (`08-analyze.json`)
8. Controles negativos (`09-negatives.txt`): `ss -ltn` → `127.0.0.1:3110` (bind loopback; `0.0.0.0:*` es wildcard de peer, no bind); externo `http://80.190.75.149:3110/` → HTTP 000 / exit 7 (refused); `ps` → postgres `5432/tcp` sin puerto de host.
9. Standalone: `server.js` en `/app/apps/web/server.js` + `.next/static` presente; arranca con `node apps/web/server.js`.
10. Teardown `down` (sin `-v`) → 4 vecinos `ugc-factory-*` + `edge-caddy` intactos, 0 `devtools-*`, `.env` eliminado. (`10-teardown.txt`, `11-neighbors-after.txt`)

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | `web` healthy en `127.0.0.1:3110` | healthy, `127.0.0.1:3110->3000/tcp` | 05-ps.txt | ✅ |
| 2 | `/api/health` = `{ok:true, db:true}` | `{"ok":true,"db":true}` (volumen limpio) | 07-curls-clean.txt | ✅ |
| 3 | `curl /` sirve la app (200, title, estáticos) | 200, title devtools, CSS 200 | 07-curls-clean.txt | ✅ |
| 4 | Recorrido 14.1 contra PROD → `jwt → json` | `jwt.decode → json.format → terminal`, notas exp | 08-analyze.json | ✅ |
| 5 | `ss -ltn` → 3110 solo loopback | `LISTEN 127.0.0.1:3110` únicamente | 09-negatives.txt | ✅ |
| 6 | Externo `80.190.75.149:3110` no responde | HTTP 000 / refused (exit 7) | 09-negatives.txt | ✅ |
| 7 | Postgres NO publica puerto de host | `5432/tcp` interno, sin mapeo host | 05-ps.txt, 09-negatives.txt | ✅ |
| 8 | Vecinos intactos, entorno restaurado | 4 vecinos vivos, 0 `devtools-*` | 11-neighbors-after.txt | ✅ |
| 9 | Imagen standalone (server.js, arranca) | `server.js` presente, boot ok | paso 9 | ✅ |
| 10 | Gate + e2e verdes (ambas rutas) | gate 448 tests, e2e 13 tests | 02-gate.log, 03-e2e.log | ✅ |

## Coste real
$0 — sin APIs de pago (build Docker + curl/ss/psql locales).

## Veredicto
**PASS** — la imagen standalone construida desde el working tree sirve F1 en `127.0.0.1:3110`, `/api/health` da `{ok:true,db:true}` en primer arranque canónico, el recorrido 14.1 reproduce la cadena `jwt→json` de §6.5, y todos los controles negativos del bind (loopback-only, externo refused, postgres sin puerto de host) se cumplen. Vecinos intactos y entorno restaurado.

### Rareza (no bloquea el PASS; riesgo operativo real)
La 1ª corrida dio `{"ok":true,"db":false}`. Causa raíz: el volumen `devtools-pg-prod-data` había sido creado por una corrida previa e inicializado con otra password. `POSTGRES_PASSWORD` de `postgres:16` solo aplica con data dir vacío; con volumen persistente la password scram no se re-sincroniza con el `.env`. La web conecta por la red del compose (172.x → `host all all all scram-sha-256`) y recibió `28P01 password authentication failed`, mientras `psql` por `127.0.0.1` pasaba por `trust`. Como `/api/health` devuelve 200 aun con `db:false` (diseño T0.2), el healthcheck marcaba el contenedor healthy con la BD caída → «contenedor verde, BD caída». NO es defecto de la config de T1.8: el arranque limpio (escenario de VPS limpio, objetivo de la tarea) da `db:true`. Recomendación T1.9/T3.1: documentar en la skill deploy que rotar la password de Postgres exige recrear el volumen (o `ALTER ROLE`), y revisar que el healthcheck de la web contemple `db` en prod cuando lleguen las migraciones on-boot (T0.3), donde este gotcha sí sería bloqueante.
