#!/usr/bin/env bash
# Verificación INDEPENDIENTE de T3.2 (escrita por el verifier, no por el implementer).
# Restaura el dump PINCHADO sobre una BD vacía propia y compara CONTENIDO (hash por
# tabla), no solo cardinalidad.
set -euo pipefail

DUMP="${1:?uso: restore-check.sh <ruta-dump>}"
TDB=t32_verifier_restore_test

DC() { docker compose -p devtools -f docker-compose.prod.yml exec -T postgres "$@" </dev/null; }
PSQL() { DC sh -c "psql -U \"\$POSTGRES_USER\" -d $1 -Atc \"$2\""; }

PROD=$(DC sh -c 'printf "%s" "$POSTGRES_DB"')
echo "BD de producción: $PROD"
[ "$PROD" != "$TDB" ] || { echo "ABORTO: destino == producción"; exit 1; }

echo "=== 1. Creo una BD VACÍA ($TDB) ==="
DC sh -c "dropdb -U \"\$POSTGRES_USER\" --if-exists --force $TDB" || true
DC sh -c "createdb -U \"\$POSTGRES_USER\" $TDB"
echo -n "  tablas de usuario ANTES del restore (debe ser 0): "
PSQL "$TDB" "select count(*) from information_schema.tables where table_schema not in ('pg_catalog','information_schema')"

echo "=== 2. Restauro $DUMP sobre esa BD vacía ==="
docker compose -p devtools -f docker-compose.prod.yml exec -T postgres \
  sh -c "pg_restore -U \"\$POSTGRES_USER\" -d $TDB --no-owner" < "$DUMP"
echo "  pg_restore terminó con exit 0"

# Recuento de filas por tabla, cualificado con schema.
COUNT_SQL="select table_schema || '.' || table_name || '=' || (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text from information_schema.tables where table_schema not in ('pg_catalog','information_schema') and table_type='BASE TABLE' order by 1"

echo "=== 3. Filas por tabla ==="
echo "--- producción ($PROD) ---"
PSQL "$PROD" "$COUNT_SQL" | tee /tmp/t32-src-counts.txt
echo "--- restaurada ($TDB) ---"
PSQL "$TDB" "$COUNT_SQL" | tee /tmp/t32-dst-counts.txt

echo "=== 4. CONTENIDO: hash md5 del contenido completo de cada tabla de negocio ==="
# No es count(*): serializa TODAS las filas ordenadas y las hashea. Si el restore
# trajera los recuentos correctos con valores distintos, esto se rompe.
# Se usa un HASH a propósito: el contenido crudo de `user`/`session` es PII de un
# usuario real y no debe acabar en la evidencia committeada.
for t in '"user"' 'session' 'history_entry'; do
  H_SRC=$(PSQL "$PROD" "select coalesce(md5(string_agg(r,'|' order by r)),'<tabla vacía>') from (select t::text as r from public.$t t) s")
  H_DST=$(PSQL "$TDB" "select coalesce(md5(string_agg(r,'|' order by r)),'<tabla vacía>') from (select t::text as r from public.$t t) s")
  if [ "$H_SRC" = "$H_DST" ]; then
    echo "  OK  public.$t  prod=$H_SRC  restaurada=$H_DST"
  else
    echo "  FALLO public.$t  prod=$H_SRC  restaurada=$H_DST"; exit 1
  fi
done

echo "=== 5. Comparación global de recuentos ==="
if diff -u /tmp/t32-src-counts.txt /tmp/t32-dst-counts.txt; then
  echo "  OK: mismas tablas, mismos recuentos"
else
  echo "  FALLO: divergen"; exit 1
fi

echo "=== 6. Limpieza: destruyo la BD de ensayo ==="
DC sh -c "dropdb -U \"\$POSTGRES_USER\" --if-exists --force $TDB"
echo -n "  ¿sigue viva? (vacío = no): "
PSQL postgres "select 1 from pg_database where datname='$TDB'"
echo "VERIFICACIÓN INDEPENDIENTE COMPLETADA"
