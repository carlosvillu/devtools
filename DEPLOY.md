# Despliegue de devtools

Producción: **https://devtools.carlosvillu.dev**

Este documento describe la topología y el procedimiento. **El camino a producción
es siempre la skill `deploy`** (`.claude/skills/deploy/`): nada de SSH a mano ni de
editar el Caddy central por libre. Si algo no encaja con el VPS, el bug es de la
skill y se arregla ahí.

## Topología (PRD §10)

```
visitante ──HTTPS──▶ Cloudflare (proxy naranja, SSL Full strict)
                      │
                      ▼  HTTPS al origen 80.190.75.149
                 Caddy central del VPS (contenedor edge-caddy, network_mode: host)
                      │  termina TLS para TODOS los subdominios del VPS
                      ▼  HTTP por LOOPBACK
                 127.0.0.1:3110  ──▶  contenedor devtools-web (Next standalone, :3000)
                                          │ red interna del compose
                                          ▼
                                     devtools-postgres (16) · volumen devtools-pg-prod-data
```

- **devtools no gestiona TLS ni lleva reverse proxy propio.** El Caddy central es
  compartido por todos los proyectos del VPS.
- **La web publica SOLO en `127.0.0.1:$WEB_PORT`.** Un puerto abierto por Docker en
  `0.0.0.0` **se salta UFW** (Docker escribe sus propias reglas de iptables por
  debajo del firewall) y sacaría la app de detrás de Caddy.
- **Bloque de puertos de devtools: 3110–3119** (`WEB_PORT=3110`), reservado en el
  registro de `~/AGENTS.md` §3 del VPS. El 3118 lo usa la suite E2E.
- Postgres **no publica ningún puerto**: la web lo alcanza por el nombre de
  servicio de la red del compose (`postgres:5432`).

## Configuración

| Fichero                                 | Qué es                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| `deploy.env`                            | Config de despliegue, **committeada y sin secretos** (dominio, puerto, rutas, Caddy) |
| `docker-compose.prod.yml`               | Los dos servicios de producción                                                      |
| `.env.prod.example`                     | Plantilla del `.env` de producción (literales `*-not-a-secret`)                      |
| `deploy/devtools.carlosvillu.dev.caddy` | **El site file del Caddy central, versionado aquí**                                  |
| `.env` **en el VPS**                    | Las credenciales REALES. Gitignored. Nunca se sincroniza desde local                 |

> ⚠ En el VPS, el `.env` de la **raíz del repo** ES el `.env` de producción
> (`REMOTE_DIR` apunta a la raíz y el compose hace `env_file: .env`). Si tiene una
> contraseña fuerte generada en vez de un literal `*-not-a-secret`, **no se pisa**.

### Migraciones

**On-boot con lock** (decisión de T0.3): la web aplica las migraciones de
`packages/db/drizzle` al arrancar, dentro de un `pg_advisory_lock`
(`instrumentation.ts`). No hay paso de deploy separado; el `start_period` del
healthcheck da margen al primer arranque.

## Trust boundary y rate limits (PRD §10/§11, T3.1)

Hay **dos** proxies delante, así que la IP del socket que ve la app es siempre
`127.0.0.1`. Los tres rate limits del producto (login, signup, `/api/analyze`) se
llevan por la IP **real** del visitante, y esa llega en **`CF-Connecting-IP`**
(`X-Forwarded-For`, que Caddy sobrescribe con `{client_ip}`, vale la IP del _borde_
de Cloudflare — agruparía a miles de visitantes en un puñado de claves).

Pero `CF-Connecting-IP` es un header como cualquier otro y **el origen es
alcanzable sin pasar por Cloudflare** (basta el `Host:` correcto contra
`80.190.75.149`). Usarlo sin más solo cambiaría una clave falsificable por otra.
Por eso el site file **borra el header cuando la conexión no viene de un rango
publicado de Cloudflare**:

```caddy
@not_cloudflare not remote_ip <rangos de https://www.cloudflare.com/ips-v4/ y /ips-v6/>
request_header @not_cloudflare -CF-Connecting-IP
```

Cadena de precedencia en la app (`apps/web/src/server/client-ip.ts`):
`CF-Connecting-IP` → última entrada de `X-Forwarded-For` (la pone Caddy) →
`LOOPBACK_KEY`. **Nunca una clave `'unknown'` compartida por clientes de
internet**: ninguno llega al proceso sin pasar por Caddy. La app solo lee esos
headers si el compose le declara `TRUST_PROXY=1`.

**Mantenimiento**: los rangos de Cloudflare cambian pocas veces al año, y los dos
sentidos no son igual de benignos:

- Cloudflare **añade** un rango y aquí falta → fallo **degradado y seguro**: esas
  peticiones pierden el header y caen al XFF (peor granularidad, nunca un bypass).
- Cloudflare **retira** un rango y aquí se queda → fallo **abierto**: esa IP se
  reasigna a un tercero, `@not_cloudflare` deja de casar y un `CF-Connecting-IP`
  forjado desde allí sobrevive.

Por eso la revisión anual mira las **retiradas**, no solo las altas: la lista debe
ser un reflejo de la publicada, no un superconjunto acumulado. La sonda de forja de
`verify.sh` corre en cada deploy pero solo desde la IP del que despliega: detecta
que el control desaparezca entero, **no** un rango caducado suelto.
Alternativa sin lista, deuda consciente: **Authenticated Origin Pulls** (mTLS de
Cloudflare al origen), que exige tocar el panel de CF y el Caddy central compartido.

## Desplegar

Desde la raíz del repo, con el árbol **limpio** (la imagen se construye del árbol y
el script aborta si está sucio):

```bash
.claude/skills/deploy/scripts/redeploy.sh
```

Autodetecta el modo (LOCAL si corre en el VPS, REMOTE si no) y hace, en orden:
sincronizar el código → huella del commit en `.deployed` → `docker compose up -d
--build` → esperar a que `web` esté `healthy` (las migraciones corren aquí) →
**instalar `deploy/devtools.carlosvillu.dev.caddy` en `~/infra/caddy/sites/`** →
`caddy validate` + `caddy reload` → verificar desde fuera. Si la verificación
falla, el script falla: un deploy no está hecho porque arranquen los contenedores.

> El site file del VPS se **reinstala desde el repo en cada deploy**. Editarlo a
> mano allí no sirve de nada: el siguiente deploy lo pisa. Los cambios van en
> `deploy/devtools.carlosvillu.dev.caddy`.

Otros comandos de la skill: `verify.sh` (estado end-to-end), `rollback.sh`,
`backup.sh`, `logs.sh`.

## Comprobaciones tras desplegar

1. `https://devtools.carlosvillu.dev` responde 200 con certificado válido.
2. Login funciona y el ejemplo de JWT del PRD §6.5 devuelve su cadena.
3. `ss -ltn | grep 3110` → escuchando **solo en `127.0.0.1`**; desde fuera,
   `http://80.190.75.149:3110` no responde.
4. El rate limit distingue dos `CF-Connecting-IP` distintas, en vez de contar a
   todo Cloudflare como un único cliente.

## Trampas ya pagadas

- **`postgres` solo aplica `POSTGRES_PASSWORD` con el data dir vacío.** Cambiar la
  variable con un volumen ya inicializado da `28P01` y migraciones en bucle. Rotar
  contraseña = `ALTER ROLE`, nunca solo editar el `.env`. (Ha mordido tres veces.)
- **Un 525 justo después del primer deploy de un dominio no es config rota**: es la
  carrera de aprovisionamiento del certificado. Reintenta y mira los logs de Caddy.
- **`next start` no resuelve rutas como `next dev`**: cualquier verificación seria
  ejercita `docker compose up` real, no el modo dev.
