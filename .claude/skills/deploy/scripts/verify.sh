#!/usr/bin/env bash
# Verifica el despliegue DESDE FUERA (como lo ve un usuario real) y, por
# separado, el ORIGEN saltándose el CDN/proxy (Cloudflare o similar).
#
# Por qué las dos capas por separado: un bucle de redirecciones o un 502 en el
# borde NO significa que el origen esté roto (caso clásico: zona de Cloudflare
# en SSL «Flexible» — CF habla HTTP contra un origen que redirige a HTTPS y el
# bucle lo crea el borde). Si solo pruebas el dominio público no sabes CUÁL de
# las dos capas falla; probando ambas, el diagnóstico es inmediato.
#
# Funciona igual desde el VPS (modo local: docker directo) que desde una máquina
# de desarrollo (modo remote: ssh) — _lib.sh decide.
#
# Uso:  ./verify.sh              # verificación completa (5 capas)
#       ./verify.sh --quick      # solo el dominio público (tras un redeploy)
#       ./verify.sh --local|--remote   # fuerza el modo
#
# Salida: exit 0 si todo pasa; 1 si algo falla (imprime QUÉ capa y QUÉ hacer).
set -uo pipefail

QUICK=0
for arg in "$@"; do
  case "$arg" in
    --quick)  QUICK=1 ;;
    --local)  export DEPLOY_MODE=local ;;
    --remote) export DEPLOY_MODE=remote ;;
  esac
done

. "$(cd "$(dirname "$0")" && pwd)/_lib.sh"
set +e  # cada comprobación gestiona su propio fallo

fails=0
okc()  { ok "$1"; }
badc() { bad "$1"; fails=$((fails + 1)); }
head_() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# ── Capa 1: el dominio público (CDN/proxy → Caddy → app) ─────────────────────
head_ "Dominio público — https://$DOMAIN"

# -L NO: queremos ver la redirección cruda, no seguirla. Un bucle se delata aquí
# (código 3xx apuntándose a sí mismo).
root_code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "https://$DOMAIN/" 2>/dev/null)
root_loc=$(curl -sS -o /dev/null -w '%{redirect_url}' --max-time 15 "https://$DOMAIN/" 2>/dev/null)

# VERIFY_ROOT_EXPECT (deploy.env): "200", o "307:/login" si la raíz exige sesión.
exp_code="${VERIFY_ROOT_EXPECT%%:*}"
exp_loc="${VERIFY_ROOT_EXPECT#*:}"; [ "$exp_loc" = "$VERIFY_ROOT_EXPECT" ] && exp_loc=""
if [[ "$root_loc" == "https://$DOMAIN/" ]]; then
  badc "BUCLE DE REDIRECCIONES: / → sí mismo (HTTP $root_code)"
  echo "     → Causa casi segura: la zona del CDN está en SSL «Flexible»."
  echo "       ARREGLO (solo el humano, en el dashboard): SSL/TLS → «Full (strict)»."
elif [ "$root_code" = "$exp_code" ] && { [ -z "$exp_loc" ] || [[ "$root_loc" == *"$exp_loc"* ]]; }; then
  okc "GET / → $root_code${exp_loc:+ → $exp_loc} (esperado)"
else
  badc "GET / → HTTP $root_code${root_loc:+ → $root_loc} (esperado $VERIFY_ROOT_EXPECT)"
fi

health=$(curl -sS --max-time 15 "https://$DOMAIN$HEALTH_PATH" 2>/dev/null)
if [ "$health" = '{"ok":true,"db":true}' ]; then
  okc "GET $HEALTH_PATH → ok:true, db:true (la BD responde end-to-end)"
else
  badc "GET $HEALTH_PATH → ${health:-<sin respuesta>}"
  echo "     → db:false ⇒ la app vive pero NO habla con Postgres (mira los logs de $WEB_SERVICE)."
fi

if [ "$QUICK" = "1" ]; then
  head_ "Resultado"
  [ "$fails" -eq 0 ] && { okc "deploy OK"; exit 0; } || { badc "$fails fallo(s)"; exit 1; }
fi

# ── Capa 2: el ORIGEN, saltándose el CDN ─────────────────────────────────────
# --resolve fuerza a curl a ir a la IP del VPS manteniendo el SNI del dominio,
# así el certificado sigue validando. Si esto pasa y la capa 1 falla, el
# problema es del CDN y NO del servidor.
head_ "Origen directo (sin CDN) — https://$VPS_IP"
origin_code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 \
  --resolve "$DOMAIN:443:$VPS_IP" "https://$DOMAIN/" 2>/dev/null)
tls_ok=$(curl -sS -o /dev/null -w '%{ssl_verify_result}' --max-time 15 \
  --resolve "$DOMAIN:443:$VPS_IP" "https://$DOMAIN/" 2>/dev/null)
