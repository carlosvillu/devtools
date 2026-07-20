#!/usr/bin/env bash
# Backup de la BD de producción: vuelca, poda lo viejo y comprueba que el dump es
# restaurable. Lo segundo es el punto: un backup que nadie ha probado a leer no es
# un backup, es un fichero. `pg_restore --list` lo abre de verdad y enumera su
# contenido — si el dump está truncado o corrupto, falla aquí y no el día que lo
# necesites.
#
# Este script es a la vez el que corre el CRON a diario y el que se fuerza a mano
# (antes de una migración arriesgada, antes de un rollback). Un solo camino: lo
# que el cron ejecuta cada noche es exactamente lo que tú pruebas al forzarlo.
#
# La línea del cron vive FUERA del repo (`crontab -l` del usuario del VPS) y debe
# entrar en el directorio del repo antes de invocar el script — _lib.sh deriva la
# raíz con `git rev-parse`, que depende del cwd. Ver SKILL.md §Backups.
#
# Funciona desde el VPS (local) y desde desarrollo (ssh) — _lib.sh decide.
#
# Uso:  ./backup.sh                  # volcado + poda + verificación de lectura
#       ./backup.sh --list           # solo lista los backups existentes
#       ./backup.sh --prune-only     # solo aplica la retención (no vuelca)
#       ./backup.sh --restore-check  # + ensayo de restore sobre una BD DESECHABLE
set -euo pipefail

# El cron trae un PATH mínimo que no incluye /usr/local/bin (donde vive docker en
# muchas instalaciones). Se AÑADE, no se sustituye: en una shell interactiva esto
# es inocuo, y en cron es lo que hace que `docker` se encuentre.
export PATH="$PATH:/usr/local/bin:/usr/bin:/bin"

ACTION="backup"
for arg in "$@"; do
  case "$arg" in
    --local)         export DEPLOY_MODE=local ;;
    --remote)        export DEPLOY_MODE=remote ;;
    --list)          ACTION="list" ;;
    --prune-only)    ACTION="prune" ;;
    --restore-check) ACTION="restore-check" ;;
  esac
done

. "$(cd "$(dirname "$0")" && pwd)/_lib.sh"

COMPOSE_CMD="$(compose)"

# Guarda del ensayo de restore, comprobada ANTES de nada: si el destino está mal
# configurado, se sabe ya, no después de haber volcado media BD. La segunda guarda
# (destino ≠ BD de producción) vive abajo, contra el entorno real del contenedor.
if [ "$ACTION" = "restore-check" ]; then
  # PRIMERO el juego de caracteres. El nombre viaja hasta un `sh -c` dentro del
  # contenedor de producción, así que un destino como `x; <comando>; y_restore_test`
  # satisfaría el sufijo de abajo y EJECUTARÍA ese comando. Un identificador de BD
  # legítimo no necesita nada fuera de [A-Za-z0-9_]: lo que no encaje se rechaza sin
  # interpretarlo. (Los `$target` van además entre comillas más abajo; esto es el
  # cinturón, aquello los tirantes.)
  case "$BACKUP_RESTORE_DB" in
    ''|*[!a-zA-Z0-9_]*) bad "BACKUP_RESTORE_DB='$BACKUP_RESTORE_DB' contiene caracteres fuera de [A-Za-z0-9_] — me niego a interpolarlo en un shell"; exit 1 ;;
  esac
  case "$BACKUP_RESTORE_DB" in
    *_restore_test) ;;
    *) bad "BACKUP_RESTORE_DB='$BACKUP_RESTORE_DB' no acaba en '_restore_test' — me niego a restaurar ahí"; exit 1 ;;
  esac
fi
# Los dumps se nombran SIEMPRE con este prefijo. La poda casa exactamente este
# patrón: nunca un glob suelto sobre el directorio, que barrería ficheros ajenos.
DUMP_GLOB="${PROJECT_NAME}-*.dump"

