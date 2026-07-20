# T3.2 · Backup diario y restore verificado — VERIFICACIÓN

- **Veredicto**: **PASS**
- **Fecha**: 2026-07-20
- **SHA de HEAD**: `e7f0cc7` (T3.1). **El código verificado es el del ÁRBOL DE TRABAJO**, sin commitear
  — es lo normal: el verifier corre antes del commit de cierre.
- **Superficie**: backend/infraestructura (no hay UI). Sin sesión CUA: la Verificación se ejecuta con
  scripts, `psql` y `pg_restore` observables contra el **Postgres de producción REAL** del VPS
  (`devtools-postgres-1`), nunca contra mocks.
- **Coste real**: **$0** (estimado $0). No interviene ninguna API de pago.

## Texto literal verificado

> forzar el backup produce un dump legible por `pg_restore --list` (criterio 14.10); restaurarlo sobre
> una BD vacía de prueba reproduce las 3 tablas con sus filas.

Entrega asociada: *cron de `pg_dump` diario con retención, según la skill `deploy`*.

## Resultado por punto

| # | Esperado (cláusula) | Observado | OK |
|---|---|---|---|
| 1 | `pnpm gate` en verde | 632 tests / 60 ficheros, todo verde. Re-ejecutado por mí | ✅ |
| 2 | Forzar el backup produce un dump | Dump forzado por mí: `devtools-20260720T123717Z.dump` (12K) | ✅ |
| 3 | El dump es legible por `pg_restore --list` (crit. 14.10) | Leído **por mí** sobre el dump pinchado: 4 `TABLE DATA` | ✅ |
| 4 | Restaurado sobre una **BD vacía** de prueba | BD propia `t32_verifier_restore_test` creada vacía (0 tablas) y restaurada por mí | ✅ |
| 5 | Reproduce **las 3 tablas de negocio** | `public.user`, `public.session`, `public.history_entry` presentes | ✅ |
| 6 | **con sus filas** | `user` 1 fila y `session` 3 filas, **content-identical por md5**; `history_entry` 0→0 (ver §Rarezas) | ✅ |
| 7 | Entrega: cron **diario** instalado y correcto | Línea instalada; ejecutada literal en entorno desnudo → exit 0 + dump real | ✅ (parcial, ver §NO VERIFICADO) |
| 8 | Entrega: **con retención** | Poda ejercitada con mtimes envejecidos: borra lo viejo, respeta lo ajeno | ✅ |
| 9 | Regla 8: cláusulas deterministas como test del gate | 18 tests en `deploy-backup.test.ts`; control negativo ejecutado por mí | ✅ |
| 10 | Producción intacta | `verify.sh` verde; sin BDs de ensayo huérfanas | ✅ |

## Evidencia

Todos los ficheros en `docs/verifications/T3.2/`:

| Fichero | Qué prueba |
|---|---|
| `01-gate.txt` | `pnpm gate` completo en verde (632/60) |
| `02-backup-tests.txt` | Los tests de T3.2 se ejecutan de verdad (no skipped) |
| `03-backup-forzado.txt` | El backup forzado por mí |
| `04-dump-sha256.txt` | SHA256 del dump pinchado (trazabilidad) |
| `05-pg_restore-list.txt` | Salida cruda de `pg_restore --list` |
| `06-restore-independiente.txt` | **Mi** restore sobre BD vacía + comparación de contenido |
| `07-cron-entorno-desnudo.txt` | La línea del cron en `env -i` |
| `08-cron-control-negativo.txt` | Sin el `cd` → exit 127; con él → exit 0 |
| `09-retencion-poda.txt` | La poda borra lo viejo y respeta ficheros ajenos |
| `10-control-negativo-mutacion.txt` | El test se pone ROJO al neutralizar la guarda |
| `11-restauracion-tras-mutacion.txt` | Script restaurado byte a byte |
| `12-honestidad-doc.txt` | Ni script ni SKILL.md prometen más de lo que miden |
| `13-restore-check-implementer.txt` | `--restore-check` end-to-end + sin BDs huérfanas |
| `14-verify-produccion.txt` | Producción sana tras toda la verificación |
| `verifier-restore-check.sh` | **Mi** script de verificación (independiente del implementer) |