[ "$tls_ok" = "0" ] && okc "certificado TLS del origen: VÁLIDO" \
                    || badc "certificado TLS del origen inválido (código ${tls_ok:-?})"
[ "$origin_code" = "$exp_code" ] && okc "origen responde $origin_code (Caddy y la app, vivos)" \
                                 || badc "origen responde HTTP $origin_code (esperado $exp_code)"

# ── Capa 2b: el borde neutraliza un CF-Connecting-IP FORJADO ─────────────────
# Solo para proyectos DETRÁS DE UN CDN que inyecta la IP real del cliente en una
# cabecera (Cloudflare y `CF-Connecting-IP`, el caso de este VPS). Si el rate limit
# se lleva por esa cabecera, el borde tiene que BORRARLA cuando la conexión no viene
# del CDN; si no, el cliente se la fabrica y el muro se esquiva rotándola.
#
# El interruptor es DECLARATIVO (`FORGERY_PROBE_PATH` en deploy.env) y a propósito NO
# se deriva del site file: un gate que se dedujera del artefacto verificado se apagaría
# solo al borrar el control, que es justo el escenario que hay que cazar. Declarado en
# deploy.env + control ausente = FAIL ruidoso. Ningún test en proceso cubre esto: la
# defensa vive en el borde.
if [ -n "$FORGERY_PROBE_PATH" ]; then
  head_ "Trust boundary del borde — CF-Connecting-IP forjado"

  # (i) El fichero que sirve el Caddy es el del repo, byte a byte. Barato y delata
  #     una edición a mano en el VPS (que además el próximo deploy pisaría).
  if [ -f "$OWNED_SITE_FILE" ]; then
    remote_site=$(run_vps "cat $SITE_FILE 2>/dev/null" 2>/dev/null)
    if [ "$remote_site" = "$(cat "$OWNED_SITE_FILE")" ]; then
      okc "el site file instalado coincide con deploy/$DOMAIN.caddy"
    else
      badc "el site file del VPS NO coincide con deploy/$DOMAIN.caddy (¿editado a mano?)"
      echo "     → el próximo redeploy lo reinstalaría desde el repo; revisa cuál quieres."
    fi
  fi

  # (ii) La sonda. Golpea el ORIGEN directamente (--resolve, saltándose el CDN) rotando
  #      una cabecera falsa por petición. Si el borde dejara de borrarla, cada petición
  #      sería una clave NUEVA y el muro no saltaría jamás; como sí la borra, todas caen
  #      en la MISMA clave (la IP real de esta máquina) y aparece un 429.
  #      La ruta debe tener rate limit por IP y contar la petición ANTES de validar el
  #      cuerpo (así la sonda no manda body, no toca la BD y no crea nada). La ventana
  #      expira sola y solo se consume la cuota de la IP de ESTA máquina.
  #      UN SOLO curl con --next: mismo número de peticiones (el número ES el mecanismo),
  #      pero reutilizando la conexión — 65 procesos con handshake TLS propio añadían
  #      15-25 s a cada verify.sh.
  if ! [[ "$FORGERY_PROBE_LIMIT" =~ ^[0-9]+$ ]]; then
    badc "FORGERY_PROBE_PATH está declarado pero FORGERY_PROBE_LIMIT no es un número"
    echo "     → declara ambos en deploy.env (el umbral por ventana de esa ruta)."
    FORGERY_PROBE_LIMIT=0
  fi
  probe_max=$((FORGERY_PROBE_LIMIT + 5))
  probe_args=()
  for i in $(seq 1 "$probe_max"); do
    [ "$i" -gt 1 ] && probe_args+=(--next)
    probe_args+=(-sS -o /dev/null -w '%{http_code}\n' -X POST
      -H "CF-Connecting-IP: 203.0.113.$((i % 250 + 1))" "https://$DOMAIN$FORGERY_PROBE_PATH")
  done
  probe_codes=$(curl --max-time 60 --resolve "$DOMAIN:443:$VPS_IP" "${probe_args[@]}" 2>/dev/null)

  if printf '%s\n' "$probe_codes" | grep -q '^429$'; then
    okc "rotar un CF-Connecting-IP forjado NO esquiva el rate limit (el borde lo borra)"
  else
    badc "AGUJERO: $probe_max peticiones a $FORGERY_PROBE_PATH con CF-Connecting-IP forjado y rotado, ningún 429"
    echo "     → el borde NO está borrando la cabecera: la clave del rate limit es forjable"
    echo "       y los muros por IP se esquivan rotándola."
    echo "     → mira el matcher \`@not_cloudflare\` de $SITE_FILE."
    echo "     → si la ruta o el umbral cambiaron, actualiza FORGERY_PROBE_PATH /"
    echo "       FORGERY_PROBE_LIMIT en deploy.env (declarado: $FORGERY_PROBE_LIMIT)."
    echo "     → códigos observados: $(printf '%s' "$probe_codes" | sort -u | tr '\n' ' ')"
  fi
