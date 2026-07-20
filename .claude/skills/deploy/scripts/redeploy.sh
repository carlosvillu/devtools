#!/usr/bin/env bash
# Redeploy a producción. Detecta solo dónde corre (ver _lib.sh):
#
#   · Modo LOCAL  — el agente YA está en el VPS de producción: actualiza main,
#     reconstruye las imágenes, levanta, conecta al Caddy central y verifica.
#   · Modo REMOTE — el agente está en una máquina de desarrollo: sincroniza el
#     código con el VPS (git push + pull, o rsync) y ejecuta ESTE MISMO script
#     allí en modo local. Un solo camino de deploy, dos puntos de entrada.
#
# Si la verificación final falla, el script falla — un deploy no está hecho
# porque los contenedores arranquen, sino porque la app responda desde fuera.
#
# Uso:  ./redeploy.sh                # autodetecta el modo
#       ./redeploy.sh --rsync       # (remote) envía el árbol local tal cual, sin git
#       ./redeploy.sh --local|--remote   # fuerza el modo
#       ./redeploy.sh --no-sync     # (local) no toques git: despliega lo que hay
#       ./redeploy.sh --allow-dirty # (local) permite desplegar con el árbol SUCIO
#
# Cuándo --rsync: cuando quieres probar en producción algo que aún no está
# pusheado (legítimo, pero deja huella "+sin-commitear" en .deployed para que
# verify.sh delate la deriva). El camino canónico es git: el bucle SÍ hace push.
set -euo pipefail

SYNC="git"; NO_SYNC=0; ALLOW_DIRTY=0
for arg in "$@"; do
  case "$arg" in
    --local)  export DEPLOY_MODE=local ;;
    --remote) export DEPLOY_MODE=remote ;;
    --rsync)  SYNC="rsync" ;;
    --no-sync) NO_SYNC=1 ;;
    --allow-dirty) ALLOW_DIRTY=1 ;;
    *) echo "flag desconocida: $arg" >&2; exit 1 ;;
  esac
done

. "$(cd "$(dirname "$0")" && pwd)/_lib.sh"
cd "$ROOT"

write_footprint() { # $1 = sha a registrar
  write_vps "$REMOTE_DIR/.deployed" <<EOF
sha=$1
at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
by=$(git config user.email 2>/dev/null || echo desconocido)
EOF
}

# ═══ MODO REMOTE: sincronizar y delegar en el VPS ═════════════════════════════
if [ "$MODE" = "remote" ]; then
  step "Modo REMOTE (máquina de desarrollo → $VPS_SSH)"

  if [ "$SYNC" = "git" ]; then
    [ -n "$(git status --porcelain)" ] && \
      warn "hay cambios sin commitear que NO viajarán por git (usa --rsync si quieres desplegarlos)"
    step "1/2 · git push y actualización del checkout del VPS"
    git push origin main
    run_vps "cd $REMOTE_DIR && git fetch origin && git checkout main && git pull --ff-only"
    step "2/2 · Ejecutando el deploy EN el VPS (modo local)"
    exec ssh -o BatchMode=yes "$VPS_SSH" \
      "cd $REMOTE_DIR && DEPLOY_MODE=local .claude/skills/deploy/scripts/redeploy.sh --no-sync"
  else
    # rsync: el remoto queda idéntico al árbol local. Se excluye lo que no debe
    # viajar: dependencias y builds (se reconstruyen en la imagen), el .git, y
    # CRÍTICAMENTE el .env — los secretos de producción viven SOLO en el VPS y
    # un rsync los machacaría con los de desarrollo.
    if [ -n "$(git status --porcelain)" ]; then
      warn "cambios sin commitear: se desplegarán igualmente (rsync envía el árbol tal cual)"
      git status --short | head -10
    fi
    step "1/2 · rsync del árbol local al VPS"
    rsync -az --delete \
      --exclude '.git' --exclude 'node_modules' --exclude '.next' --exclude 'dist' \
      --exclude '.env' --exclude '.env.*' \
      --exclude 'test-results' --exclude 'playwright-report' \
      ./ "$VPS_SSH:$REMOTE_DIR/"
    DIRTY=$([ -n "$(git status --porcelain)" ] && echo '+sin-commitear' || echo '')
    write_footprint "$(git rev-parse --short HEAD)$DIRTY"
    step "2/2 · Ejecutando el deploy EN el VPS (modo local, sin tocar git)"
    # `--allow-dirty` es OBLIGATORIO aquí: rsync acaba de dejar el árbol del VPS
    # idéntico al local —con lo sin commitear incluido, que es EL PROPÓSITO de este
    # modo—, así que la guarda de árbol limpio abortaría el deploy legítimo. En la
    # rama `git` de arriba NO se pasa: allí el árbol del VPS sale de `git pull` y
    # debe estar limpio.
    exec ssh -o BatchMode=yes "$VPS_SSH" \
      "cd $REMOTE_DIR && DEPLOY_MODE=local .claude/skills/deploy/scripts/redeploy.sh --no-sync --allow-dirty"
  fi