## 1. La cláusula literal, ejecutada por mí

No me fío del `✓` del script del implementer. Escribí mi propio `verifier-restore-check.sh`, pinché el
dump **exacto** que forcé (con ~20 dumps de timestamps casi idénticos, un `ls -t | head -1` no es
evidencia de nada) y restauré ese fichero sobre una BD vacía creada por mí.

Además, **no me limité a comparar `count(*)`**. La cláusula dice «con sus filas», y la cardinalidad no
es contenido: un restore que trajera los recuentos correctos con los valores corruptos pasaría un
`count(*)`. Comparé el **hash md5 del contenido completo** de cada tabla de negocio (todas las filas
serializadas y ordenadas), prod vs restaurada:

```
  OK  public."user"   prod=46a2ef6a4a770261b529c114a3f2758e  restaurada=46a2ef6a4a770261b529c114a3f2758e
  OK  public.session  prod=e492d3e3ae1c2160254bc3ddd0d3f951  restaurada=e492d3e3ae1c2160254bc3ddd0d3f951
  OK  public.history_entry  prod=<tabla vacía>  restaurada=<tabla vacía>
```

(Se usa un hash a propósito: el contenido crudo de `user`/`session` es PII de un usuario real y no debe
acabar en evidencia committeada.)

`pg_restore --list` sobre el dump pinchado, leído por mí:

```
3445; 0 16391 TABLE DATA drizzle __drizzle_migrations devtools
3446; 0 16399 TABLE DATA public history_entry devtools
3447; 0 16408 TABLE DATA public session devtools
3448; 0 16415 TABLE DATA public user devtools
```

Las «3 tablas» del planning son las de negocio; la 4ª es el registro de migraciones. Discrepancia
aparente ya resuelta, no es un hallazgo.

## 2. El cron: qué queda demostrado y qué NO

Línea instalada (`crontab -l`):

```
30 3 * * * cd /home/developer/projects/devtools && .claude/skills/deploy/scripts/backup.sh >> /home/developer/backups/devtools/backup.log 2>&1
```

- **La línea literal, en entorno desnudo, funciona**: `env -i HOME=… PATH=/usr/bin:/bin sh -c '<línea>'`
  → **exit 0**, dump real creado (`devtools-20260720T123914Z.dump`) y log escrito. Ejercita cwd, PATH y
  redirección tal como los verá cron.
- **Control negativo confirmado**: la misma invocación **sin el `cd`**, arrancando desde `$HOME` (donde
  cron arranca de verdad), da **exit 127** — `backup.sh: not found`. El `cd` no es cosmético.

  > Nota de método: mi primer intento de este control fue **inválido** y lo dejo documentado en
  > `07-cron-entorno-desnudo.txt`. `env -i` limpia el entorno pero **no cambia el cwd**, así que el
  > directorio de mi shell se coló y la invocación «sin `cd`» salió exit 0. Repetido correctamente
  > desde `$HOME` en `08-cron-control-negativo.txt`, da 127.

**NO VERIFICADO (fuera de lo demostrable)**: que el **daemon de cron dispare** a las 03:30. El cron
nunca ha disparado todavía y la primera ejecución real sería mañana. Verificar eso exigiría esperar o
manipular el crontab, y ninguna de las dos cosas es trabajo de este gate. Lo demostrable —que la línea
instalada es correcta y hace el trabajo en el entorno que cron le dará— **sí** está demostrado.
`verify.sh` vigila el resto: avisa si no hay dump en 48 h.

## 3. Retención (la mitad de la Entrega que ningún test cubre)

Los tests unitarios ejercitan las **guardas** de la poda, pero nunca un borrado real. Lo cerré yo en un
directorio temporal con mtimes envejecidos (`touch -d '30 days ago'`), sin tocar los dumps reales:

```
OK  el dump devtools de 30 d fue BORRADO
OK  el dump devtools de 20 d fue BORRADO
OK  el dump reciente SOBREVIVE
OK  el dump AJENO (ugc-factory), igual de viejo, SOBREVIVE
```

