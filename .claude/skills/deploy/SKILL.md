---
name: deploy
description: Despliegue y operación de {{PROJECT_NAME}} en el VPS de producción — redeploy, rollback, verificación end-to-end, backups, logs y troubleshooting. Úsala SIEMPRE que el usuario diga "despliega", "deploy", "sube esto a producción", "actualiza el servidor", "¿está caído?", "¿está bien producción?", "mira los logs del VPS", "haz un backup", "vuelve atrás", o pregunte por el estado de producción; también antes de tocar nada del VPS por SSH, del Caddy central o del docker-compose.prod.yml. No la uses para el docker-compose.dev.yml (desarrollo local).
---

# Deploy — {{PROJECT_NAME}} en producción

Ejecuta, no investigues: los scripts son la vía canónica. Toda la configuración
del despliegue vive en **`deploy.env`** (raíz del repo, sin secretos, committeado)
— si tiene placeholders `{{…}}` sin rellenar, el deploy aún no está aprovisionado:
rellenarlo es la primera tarea de deploy (o del bootstrap).

**Todas las rutas de abajo son literales desde la raíz del repo.** (Ojo: existe
también un `scripts/` en la raíz, que es otra cosa.)

| El usuario dice… | Ejecuta |
|---|---|
| "despliega", "sube esto a producción" | `.claude/skills/deploy/scripts/redeploy.sh` |
| "¿está bien?", "¿se ha caído?", "no me fío" | `.claude/skills/deploy/scripts/verify.sh` |
| "vuelve atrás", "deshaz el deploy", algo se rompió | `.claude/skills/deploy/scripts/rollback.sh` |
| "haz un backup" | `.claude/skills/deploy/scripts/backup.sh` |
| "¿qué hay desplegado?" | `.claude/skills/deploy/scripts/rollback.sh --status` |
| "mira los logs" | §Logs |

`redeploy.sh` y `rollback.sh` terminan llamando a `verify.sh`: **un deploy que no
se puede verificar falla**, en vez de aparentar éxito.

## Autodetección: ¿dónde estoy corriendo?

Los scripts detectan solos si el agente corre **EN el VPS de producción** o en una
**máquina de desarrollo**, y adaptan el flujo (la lógica vive en `scripts/_lib.sh`):

| Señal (por orden) | Modo |
|---|---|
| `DEPLOY_MODE` en deploy.env/entorno, o flag `--local`/`--remote` | el que digas |
| Existe `/etc/deploy-target` (marcador; lo crea la tarea que aprovisiona el VPS) | `local` |
| La raíz del repo == `REMOTE_DIR` de deploy.env | `local` |
| `hostname` == `VPS_HOSTNAME` (si está definido) | `local` |
| Nada de lo anterior | `remote` (el caso conservador) |

- **Modo `local`** (el agente YA está en el VPS): actualiza `main` (`git pull
  --ff-only`), reconstruye las imágenes del compose de prod, levanta, aplica
  migraciones (van solas al arrancar web, con lock), publica el proyecto en el
  **Caddy central** del VPS (site block en `CADDY_DIR/sites/DOMAIN.caddy` con
  validate+reload, proxyando a `127.0.0.1:WEB_PORT`) y verifica desde fuera.
- **Modo `remote`** (máquina de desarrollo): sincroniza el código con el VPS —
  por defecto `git push` + `git pull --ff-only` allí (el bucle SÍ puede hacer
  push); con `--rsync` envía el árbol local tal cual (para probar trabajo sin
  pushear; deja huella `+sin-commitear`) — y después ejecuta **este mismo script
  en el VPS en modo local**. Un solo camino de deploy, dos puntos de entrada.

## Topología

> **La fuente de verdad del VPS es su propio `~/AGENTS.md`** (inventario, puertos,
> convenciones, trampas). Léelo antes de tocar producción: manda sobre esta skill.
> Si algo estructural cambia (un puerto, un sitio, una convención), **actualízalo
> allí en el mismo cambio** — lo exige ese fichero.

```
Internet → Cloudflare (DNS + proxy naranja, SSL Full strict)
         → Caddy central  (CADDY_CONTAINER, CADDY_DIR — COMPARTIDO por todos los proyectos del VPS)
             · network_mode: host — es el ÚNICO proceso en 80/443
         → 127.0.0.1:WEB_PORT → web (Next standalone)
                                ├── postgres:16  (sin puerto publicado)
                                └── worker       (solo si el módulo cola existe)
```