fi

# ═══ MODO LOCAL: estamos EN el VPS ════════════════════════════════════════════
step "Modo LOCAL (este host ES producción: $REMOTE_DIR)"

# ── Guarda de árbol limpio ────────────────────────────────────────────────────
# La imagen se construye desde el ÁRBOL DE TRABAJO (`COPY . .`), no desde HEAD.
# Con el árbol sucio se despliega lo que haya sin commitear —código que nadie ha
# revisado ni verificado— y lo único que lo delataba era un `+sin-commitear` en
# `.deployed`, que se lee DESPUÉS del deploy y no lo impide.
# Pasó de verdad el 2026-07-19: un deploy se llevó a producción una tarea a medio
# revisar (con un 500 que se arregló horas más tarde). Con un humano lanzando el
# script es recuperable; con el bucle desplegando solo, es cómo se cuela código sin
# verificar. Va ANTES del `if NO_SYNC` a propósito: `--no-sync` («despliega lo que
# hay») es justo el caso más expuesto.
if [ "$ALLOW_DIRTY" = "0" ] && [ -n "$(git status --porcelain)" ]; then
  echo "" >&2
  echo "  ✗ ABORTADO: el árbol de trabajo tiene cambios sin commitear." >&2
  echo "" >&2
  echo "  Este script construye la imagen desde el ÁRBOL (COPY . .), no desde HEAD:" >&2
  echo "  desplegaría código que nadie ha revisado ni verificado, y .deployed solo" >&2
  echo "  lo delataría a posteriori con '+sin-commitear'." >&2
  echo "" >&2
  git status --short | head -10 >&2
  echo "" >&2
  echo "  Commitea (o stashea) y repite. Si el árbol sucio es DELIBERADO:" >&2
  echo "      .claude/skills/deploy/scripts/redeploy.sh --allow-dirty" >&2
  exit 1
fi

if [ "$NO_SYNC" = "0" ]; then
  step "1/5 · Actualizando main"
  if git remote get-url origin >/dev/null 2>&1; then
    git fetch origin
    branch=$(git rev-parse --abbrev-ref HEAD)
    [ "$branch" = "main" ] || { warn "HEAD está en '$branch', no en main — checkout a main"; git checkout main; }
    git pull --ff-only
  else
    warn "sin remote 'origin': se despliega el árbol tal cual"
  fi
  DIRTY=$([ -n "$(git status --porcelain)" ] && echo '+sin-commitear' || echo '')
  write_footprint "$(git rev-parse --short HEAD)$DIRTY"
fi

step "2/4 · Reconstruyendo imágenes y levantando servicios"
# --build reconstruye; up -d recrea solo lo que cambió. Las migraciones se
# aplican solas al arrancar web (con lock) — por eso el healthcheck da margen.
$(compose) up -d --build

step "3/4 · Esperando a que $WEB_SERVICE esté 'healthy'"
web_container="${COMPOSE_PROJECT}-${WEB_SERVICE}-1"
for i in $(seq 1 30); do
  state=$(docker inspect --format '{{.State.Health.Status}}' "$web_container" 2>/dev/null || echo "starting")
  case "$state" in
    healthy)   ok "$WEB_SERVICE: healthy (tras $((i * 5))s)"; break ;;
    unhealthy) bad "$WEB_SERVICE: UNHEALTHY — abortando"
               $(compose) logs --tail 40 "$WEB_SERVICE"; exit 1 ;;
    *)         printf '  %s: %s… (%ss)\n' "$WEB_SERVICE" "$state" "$((i * 5))"; sleep 5 ;;
  esac
  [ "$i" = "30" ] && { bad "timeout esperando healthy"; exit 1; }
done

step "4/4 · Bloque del dominio en el Caddy central"
# SITE_FILE / OWNED_SITE_FILE los deriva _lib.sh.
#
# `installed` = "¿ha escrito ESTA ejecución el site file?". La reversión de más abajo se
# condiciona a esta bandera y NO a que exista un `.bak` en disco: el `.bak` es estado
# persistente de deploys anteriores que nadie limpia, así que usarlo como proxy haría
# que un validate roto POR OTRO PROYECTO reinstalara una generación CADUCADA de nuestro
# fichero (p. ej. una anterior a T3.1, sin el `request_header @not_cloudflare`), con
# `exit 1` y sin recargar: nadie lo nota hasta el siguiente reinicio de Caddy. Justo el
# daño diferido que este bloque existe para evitar.
installed=0
had_previous=0
mkdir -p "$CADDY_DIR/sites"
site_file="$SITE_FILE"
if [ -f "$OWNED_SITE_FILE" ]; then
  # El proyecto TIENE site file propio en el repo ⇒ es la fuente de verdad y se
  # RECONCILIA en cada deploy (no "se crea si no existe"). Por qué importa: el
  # bloque puede llevar controles de seguridad —p. ej. borrar un CF-Connecting-IP
  # que no venga de un rango de Cloudflare— y un fichero que solo se crea la
  # primera vez deja el control fuera para siempre en cualquier proyecto ya
  # desplegado, en silencio y sin que ningún deploy lo delate.
  #
  # Contrapartida asumida: una edición A MANO del fichero del VPS se pierde en el
  # siguiente deploy. Es deliberado — con site file propio, los añadidos (handle
  # SSE con flush_interval -1, encode gzip…) van en el fichero del REPO, versionados.
  if cmp -s "$OWNED_SITE_FILE" "$site_file" 2>/dev/null; then
    ok "$site_file ya coincide con deploy/$DOMAIN.caddy"
  else
    # `if` y no `[ … ] && cp`: bajo `set -e`, un test falso como última orden de la
    # rama abortaría el deploy justo cuando el fichero NO existe (el primer deploy).
    if [ -f "$site_file" ]; then cp "$site_file" "$site_file.bak"; had_previous=1; else had_previous=0; fi
    cp "$OWNED_SITE_FILE" "$site_file"
    installed=1
    ok "instalado $site_file desde deploy/$DOMAIN.caddy (del repo)"
  fi
