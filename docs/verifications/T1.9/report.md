# Verificación T1.9 — Go-live de F1 (Caddy central + dominio)

- **Tarea**: T1.9 · Go-live de F1 (`planning.md`, «Deploy temprano de F1»)
- **Fecha**: 2026-07-18
- **Veredicto**: **PASS** (cierra la mitad «servir en público» del criterio 14.10)
- **Código en producción**: HEAD `adaf6d4` (F1 completa), desplegado 2026-07-18T17:18:38Z vía la skill `deploy` (`redeploy.sh`, modo local — el bucle corre EN el VPS).

## Prerequisito externo (⚠) — resuelto
- El usuario dio el **OK explícito** para publicar («dale tú mismo») y ejecutó `redeploy.sh` en sesión.
- Cloudflare: `devtools.carlosvillu.dev` resuelve por Cloudflare (IPs de borde) y el origen apunta al VPS `80.190.75.149`. **SSL en modo correcto** confirmado por evidencia: el 525 inicial fue una CARRERA de aprovisionamiento (Caddy obtuvo el cert de Let's Encrypt ~3 s DESPUÉS de que `verify.sh` corriera), no un fallo de configuración — un modo SSL «Flexible» habría dado bucle de redirección, no 525, y el reintento tras el cert dio 200. Cloudflare dejó pasar el challenge HTTP-01 (5 `served key authentication` desde IPs de CF → `authorization finalized: valid` → `certificate obtained successfully` para `devtools.carlosvillu.dev`).

## Verificación (literal de planning.md)
> desde **fuera** del VPS, `https://devtools.carlosvillu.dev` sirve F1 con certificado válido y el recorrido de 14.1 (pegar un JWT → cadena) funciona en producción; `verify.sh` (5 capas) en verde.

## Evidencia
1. **Dominio público** (`curl https://devtools.carlosvillu.dev`):
   - `GET /` → **HTTP 200**, `<title>devtools</title>`.
   - `GET /api/health` → `{"ok":true,"db":true}` (la BD responde end-to-end a través de Cloudflare→Caddy→web→postgres).
2. **14.1 en producción** (`POST https://devtools.carlosvillu.dev/api/analyze` con el JWT de §6.5):
   - Cadena `jwt.decode` → `json.format`; paso 0 `detections=[jwt 0.95, text 0.01]`, `output` = header+payload+signature, `notes=["exp: 2025-07-16T00:00:00Z (caducó hace 1 año)"]`. Idéntica a §6.5, servida por la imagen de PROD (no `next dev`).
3. **`verify.sh` (5 capas)** — todas verdes salvo el backup (fuera de alcance, T3.2):
   - Dominio público: `GET /` 200 ✓; `/api/health` ok:true,db:true ✓.
   - Origen directo (sin CDN) `https://80.190.75.149`: certificado TLS VÁLIDO ✓; responde 200 ✓.
   - Contenedores: `devtools-web-1` healthy ✓, `devtools-postgres-1` healthy ✓, `edge-caddy` corriendo ✓.
   - Código desplegado = HEAD `adaf6d4` ✓ (sin deriva).
   - Salud: sin errores en los últimos 200 registros ✓; disco 27% ✓.
   - ✗ **Único rojo**: «ningún backup en 48 h» — es el cron de `pg_dump`, alcance de **T3.2** (no de T1.9). No bloquea el criterio de go-live.

## Topología del go-live
- Site block del Caddy central creado en `/home/developer/infra/caddy/sites/devtools.carlosvillu.dev.caddy` → `reverse_proxy 127.0.0.1:3110` con `header_up X-Forwarded-For {client_ip}` (validado + recargado). El TLS lo termina el Caddy central (Let's Encrypt vía HTTP-01, que Cloudflare deja pasar); devtools no gestiona TLS propio.
- Web publicada SOLO en `127.0.0.1:3110` (loopback); Postgres sin puerto de host (red interna del compose). Vecinos `ugc-factory-*` intactos.
- `.env` de producción (gitignored) con password de Postgres fuerte generada; volumen `devtools-pg-prod-data` inicializado limpio.

## Pendiente (anotado, NO bloquea T1.9)
- **Registro en `~/AGENTS.md`**: la fila de devtools debe pasar a «prod DESPLEGADO 2026-07-18, F1». El sandbox bloquea escrituras fuera del repo; queda como paso manual (o con permiso del usuario). El deploy en sí está registrado en `REMOTE_DIR/.deployed` (footprint de la skill).
- **Rate-limit por `CF-Connecting-IP`** (§10/§11): en producción `X-Forwarded-For` lleva IPs de borde de Cloudflare; la IP real va en `CF-Connecting-IP`. Los rate-limits de `/api/analyze` (T1.4) aún no lo usan → protección DoS gruesa hasta **T3.1**. Para F1 (función pura, sin BD, 128KB→413) es un hueco de hardening, no de datos. Anotado en el planning (T3.1).
- **Backup** (T3.2) y **login en prod** (tras T0.4) cierran en F3 sobre esta misma infra.