La última línea es la importante: `BACKUP_DIR` se comparte con los backups de otros proyectos del VPS,
y el `find -name '<PROJECT_NAME>-*.dump'` está anclado al patrón del proyecto. Un glob suelto habría
borrado los backups de ugc-factory.

## 4. Los tests estáticos NO son inertes (verificado por mutación)

El proyecto arrastra un historial de asserts inertes en esta misma tarea, así que lo comprobé
ejecutando, no leyendo. Neutralicé **solo el `exit 1`** de la rama `*)` de `prune_block`, dejando el
`case` y el mensaje intactos — exactamente la regresión que un grep del mensaje NO cazaría:

```
83:  *) echo "poda ABORTADA: BACKUP_DIR vacío o no absoluto ('\$dir')" >&2; ;;
```

Resultado: **el test se puso ROJO**, y por el `status`, no por el mensaje:

```
FAIL  src/deploy-backup.test.ts > … > BACKUP_DIR relativo: aborta con exit ≠ 0
AssertionError: expected +0 to be 1
```

El assert de ejecución muerde donde un grep habría pasado. **Restauración**: hecha con `cp` desde una
copia previa, **nunca con `git checkout`** — todo T3.2 vive en el árbol sin commitear y un checkout
habría borrado la tarea entera. Verificado:

- `sha256sum` idéntico al de antes de mutar (`6eaa8d98…`).
- El diff de T3.2 es **byte a byte** el de antes (294 líneas). Ojo: ese diff **no está vacío**, y no
  debe estarlo — es la propia tarea.
- `git status` con los mismos ficheros que al empezar.

## 5. Honestidad del mensaje al operador

Comprobado contra los ficheros en disco, no contra el diff. El script dice:

> ✓ el restore reproduce las mismas tablas con el **mismo número de filas** que producción

y `SKILL.md` advierte explícitamente que el control «compara **cardinalidad, no contenido**». La única
aparición de «fila por fila» en todo el árbol está **dentro de un comentario que explica por qué NO se
dice**. No hay promesa por encima de lo medido: el precedente de T2.4 no se repite aquí.

## Rarezas (aunque el veredicto sea PASS)

1. **`history_entry` está a 0 filas en producción: esa fila de la comparación es vacua hoy.** Lo declaro
   explícitamente en vez de dejarlo pasar como si demostrara algo. Mi juicio sobre si la Verificación
   («reproduce las 3 tablas **con sus filas**») queda satisfecha: **sí**, y la razón es que la
   maquinaria de reproducción queda probada por las tablas que **sí** tienen datos — `user` (1 fila) y
   `session` (3 filas) vuelven **content-identical**, no solo con el recuento correcto. Con eso
   demostrado, un `history_entry` que vuelve vacío es **reproducción fiel del estado actual de
   producción**, no un defecto. No inserté datos: hay un usuario real detrás y fabricar filas en su BD
   para lucir una verificación sería peor que la laguna que taparía. Si mañana `history_entry` tiene
   filas, esta comprobación deja de ser vacua sola.
2. **Deriva de código en producción** (`verify.sh`): prod corre `684bc53` y HEAD es `e7f0cc7`. Es
   **preexistente y no afecta a T3.2**: los cambios de esta tarea son scripts de la skill `deploy` y
   tests, que se ejecutan **desde el árbol del repo**, no desde la imagen desplegada. Lo que verifiqué
   es exactamente el código que correrá el cron. No requiere deploy.
3. **~20 dumps del mismo día** en `BACKUP_DIR`, de las ejecuciones del implementer y las mías. Son
   legítimos y la retención de 14 días los recogerá sola. No los borré: borrar backups de producción no
   es trabajo del verifier.
4. El primer control negativo del cron que escribí era metodológicamente inválido (§2). Se queda en la
   evidencia a propósito, con su corrección al lado: un error de método documentado vale más que una
   evidencia que aparenta limpieza.

## Estado de producción tras la verificación

`verify.sh` completo en verde: dominio público 200, `/api/health` con `db:true`, origen directo OK,
trust boundary del borde OK, contenedores sanos, disco al 42%, backup reciente presente. Ninguna BD de
ensayo quedó viva (`pg_database`: solo `devtools`, `postgres`, `template0`, `template1`). El dato del
usuario real está intacto.