elif [ ! -f "$site_file" ]; then
  # Primera vez: crea el site block. El Caddyfile central debe hacer
  # `import sites/*.caddy`. TLS lo gestiona Caddy (o Cloudflare por delante).
  #
  # header_up X-Forwarded-For {client_ip}: SOBRESCRIBE el header con la IP del
  # socket en vez de añadirla a lo que mandara el cliente — deja de ser
  # client-controllable. Es un control de seguridad, no una casualidad de
  # defaults, y por eso es explícito. OJO: si hay Cloudflare delante, esa IP es
  # la de Cloudflare, NO la del visitante: la real va en CF-Connecting-IP y es
  # la que debe usar cualquier rate-limit (SKILL.md §Topología).
  #
  # Si el proyecto tiene SSE, este bloque NO basta: la ruta de eventos necesita
  # su propio handle con flush_interval -1 y sin encode. Lo limpio es copiar este
  # bloque a `deploy/$DOMAIN.caddy` en el REPO y añadirlo allí: a partir de ese
  # momento el fichero del repo manda y se reinstala en cada deploy.
  cat > "$site_file" <<EOF
$DOMAIN {
	reverse_proxy $CADDY_UPSTREAM {
		header_up X-Forwarded-For {client_ip}
	}
}
EOF
  installed=1 # (had_previous sigue 0: esta rama solo entra si el fichero NO existía)
  ok "creado $site_file → $CADDY_UPSTREAM"
fi
# Un cambio en el site file no surte efecto hasta recargar. Valida SIEMPRE antes.
#
# Si el validate falla, hay que DESHACER la instalación antes de salir. El Caddy es
# COMPARTIDO con los demás proyectos del VPS y el daño sería DIFERIDO: el reload no
# llegó a dispararse, así que el borde sigue sirviendo y parece que no ha pasado nada,
# pero el fichero roto se queda en $CADDY_DIR/sites/ y a partir de ahí (a) el deploy
# del VECINO falla en este mismo validate por culpa de NUESTRO fichero, y (b) un
# reinicio de $CADDY_CONTAINER o del host se lleva por delante el borde entero,
# dominios de terceros incluidos. Un fichero que no valida no se deja instalado jamás.
if ! docker exec "$CADDY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile; then
  if [ "$installed" = "1" ]; then
    bad "el Caddyfile NO valida — revirtiendo $site_file para no romper el Caddy compartido"
    # `had_previous` (de ESTA ejecución) y no `[ -f "$site_file.bak" ]`: si no había
    # fichero antes, se retira el nuestro entero en vez de resucitar un .bak viejo.
    if [ "$had_previous" = "1" ]; then cp "$site_file.bak" "$site_file"; else rm -f "$site_file"; fi
    if docker exec "$CADDY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile; then
      ok "revertido: el Caddyfile vuelve a validar (el borde queda como estaba)"
    else
      bad "el Caddyfile SIGUE sin validar tras revertir — el problema NO es de este dominio"
    fi
  else
    # No hemos tocado el site file en esta ejecución ⇒ el fallo es de OTRO fichero del
    # Caddy compartido. Revertir aquí solo serviría para reinstalar una generación vieja
    # de la nuestra (que sí valida) y perder controles ya desplegados. No se toca nada.
    bad "el Caddyfile NO valida y esta ejecución NO tocó $site_file: el fallo viene de otro"
    echo "     → míralo entero: docker exec $CADDY_CONTAINER caddy validate --config /etc/caddy/Caddyfile"
  fi
  exit 1
fi
if ! docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile; then
  bad "el Caddyfile valida pero NO recarga — el dominio puede no estar enrutado"
  exit 1
fi

step "Verificando desde fuera"
# La única prueba que vale: ¿responde la app en internet? Si esto falla, el
# deploy NO está hecho, por muy verdes que estén los contenedores.
exec "$ROOT/.claude/skills/deploy/scripts/verify.sh"