# remote_bash <<'EOF' … EOF — ejecuta un bloque de bash EN el VPS. El bloque se
# expande aquí (las variables del script ya están resueltas) y viaja entero como
# un único argumento citado: nada de escaleras de backslashes.
remote_bash() { run_vps "bash -euo pipefail -c $(printf '%q' "$(cat)")"; }

# ── La poda ──────────────────────────────────────────────────────────────────
# Un `rm` con una variable vacía es la forma clásica de borrar un disco. Aquí no
# se borra NADA si BACKUP_DIR no es una ruta absoluta plausible o si la retención
# no es un entero; y el borrado va por `find -name '<patrón>' -mtime +N -delete`,
# que si el patrón no casa nada simplemente no borra nada.
prune_block() {
  cat <<PRUNE
dir='$BACKUP_DIR'
days='$BACKUP_RETENTION_DAYS'
case "\$dir" in
  /|/root|/home) echo "poda ABORTADA: BACKUP_DIR demasiado peligroso ('\$dir')" >&2; exit 1 ;;
  /?*) ;;
  *) echo "poda ABORTADA: BACKUP_DIR vacío o no absoluto ('\$dir')" >&2; exit 1 ;;
esac
case "\$days" in
  ''|*[!0-9]*) echo "poda ABORTADA: BACKUP_RETENTION_DAYS no es un entero ('\$days')" >&2; exit 1 ;;
esac
if [ ! -d "\$dir" ]; then echo "  (no existe \$dir todavía: nada que podar)"; exit 0; fi
doomed=\$(find "\$dir" -maxdepth 1 -name '$DUMP_GLOB' -type f -mtime +\$days 2>/dev/null | sort)
if [ -n "\$doomed" ]; then
  printf '%s\n' "\$doomed" | while read -r f; do echo "  - borrado (>\${days} d): \$(basename "\$f")"; done
  find "\$dir" -maxdepth 1 -name '$DUMP_GLOB' -type f -mtime +\$days -delete
else
  echo "  (ningún dump supera los \${days} días: no se borra nada)"
fi
# Restos de un pg_dump interrumpido a medias: se van al día siguiente.
find "\$dir" -maxdepth 1 -name '$DUMP_GLOB.part' -type f -mtime +1 -delete 2>/dev/null || true
echo "  quedan \$(find "\$dir" -maxdepth 1 -name '$DUMP_GLOB' -type f | wc -l) dump(s) en \$dir"
PRUNE
}

if [ "$ACTION" = "list" ]; then
  printf '\033[1mBackups en el VPS (%s)\033[0m\n' "$BACKUP_DIR"
  run_vps "ls -lh $BACKUP_DIR/*.dump 2>/dev/null || echo '  (todavía no hay ninguno)'"
  exit 0
fi

# Los dos sitios que podan (el `--prune-only` y el paso de la pasada completa) eran
# copia-pega y sus mensajes ya habían divergido. Un solo punto: lo que hace el cron
# cada noche y lo que ves al forzar la poda son literalmente la misma línea.
run_prune() {
  step "Aplicando retención ($BACKUP_RETENTION_DAYS días) en $BACKUP_DIR"
  prune_block | remote_bash
}

if [ "$ACTION" = "prune" ]; then
  run_prune
  exit 0
fi

step "Volcando la BD de producción"
# pg_dump corre DENTRO del contenedor de postgres (el host no necesita tener las
# herramientas de Postgres instaladas). Formato custom (-Fc): comprimido y apto
# para pg_restore selectivo. Usuario y BD salen del entorno del contenedor.
#
# Volcado a `.part` + `mv` atómico: un pg_dump interrumpido a medias no deja nunca
# un `.dump` truncado que la retención conservaría como si fuera bueno.
remote_bash <<DUMP
mkdir -p '$BACKUP_DIR'
out="$BACKUP_DIR/${PROJECT_NAME}-\$(date -u +%Y%m%dT%H%M%SZ).dump"
tmp="\$out.part"
trap 'rm -f "\$tmp"' EXIT
$COMPOSE_CMD exec -T postgres sh -c 'pg_dump -U "\$POSTGRES_USER" -Fc "\$POSTGRES_DB"' > "\$tmp"
[ -s "\$tmp" ] || { echo "backup FALLIDO: dump vacío" >&2; exit 1; }
mv "\$tmp" "\$out"
trap - EXIT
echo "  dump: \$out (\$(du -h "\$out" | cut -f1))"
DUMP