- **El TLS no es de este proyecto**: lo termina el Caddy central. El
  `docker-compose.prod.yml` no lleva reverse proxy. El enrutado se toca en
  `CADDY_DIR/sites/DOMAIN.caddy` y hay que **recargar** (§Caddy) — `redeploy.sh`
  crea el bloque la primera vez y recarga siempre.
- **El Caddy central corre en `network_mode: host`**, así que **no existe red
  docker compartida** con los proyectos: un contenedor en modo host **no se puede
  conectar a una red bridge** (docker lo rechaza: *"container sharing network
  namespace with another container or host cannot be connected to any other
  network"*). Por eso Caddy llega a la app por **loopback**, nunca por nombre de
  servicio docker: `reverse_proxy web:3000` no resolvería jamás.
- **web publica SOLO en `127.0.0.1:WEB_PORT`, nunca en `0.0.0.0`.** Un puerto
  abierto por docker **se salta UFW** (docker escribe sus propias reglas de
  iptables por debajo del firewall) y saca la app de detrás de Caddy.
- **Cada proyecto reserva un bloque de 10 puertos** en el registro de
  `~/AGENTS.md` (desde el 3100). `WEB_PORT` en `deploy.env` es el del proyecto.
  Reservarlo allí es parte de la tarea de deploy, no un detalle administrativo:
  es lo que impide que dos proyectos colisionen en el mismo puerto.
- **La IP real del cliente NO es la del socket ni la de `x-forwarded-for`.** Con
  Cloudflare en proxy naranja hay **dos** proxies delante, y el origen solo ve
  IPs de Cloudflare. El site file que genera `redeploy.sh` fija
  `header_up X-Forwarded-For {client_ip}` — eso deja el header fuera del control
  del cliente (necesario), pero su valor es **la IP de Cloudflare**, no la del
  visitante. **La IP real llega en `CF-Connecting-IP`**: es la que debe usar todo
  rate-limit por IP y todo log de origen. Un rate-limit que confíe en
  `x-forwarded-for` detrás de Cloudflare agrupa a TODOS los visitantes en un
  puñado de IPs de borde: castiga a inocentes y el atacante lo esquiva rotando de
  borde. Si algún día se quita el proxy naranja, `x-forwarded-for` vuelve a ser
  la fuente correcta — decide con la topología delante, no por costumbre.
- **Los secretos viven solo en el VPS** (`REMOTE_DIR/.env`, gitignored). El modo
  `--rsync` excluye `.env` a propósito; `deploy.env` (committeado) no lleva
  ninguno.

## Desplegar

```bash
.claude/skills/deploy/scripts/redeploy.sh            # autodetecta el modo; sync por git
.claude/skills/deploy/scripts/redeploy.sh --rsync    # (remote) el árbol local tal cual
.claude/skills/deploy/scripts/redeploy.sh --no-sync  # (local) no toques git: lo que hay
```

Qué hace, en orden: sincroniza el código → deja huella del commit desplegado en
`REMOTE_DIR/.deployed` → reconstruye las imágenes → espera a que web esté
`healthy` → asegura el site block del Caddy central y recarga → **verifica desde
fuera**.

**No corre `pnpm gate`.** Correr los tests es decisión tuya antes de desplegar.

**Guarda de árbol limpio (modo local): `redeploy.sh` ABORTA con exit 1 si `git
status --porcelain` no está vacío.** La imagen se construye desde el ÁRBOL
(`COPY . .`), no desde HEAD: con el árbol sucio se despliega trabajo sin
commitear ni verificar, y el único rastro sería un `+sin-commitear` en
`.deployed`, que se lee tarde. Ya ocurrió una vez (T2.2 pre-arreglos llegó a
producción así). Si necesitas desplegar trabajo sin commitear, ese es el
propósito EXPLÍCITO de `--rsync` (que pasa `--allow-dirty`); con la rama git,
commitea o stashea primero.

**Las migraciones se aplican solas** al arrancar web (con lock). Por eso el deploy
puede tardar: el healthcheck ya lo contempla.

**Downtime**: unos segundos al recrear los contenedores. Si existe el módulo cola,
los jobs en curso sobreviven (su estado vive en Postgres; pg-boss re-entrega).

## Verificar

```bash
.claude/skills/deploy/scripts/verify.sh            # completo (5 capas)
.claude/skills/deploy/scripts/verify.sh --quick    # solo el dominio público
```

Comprueba cinco cosas **por separado**, y esa separación es lo que convierte un
síntoma en un diagnóstico: dominio público, **origen saltándose el CDN**,
contenedores, **qué commit corre** (vs. tu HEAD) y salud (errores en logs, disco,
antigüedad del último backup). Lo que espera de `GET /` se configura en
`VERIFY_ROOT_EXPECT` ( `"200"`, o `"307:/login"` si la raíz exige sesión).

### Cómo leer un fallo

| Falla… | y pasa… | Entonces |
|---|---|---|
| dominio público | el origen | **Es el CDN, no el servidor.** No toques el VPS. Bucle de redirecciones ⇒ zona en SSL «Flexible» ⇒ el humano la pone en **Full (strict)** |
| dominio público | nada más | Mira el Caddy central (§Caddy) y luego los contenedores |
| health con `db:false` | la app responde | web vive pero no habla con Postgres: logs de `web` + estado de `postgres` |
| web `unhealthy` | postgres `healthy` | Suele ser el arranque: web migra al boot. Logs de `web` |
| postgres `unhealthy` | — | La BD no arranca. Logs de `postgres`; mira el disco |
| "hay deriva" (SHA ≠ HEAD) | todo lo demás | Producción corre otro código. ¿Se desplegó con `--rsync` desde otro árbol, o alguien no pusheó? |
| "ningún backup en 48 h" | todo lo demás | El cron murió. Fuerza uno con `backup.sh` y revisa `crontab -l` en el VPS |

## Volver atrás

```bash
.claude/skills/deploy/scripts/rollback.sh          # al commit anterior al desplegado
.claude/skills/deploy/scripts/rollback.sh <sha>    # a uno concreto
.claude/skills/deploy/scripts/rollback.sh --status # qué hay desplegado ahora
```

Hace backup antes de tocar nada. En modo remote despliega el commit destino con
`git archive` (no mueve tu working tree); en modo local hace `git checkout
--detach` del destino (el siguiente redeploy vuelve a `main`).

**Lo crítico**: el rollback de código **no deshace la base de datos**. Las
migraciones son de ida. Volver atrás te deja código viejo contra un schema nuevo —
lo cual suele funcionar (una columna nueva es invisible para el código viejo),
pero **no** si la migración borró o renombró algo que el código viejo usa. El
script detecta si el tramo traía migraciones (`MIGRATIONS_DIR`) y exige
confirmación explícita (`SI` interactivo, o `--yes` si lo decide quien invoca).
Si la migración era destructiva, el rollback de código no basta: hay que restaurar.

## Backups y restauración

```bash
.claude/skills/deploy/scripts/backup.sh            # fuerza uno AHORA y prueba que es restaurable
.claude/skills/deploy/scripts/backup.sh --list     # lista los existentes
```

El cron del VPS debería hacer un `pg_dump` diario en `BACKUP_DIR` (retención ~14
días) — instalarlo es parte de la tarea de aprovisionamiento. `backup.sh` además
abre el dump con `pg_restore --list`: un backup que nadie ha probado a leer no es
un backup.

**Restaurar** (destructivo — se pierde todo lo ocurrido desde ese dump; confírmalo
con el humano antes). En el VPS, desde `REMOTE_DIR`:

```bash
docker compose -f docker-compose.prod.yml stop web worker   # que nadie escriba (worker solo si existe)
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  < BACKUP_DIR/<el-dump>.dump
docker compose -f docker-compose.prod.yml start web worker
```

## Logs

```bash
# app (JSON de pino; correlaciona por request_id)
docker compose -f docker-compose.prod.yml logs --tail 50 web     # en el VPS
# desde desarrollo: ssh $VPS_SSH 'cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml logs --tail 50 web'

# el borde (TLS, enrutado, certificados) — en el VPS
cd $CADDY_DIR && docker compose logs --tail 50 caddy
```

## Caddy

Un cambio en el site file (`CADDY_DIR/sites/DOMAIN.caddy`) no surte efecto hasta
recargarlo. Valida antes (en el VPS):

```bash
docker exec $CADDY_CONTAINER caddy validate --config /etc/caddy/Caddyfile && \
docker exec $CADDY_CONTAINER caddy reload   --config /etc/caddy/Caddyfile
```

El Caddyfile central debe tener `import sites/*.caddy`; cada proyecto del VPS
aporta su fichero. `redeploy.sh` lo crea si no existe y recarga siempre. El
bloque que genera es el mínimo correcto:

```caddy
<dominio> {
	reverse_proxy 127.0.0.1:<WEB_PORT> {
		header_up X-Forwarded-For {client_ip}
	}
}
```

`header_up X-Forwarded-For {client_ip}` **sobrescribe** el header en vez de
añadirse a lo que mandara el cliente: sin él, `x-forwarded-for` sigue siendo en
parte controlable por quien llama. (Ojo: sobrescribir no te da la IP del
visitante si hay Cloudflare delante — §Topología.)

### Site file propio del proyecto: `deploy/<DOMAIN>.caddy`

Cuando el bloque mínimo no basta —SSE, `encode gzip`, o **controles de seguridad
en el borde**— el fichero se versiona en el repo como `deploy/<DOMAIN>.caddy`.
Si existe, `redeploy.sh` lo **instala en `$CADDY_DIR/sites/` en cada deploy**
(guardando un `.bak` del anterior) y luego valida + recarga. Si no existe, se
mantiene el comportamiento genérico de crear-si-falta.

Por qué reconciliar y no crear-si-falta: un control de seguridad que solo se
escribe la primera vez **no llega jamás** a un proyecto ya desplegado, y ningún
deploy lo delata. Contrapartida asumida y explícita: **una edición a mano del
fichero del VPS se pierde en el siguiente deploy** — con site file propio, los
añadidos van en el fichero del repo.

**Si el proyecto tiene SSE**, el bloque mínimo no basta: la ruta de eventos
necesita su propio `handle` con `flush_interval -1` y **sin `encode`** (comprimir
un `event-stream` también lo bufferiza, y los eventos llegan a ráfagas). Igual con
`encode gzip` para el resto del sitio. Eso va en `deploy/<DOMAIN>.caddy`.

### Si —y solo si— hay un CDN delante: que el cliente no se fabrique la cabecera

**Esto aplica a proyectos detrás de un CDN en modo proxy** (aquí, Cloudflare
naranja). **Sin CDN delante no hay nada de esto que hacer**: la fuente correcta es
`x-forwarded-for` tal como lo sobrescribe Caddy, y cablear el rate limit a un
`CF-Connecting-IP` que nadie pone sería peor que no hacer nada — el header no
existiría, todo el tráfico caería en una clave común y cualquiera podría
inventárselo. Decide con tu topología delante (§Topología), no por copiar esta
sección.

Con CDN, el rate limit debe ir por la cabecera que inyecta el borde
(`CF-Connecting-IP`), pero **el origen sigue siendo alcanzable sin pasar por él**
(basta el `Host:` correcto contra la IP del VPS), así que esa cabecera la puede
mandar cualquiera: usarla sin más solo cambia una clave spoofeable por otra. Caddy
**no puede reconstruirla** (su `{client_ip}` es el borde del CDN); lo que sí puede
es garantizar que solo sobrevive la que puso el CDN, borrándola cuando la conexión
no viene de un rango publicado suyo:

```caddy
@not_cloudflare not remote_ip <rangos de https://www.cloudflare.com/ips-v4/ y /ips-v6/>
request_header @not_cloudflare -CF-Connecting-IP
```

Coste: la lista hay que refrescarla de vez en cuando, y **los dos sentidos no son
igual de benignos**. Un rango que Cloudflare AÑADE y falte aquí es un fallo
degradado y seguro (esas peticiones pierden el header y caen al XFF: peor
granularidad, nunca un bypass). Un rango que Cloudflare RETIRA y siga aquí es un
fallo **abierto**: al reasignarse a un tercero, un `CF-Connecting-IP` forjado desde
esa IP sobrevive. La lista debe ser un reflejo de la publicada, no un superconjunto
acumulado. Alternativa sin lista: Authenticated Origin Pulls (mTLS de CF al origen),
que exige tocar el panel de Cloudflare y el Caddy central compartido.

Y como esa línea del site file no la cubre ningún test en proceso —el borde es otra
capa—, `verify.sh` trae una **sonda de forja**: golpea el origen saltándose el CDN
con la cabecera falsa y rotada, y comprueba que el rate limit igualmente salta. Si
el borrado desapareciera, cada petición sería una clave nueva y el muro no saltaría
nunca: la sonda lo delata en el propio deploy.

Se enciende declarando `FORGERY_PROBE_PATH` (ruta POST con rate limit por IP que
cuente la petición **antes** de leer el cuerpo) y `FORGERY_PROBE_LIMIT` (su umbral
por ventana) en `deploy.env`. El interruptor es declarativo **a propósito**: si se
dedujera del site file, borrar el control apagaría también su detector y la sonda
pasaría verde sin mirar. Un proyecto sin CDN simplemente no las declara.

La app, además, solo debe leer esos headers si se le declara que hay un proxy de
confianza delante (`TRUST_PROXY=1` en el compose de prod): el mismo código
desplegado a pelo no debe creerse ningún header.

## Acceso

`ssh $VPS_SSH` (solo clave; `BatchMode` debe funcionar — los scripts lo asumen).

**`sudo` pide una contraseña que no tienes.** Normalmente no la necesitas: el
usuario del VPS está en el grupo `docker`. Si algo exige sudo de verdad (paquetes
del sistema, UFW, `/etc/deploy-target`), prepara el comando exacto y **pídeselo
al humano**; no intentes rodearlo.

## Trampas conocidas (genéricas, ya mordieron)

**En el VPS, el `.env` de la RAÍZ del repo ES el `.env` de PRODUCCIÓN.**
`REMOTE_DIR` apunta a la raíz del repo y `docker-compose.prod.yml` hace
`env_file: .env` — no hay dos ficheros. Causó el incidente de producción del
2026-07-19: se «corrigió» como deriva de dev y se pisó la contraseña real de
Postgres (~7 min con `db:false`). Regla operativa: si ese `.env` tiene una
contraseña fuerte generada en vez de un literal `*-not-a-secret`, **no se
pisa** — y esa discrepancia es la señal de que tu premisa sobre el fichero está
mal. Para desarrollar en el VPS: `docker-compose.dev.yml` (proyecto
`devtools-dev`, otro contenedor, otro volumen, credenciales propias).

**`postgres` solo aplica `POSTGRES_PASSWORD` con el data dir VACÍO.** Con un
volumen ya inicializado, cambiar la variable no cambia nada: la web arranca
pidiendo la contraseña nueva contra la vieja → `28P01`, migraciones fallando en
bucle y `/api/health` con `db:false` (la app viva). Ha mordido TRES veces
(T1.8, T1.9, incidente del 2026-07-19). Rotar contraseña = `ALTER ROLE` o
recrear el volumen, nunca solo editar el `.env`.

**Un 525 justo después del primer deploy de un dominio NO es config rota.**
`verify.sh` puede correr antes de que el Caddy central termine de obtener el
primer certificado (carrera de aprovisionamiento observada en el go-live:
el cert llegó ~3 s después del verify). Reintenta tras unos segundos y mira los
logs de Caddy (`certificate obtained successfully`) antes de tocar nada.

**`VAR: ${VAR:-}` en compose no significa "sin valor": significa cadena vacía.**
La variable se define igualmente aunque no esté en el `.env`, y el código que
distingue *ausente* de *vacío* se rompe (`Number('') === 0` ha sembrado ceros
donde tocaba un default). Las opcionales van por `env_file`, no interpoladas.

**Un `502` o un bucle de redirecciones en el borde no significa que el origen
esté roto.** Verifica el origen **por separado** (`verify.sh` lo hace) antes de
tocar el servidor.

**Volúmenes `ro` vs. `rw`**: si un servicio monta un volumen en solo-lectura y
otro código escribe ahí (uploads, exports), en producción dará `EROFS` aunque en
dev funcione. Antes de desplegar un cambio que escribe a disco, comprueba los
mounts del compose de prod. Es una decisión de producto, no un parche silencioso.