fi

# ── Capa 3: los contenedores ─────────────────────────────────────────────────
head_ "Contenedores en el VPS ($MODE)"
ps_out=$(run_vps 'docker ps --format "{{.Names}}|{{.Status}}"' 2>/dev/null)
if [ -z "$ps_out" ]; then
  badc "no se pudo consultar Docker ($([ "$MODE" = remote ] && echo "ssh $VPS_SSH" || echo local))"
else
  for svc in $SERVICES; do
    c="${COMPOSE_PROJECT}-${svc}-1"
    line=$(printf '%s\n' "$ps_out" | grep "^$c|" || true)
    if [ -z "$line" ]; then badc "$c NO está corriendo"
    else
      status="${line#*|}"
      case "$status" in
        *unhealthy*) badc "$c → $status" ;;
        Up*)         okc "$c → $status" ;;
        *)           badc "$c → $status" ;;
      esac
    fi
  done
  printf '%s\n' "$ps_out" | grep -q "^$CADDY_CONTAINER|" \
    && okc "$CADDY_CONTAINER → corriendo" || badc "$CADDY_CONTAINER NO está corriendo (nadie termina TLS)"
fi

# ── Capa 4: ¿qué código corre ahí? ───────────────────────────────────────────
# "¿Lo que está en producción es lo que tengo delante?" redeploy.sh deja la
# huella en .deployed; sin ella verías contenedores verdes sin poder afirmar
# qué contienen.
head_ "Código desplegado"
deployed=$(run_vps "cat $REMOTE_DIR/.deployed 2>/dev/null" 2>/dev/null || true)
if [ -z "$deployed" ]; then
  warn "sin huella (.deployed): el último deploy no la dejó — no se puede saber qué corre"
else
  dep_sha=$(printf '%s\n' "$deployed" | sed -n 's/^sha=//p')
  dep_at=$(printf '%s\n' "$deployed" | sed -n 's/^at=//p')
  local_sha=$(git rev-parse --short HEAD 2>/dev/null || echo '?')
  if [ "${dep_sha%%+*}" = "$local_sha" ]; then
    okc "producción = tu HEAD ($dep_sha, desplegado $dep_at)"
  else
    warn "producción corre $dep_sha y tu HEAD es $local_sha (desplegado $dep_at)"
    echo "     → hay deriva: lo que ves aquí NO es lo que sirve el servidor."
  fi
fi

# ── Capa 5: salud, no solo «responde» ────────────────────────────────────────
# "¿Está bien?" y "¿responde?" no son la misma pregunta. Un contenedor healthy
# puede estar escupiendo errores, con el disco lleno o con backups parados.
head_ "Salud"
errs=$(run_vps "cd $REMOTE_DIR && docker compose -p $COMPOSE_PROJECT -f $COMPOSE_FILE logs --tail 200 $SERVICES 2>/dev/null \
  | grep -icE '\"level\":(50|60)|FATAL' || true" 2>/dev/null)
if [ "${errs:-0}" -eq 0 ]; then
  okc "sin errores en los últimos 200 registros de $SERVICES"
else
  badc "$errs línea(s) de error/fatal en los logs recientes (pino level 50/60)"
  echo "     → míralos: docker compose -f $COMPOSE_FILE logs --tail 50 $WEB_SERVICE"
fi

disk=$(run_vps "df -h / | awk 'NR==2{print \$5}' | tr -d '%'" 2>/dev/null)
if [ -n "${disk:-}" ] && [ "$disk" -lt 85 ]; then
  okc "disco al ${disk}%"
else
  badc "disco al ${disk:-?}% — Postgres y los assets se quedan sin sitio"
fi

# El backup más reciente: un cron que dejó de correr es invisible hasta que lo
# necesitas. Aviso si el último dump tiene más de 48 h (el cron es diario).
age=$(run_vps "find $BACKUP_DIR -name '*.dump' -mtime -2 2>/dev/null | wc -l" 2>/dev/null)
if [ "${age:-0}" -gt 0 ]; then
  okc "hay backup de las últimas 48 h"
else
  badc "NINGÚN backup en las últimas 48 h — ¿ha dejado de correr el cron?"
  echo "     → fuerza uno: .claude/skills/deploy/scripts/backup.sh"
fi

head_ "Resultado"
if [ "$fails" -eq 0 ]; then
  printf '  \033[32m✓ deploy verificado: la app responde en https://%s\033[0m\n' "$DOMAIN"
  exit 0
fi
printf '  \033[31m✗ %s comprobación(es) fallaron\033[0m\n' "$fails"
echo "  Pista: si el ORIGEN pasa y el DOMINIO PÚBLICO falla, el problema es del"
echo "  CDN (no toques el servidor). Si falla el origen, mira los logs de $WEB_SERVICE."
exit 1