run_prune

step "Verificando que el último dump es restaurable"
remote_bash <<VERIFY
latest=\$(ls -t '$BACKUP_DIR'/*.dump | head -1)
echo "  dump: \$latest (\$(du -h "\$latest" | cut -f1))"
tables=\$($COMPOSE_CMD exec -T postgres pg_restore --list < "\$latest" 2>/dev/null | grep -c 'TABLE DATA' || true)
if [ "\${tables:-0}" -gt 0 ]; then
  printf '  \033[32m✓ pg_restore lo lee sin error — %s tablas con datos\033[0m\n' "\$tables"
else
  printf '  \033[31m✗ pg_restore NO pudo leer el dump (corrupto o vacío)\033[0m\n'
  exit 1
fi
VERIFY

[ "$ACTION" = "restore-check" ] || exit 0

# ── Ensayo de restore sobre una BD DESECHABLE ────────────────────────────────
# `pg_restore --list` demuestra que el fichero se LEE; solo restaurarlo de verdad
# demuestra que los datos VUELVEN. Se hace contra una BD temporal que se crea y se
# destruye aquí mismo — JAMÁS contra producción.
#
# Las dos guardas no son comentarios: el destino debe llevar el sufijo
# `_restore_test` (comprobado arriba, antes de volcar nada) y no puede coincidir
# con la BD de producción (comprobado abajo, contra el entorno real del
# contenedor). Las reglas que dependerían de que el operador se acuerde se
# convierten en checks mecánicos.
step "Ensayo de restore sobre la BD desechable '$BACKUP_RESTORE_DB'"
# Cuenta EXACTA de filas por tabla. `n_live_tup` de pg_stat_user_tables no vale:
# es una estimación que el autovacuum aún no ha rellenado en una BD recién
# restaurada y leería 0 — un falso negativo garantizado.
#
# TODOS los schemas de usuario, no solo `public`. Esto NO es cosmético: el registro
# de migraciones vive en `drizzle.__drizzle_migrations`, y un restore que lo
# perdiera pasaría un ensayo limitado a `public` con las 3 tablas de datos
# intactas — pero esa BD restaurada le diría a Drizzle que NINGUNA migración se ha
# aplicado, y el siguiente arranque intentaría re-ejecutarlas todas sobre un
# esquema que ya existe. Es justo el desastre para el que existe el backup, así que
# entra en la comparación. Se excluyen los schemas del sistema (no son datos del
# proyecto y su contenido varía entre versiones de Postgres); se filtra por lo que
# NO es sistema en vez de listar los nuestros para que un schema futuro entre solo
# en la comparación en lugar de quedarse fuera en silencio.
#
# Con esto la comparación cubre 4 tablas. Ojo al leer el planning: sus «3 tablas»
# son las de negocio (`user`, `session`, `history_entry`); la cuarta es el registro
# de migraciones. El `pg_restore --list` de arriba también cuenta 4, pero eso NO es
# un control cruzado: son dos invocaciones independientes y nada compara ambos
# números. Ni siquiera tendrían por qué coincidir siempre (una tabla particionada
# padre es BASE TABLE y no emite TABLE DATA). Coincidencia informativa, no garantía.
#
# El nombre va cualificado con el schema: sin él, dos tablas homónimas en schemas
# distintos serían indistinguibles en la comparación de cadenas.
COUNT_SQL="select table_schema || '.' || table_name || '=' || (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text from information_schema.tables where table_schema not in ('pg_catalog', 'information_schema') and table_type = 'BASE TABLE' order by table_schema, table_name"

remote_bash <<RESTORE
latest=\$(ls -t '$BACKUP_DIR'/*.dump | head -1)
target='$BACKUP_RESTORE_DB'
echo "  dump a ensayar: \$latest"

prod=\$($COMPOSE_CMD exec -T postgres sh -c 'printf %s "\$POSTGRES_DB"')
if [ "\$target" = "\$prod" ]; then
  printf '  \033[31m✗ ABORTADO: el destino del restore ES la BD de producción (%s)\033[0m\n' "\$prod"
  exit 1
fi

# Los nombres de BD van SIEMPRE entre comillas dentro del \`sh -c\`: sin ellas, un
# destino con metacaracteres se ejecutaría como comando en el contenedor de
# producción. La guarda de juego de caracteres de arriba ya lo impide; esto lo
# impide otra vez, por si aquella se relaja.
psql_on() { $COMPOSE_CMD exec -T postgres sh -c "psql -U \\"\\\$POSTGRES_USER\\" -d \\"\$1\\" -Atc \\"\$2\\""; }
drop_target() { $COMPOSE_CMD exec -T postgres sh -c "dropdb -U \\"\\\$POSTGRES_USER\\" --if-exists --force \\"\$target\\"" >/dev/null 2>&1 || true; }
# Se INTENTA borrar pase lo que pase: un fallo a mitad no debe dejar la BD de
# ensayo viva. Ojo con lo que esto NO promete: el \`|| true\` se traga un dropdb
# fallido, así que si el borrado no puede completarse la BD desechable sobrevive
# en el Postgres de producción — silenciosamente. Es deliberado (un fallo al
# limpiar no debe enmascarar el resultado del ensayo), pero por eso el final del
# script comprueba si sigue viva y AVISA en vez de dar por hecho que se fue.
trap drop_target EXIT

drop_target
$COMPOSE_CMD exec -T postgres sh -c "createdb -U \\"\\\$POSTGRES_USER\\" \\"\$target\\""
echo "  BD vacía creada: \$target"

$COMPOSE_CMD exec -T postgres sh -c "pg_restore -U \\"\\\$POSTGRES_USER\\" -d \\"\$target\\" --no-owner" < "\$latest"

src=\$(psql_on '\$POSTGRES_DB' "$COUNT_SQL")
dst=\$(psql_on "\$target" "$COUNT_SQL")

echo "  tablas restauradas (tabla=filas):"
printf '%s\n' "\$dst" | sed 's/^/    /'

# El restore no vale con "hay tablas": tiene que reproducir las MISMAS tablas con
# el MISMO número de filas que producción.
#
# Lo que este control NO dice, y por eso el mensaje no lo dice tampoco: compara
# CARDINALIDAD, no contenido. Un restore que trajera los recuentos correctos con
# los valores corruptos pasaría. Decir "fila por fila" sería anunciar una garantía
# que el \`count(*)\` no da.
if [ "\$src" = "\$dst" ]; then
  printf '  \033[32m✓ el restore reproduce las mismas tablas con el mismo número de filas que producción\033[0m\n'
else
  printf '  \033[31m✗ el restore NO coincide con producción\033[0m\n'
  echo "    producción: \$src"
  echo "    restaurada: \$dst"
  exit 1
fi
RESTORE

# El `trap` de arriba INTENTA borrar la BD desechable, pero se traga el error si no
# puede. Así que no lo damos por hecho: se comprueba. Afirmar "ya no existe" sin
# mirarlo es justo el tipo de frase que deja una BD viva en producción con el
# operador convencido de lo contrario.
step "Comprobando que la BD desechable ya no existe"
remote_bash <<CLEANUP
if $COMPOSE_CMD exec -T postgres sh -c 'psql -U "\$POSTGRES_USER" -d postgres -Atc "select 1 from pg_database where datname = '"'"'$BACKUP_RESTORE_DB'"'"'"' | grep -q 1; then
  printf '  \033[31m✗ la BD desechable %s SIGUE VIVA en el Postgres de producción — bórrala a mano\033[0m\n' '$BACKUP_RESTORE_DB'
  exit 1
fi
printf '  \033[32m✓ la BD desechable %s ya no existe\033[0m\n' '$BACKUP_RESTORE_DB'
CLEANUP
ok "ensayo de restore completado"
