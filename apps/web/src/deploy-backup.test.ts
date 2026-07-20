// Invariantes ESTÁTICOS del backup de producción (T3.2), fijados como test
// permanente del gate (regla 8 del planning: toda cláusula determinista y gratuita
// de una Verificación queda protegida contra regresión para siempre).
//
// Esto NO sustituye a la Verificación de T3.2 —forzar el backup, leerlo con
// `pg_restore --list` y restaurarlo sobre una BD vacía lo ejecuta el verifier
// contra producción—: aquí se blindan los invariantes que un backup verde NO
// revelaría si se rompieran. Son justo los peligrosos:
//
//   · la retención es configurable y se aplica con `find -mtime`, no con un `rm`
//     sobre una variable que un día estará vacía;
//   · la poda tiene guardas para BACKUP_DIR no absoluto y retención no entera;
//   · el ensayo de restore no puede apuntar a la BD de producción.
//
// Lo que NO está aquí a propósito: que el cron esté instalado y que la poda borre
// de verdad. Lo primero vive fuera del repo (`crontab -l`) y lo segundo necesita
// un filesystem con mtimes envejecidos — ambos se EJERCITAN y quedan como
// evidencia en docs/verifications/, no como test unitario.
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { read, resolve } from './deploy-files';

const backupSh = read('../../../.claude/skills/deploy/scripts/backup.sh');

// Los bloques que backup.sh manda al VPS viajan dentro de heredocs, así que en el
// FICHERO los `$` diferidos aparecen escapados (`\$out`). `D` es "un $, escapado o
// no": deja las aserciones legibles sin depender de ese detalle de citado.
const D = String.raw`\\?\$`;

// Los comentarios de backup.sh nombran literalmente las trampas que evita
// («n_live_tup … no vale», «`rm` sobre una variable»). No deben contar como que el
// script HACE eso.
//
// TODA aserción sobre backup.sh mira `activeBackupSh`, nunca el fichero crudo —
// también las POSITIVAS. Un `expect(backupSh).toMatch(/trap drop_target EXIT/)`
// sigue verde si alguien COMENTA el trap, que es exactamente la regresión que el
// test existe para cazar: la guarda desaparece y su centinela no se entera.
//
// El filtro no puede ser `^\s*#`: eso deja pasar los comentarios al final de línea
// (`foo=1  # trap drop_target EXIT`), que reintroducen el mismo agujero. Se recorta
// respetando comillas, porque un `#` dentro de '…' o "…" es contenido y no comentario.
const stripComment = (line: string): string => {
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '\\') {
      i += 1;
      continue;
    }
    if (quote !== null) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === '#' && (i === 0 || /\s/.test(line[i - 1]!))) return line.slice(0, i);
  }
  return line;
};
const activeBackupSh = backupSh.split('\n').map(stripComment).join('\n');

// ── Ejecutar las guardas, no grepearlas ──────────────────────────────────────
// Las guardas que ABORTAN son comportamiento observable, así que se ejercitan de
// verdad. Grepear el mensaje y la sintaxis del `case` fija la FORMA: un `case` que
// case pero cuya rama no aborte pasaría igual, y reformular un mensaje rompería el
// test sin que cambie nada. Ejecutar afirma la propiedad real: aborta, con código
// ≠ 0, sin borrar nada.
//
// Es gratis y hermético: `DEPLOY_MODE=local` hace que `run_vps` sea un `bash -c`
// local, `compose()` es un `echo` puro, y las guardas abortan ANTES de cualquier
// `find`, `docker` o `ssh`. Verificado con `PATH=/usr/bin:/bin` (sin docker
// alcanzable) y comprobando que la salida nunca llega al paso «Volcando».
const BACKUP_SH = resolve('../../../.claude/skills/deploy/scripts/backup.sh');
const REPO_ROOT = resolve('../../../');

const runBackup = (
  env: Record<string, string>,
  ...args: string[]
): { status: number | null; out: string } => {
  const res = spawnSync(BACKUP_SH, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 30_000,
    env: { ...process.env, DEPLOY_MODE: 'local', ...env },
  });
  // Si el script no llega ni a arrancar (ruta mal, sin permiso de ejecución), se
  // grita. Devolver una salida vacía convertiría estos tests en verdes vacuos: los
  // `expect(out).not.toMatch(...)` pasarían sobre la nada.
  if (res.error) throw res.error;
  return { status: res.status, out: `${res.stdout}${res.stderr}` };
};

// Ninguna de estas invocaciones puede llegar al volcado. Si alguna lo hiciera,
// estaría hablando con el Postgres de producción — el assert lo impide.
const expectNeverDumped = (out: string): void => {
  expect(out).not.toMatch(/Volcando la BD/);
};
const libSh = read('../../../.claude/skills/deploy/scripts/_lib.sh');
const deployEnv = read('../../../deploy.env');

describe('deploy.env / _lib.sh — la retención es configuración, no un número mágico', () => {
  it('deploy.env declara BACKUP_RETENTION_DAYS con un entero', () => {
    expect(deployEnv).toMatch(/^BACKUP_RETENTION_DAYS="\$\{BACKUP_RETENTION_DAYS:-\d+\}"/m);
  });

  it('_lib.sh le da un default sensato (el script no depende de que deploy.env lo traiga)', () => {
    expect(libSh).toMatch(/^BACKUP_RETENTION_DAYS="\$\{BACKUP_RETENTION_DAYS:-\d+\}"/m);
  });

  // El literal vive en dos ficheros. La CAPA está bien (deploy.env gana siempre,
  // _lib.sh es el fallback si alguien invoca los scripts sin él), pero fijar cada
  // lado por separado con `\d+` deja que diverjan: subir deploy.env a 30 dejaría a
  // _lib.sh anunciando 14 —falso— sin que nada chille. Se comparan entre sí, y
  // también contra el número que el comentario de _lib.sh dice en prosa.
  it('deploy.env y _lib.sh declaran el MISMO default de retención', () => {
    const declared = (src: string): string | undefined =>
      /^BACKUP_RETENTION_DAYS="\$\{BACKUP_RETENTION_DAYS:-(\d+)\}"/m.exec(src)?.[1];

    const fromEnv = declared(deployEnv);
    expect(fromEnv).toBeDefined();
    expect(declared(libSh)).toBe(fromEnv);
    // El comentario de _lib.sh nombra el número: que no se quede caducado.
    expect(/Default conservador: (\d+)/.exec(libSh)?.[1]).toBe(fromEnv);
  });

  it('la BD del ensayo de restore es configurable y su default NO es la BD de prod', () => {
    expect(libSh).toMatch(/^BACKUP_RESTORE_DB="\$\{BACKUP_RESTORE_DB:-.*_restore_test\}"/m);
    expect(deployEnv).toMatch(/^BACKUP_RESTORE_DB="\$\{BACKUP_RESTORE_DB:-.*_restore_test\}"/m);
  });
});

describe('backup.sh — la poda no puede convertirse en un borrado del disco', () => {
  // El `find` debe usar EL glob anclado, no "algún" glob. Verificar por separado
  // que `DUMP_GLOB` se define anclado y que el `find` lleva `-name '<algo>'` deja
  // las dos mitades desacopladas: sustituir `'$DUMP_GLOB'` por `'*'` pasaba ambas
  // y convertía la poda en un barrido del directorio — que se COMPARTE con los
  // backups de otros proyectos del VPS.
  it('borra con `find -name "$DUMP_GLOB" -mtime +N -delete`, nunca con `rm` recursivo', () => {
    expect(activeBackupSh).toMatch(
      new RegExp(
        `find\\s+"${D}dir"\\s+-maxdepth 1\\s+-name\\s+'\\$DUMP_GLOB'\\s+-type f\\s+-mtime \\+${D}days\\s+-delete`,
      ),
    );
    // Y el candidato a borrar se calcula con el MISMO glob anclado.
    expect(activeBackupSh).toMatch(
      new RegExp(`doomed=.*find\\s+"${D}dir"\\s+-maxdepth 1\\s+-name\\s+'\\$DUMP_GLOB'`),
    );
    // Ningún borrado RECURSIVO, se escriba como se escriba: `-rf`, `-r -f`, `-fR`,
    // `-rfv` o `--recursive`. Ese es el patrón que borra máquinas cuando la variable
    // llega vacía. (`rm -f "$tmp"` sobre el fichero temporal concreto sí es legítimo.)
    //
    // El `[a-zA-Z]*` DESPUÉS de la [rR] no es adorno: sin él, `-[a-zA-Z]*[rR]\b`
    // exige que la r sea la última letra del flag y `rm -rf` NO casa (la `f` impide
    // el límite de palabra) — el caso más común de todos se colaba. Verificado con
    // las cuatro formas ejecutadas contra el script.
    expect(activeBackupSh).not.toMatch(/\brm\s+(?:-[a-zA-Z]*[rR][a-zA-Z]*|--recursive)\b/);
  });

  it('el patrón de la poda está anclado al proyecto (no barre ficheros ajenos)', () => {
    expect(activeBackupSh).toMatch(/DUMP_GLOB="\$\{PROJECT_NAME\}-\*\.dump"/);
  });
});

describe('backup.sh — las guardas de la poda ABORTAN de verdad (ejecutadas)', () => {
  it('BACKUP_DIR relativo: aborta con exit ≠ 0', () => {
    const { status, out } = runBackup({ BACKUP_DIR: 'relativo/x' }, '--prune-only');
    expect(status).toBe(1);
    expect(out).toMatch(/poda ABORTADA: BACKUP_DIR vacío o no absoluto/);
    expectNeverDumped(out);
  });

  it('BACKUP_DIR = / : aborta por demasiado peligroso', () => {
    const { status, out } = runBackup({ BACKUP_DIR: '/' }, '--prune-only');
    expect(status).toBe(1);
    expect(out).toMatch(/poda ABORTADA: BACKUP_DIR demasiado peligroso/);
    expectNeverDumped(out);
  });

  it('retención no entera: aborta antes de interpolarla en el `find`', () => {
    const { status, out } = runBackup({ BACKUP_RETENTION_DAYS: '14; rm -rf /' }, '--prune-only');
    expect(status).toBe(1);
    expect(out).toMatch(/poda ABORTADA: BACKUP_RETENTION_DAYS no es un entero/);
    expectNeverDumped(out);
  });

  // Control POSITIVO del bloque: con una configuración VÁLIDA el script no aborta,
  // llega a la lógica de poda y sale limpio. Sin él, unas guardas que rechazaran
  // absolutamente todo pasarían los tres tests de arriba tan campantes.
  it('directorio válido pero inexistente: ni error ni estropicio (exit 0)', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'backup-prune-')), 'todavia-no-existe');
    const { status, out } = runBackup({ BACKUP_DIR: dir }, '--prune-only');
    expect(status).toBe(0);
    expect(out).toMatch(/nada que podar/);
    expect(out).not.toMatch(/ABORTADA/);
    expectNeverDumped(out);
  });
});

describe('backup.sh — el ensayo de restore no puede tocar producción', () => {
  // EJECUTADA: el destino sin el sufijo aborta de verdad, con código ≠ 0 y sin
  // haber volcado nada. La rama que ACEPTA (`*_restore_test) ;;`) se sigue mirando
  // por estructura: ejercitarla exigiría dejar correr el ensayo entero contra el
  // Postgres de producción, que no es trabajo de un test unitario — lo hace la
  // Verificación de la tarea.
  it('exige que el destino lleve el sufijo `_restore_test` (aborta ejecutando)', () => {
    const { status, out } = runBackup({ BACKUP_RESTORE_DB: 'devtools_wrong' }, '--restore-check');
    expect(status).toBe(1);
    expect(out).toMatch(/no acaba en '_restore_test' — me niego a restaurar ahí/);
    expectNeverDumped(out);
    expect(activeBackupSh).toMatch(/\*_restore_test\)\s*;;/);
  });

  // El nombre de la BD acaba dentro de un `sh -c` que corre en el contenedor de
  // PRODUCCIÓN. Sin este filtro, `x; <comando>; y_restore_test` satisface el sufijo
  // de arriba y ejecuta ese comando: las dos guardas "mecánicas" se atraviesan
  // enteras. Un identificador de BD legítimo no necesita nada fuera de [A-Za-z0-9_].
  it('rechaza un destino con caracteres que podrían escapar del `sh -c`', () => {
    // El payload real: satisface el sufijo `_restore_test` y colaría un comando.
    const { status, out } = runBackup(
      { BACKUP_RESTORE_DB: 'x; touch /tmp/pwned-by-test; y_restore_test' },
      '--restore-check',
    );
    expect(status).toBe(1);
    expect(out).toMatch(/caracteres fuera de \[A-Za-z0-9_\]/);
    // Y aborta ANTES de hablar con el contenedor: si llegara al volcado, el comando
    // inyectado ya habría tenido su oportunidad.
    expectNeverDumped(out);
  });

  // Cinturón y tirantes: aunque el filtro de arriba se relajara, el nombre viaja
  // SIEMPRE entre comillas dentro del `sh -c`.
  it('interpola el destino siempre entre comillas (createdb / pg_restore / dropdb)', () => {
    // Dentro del heredoc, el nombre citado se escribe `\\"\$target\\"`. Se compara
    // como SUBCADENA literal en vez de con un regex: la escalera de escapes es justo
    // donde un regex se equivoca en silencio y deja pasar la forma sin comillas.
    const quotedTarget = String.raw`\\"\$target\\"`;
    const targetLines = activeBackupSh
      .split('\n')
      .filter((l) => l.includes('$target') && /\b(?:createdb|dropdb|pg_restore)\b/.test(l));

    // Control positivo: si el filtro deja de encontrar las tres invocaciones, este
    // test se ha vuelto inerte y lo dice, en vez de pasar sobre un conjunto vacío.
    expect(targetLines).toHaveLength(3);
    for (const line of targetLines) expect(line).toContain(quotedTarget);
  });

  it('aborta si el destino coincide con la $POSTGRES_DB real del contenedor', () => {
    expect(activeBackupSh).toMatch(new RegExp(`if \\[ "${D}target" = "${D}prod" \\]`));
    expect(activeBackupSh).toMatch(/ABORTADO: el destino del restore ES la BD de producción/);
  });

  it('intenta borrar la BD desechable pase lo que pase (trap en EXIT)', () => {
    expect(activeBackupSh).toMatch(/trap drop_target EXIT/);
  });

  // `drop_target` acaba en `|| true`: si el dropdb falla, la BD desechable sobrevive
  // en el Postgres de producción y el script, tal como estaba, imprimía «ya no
  // existe» igualmente. Ahora lo COMPRUEBA. Se fija aquí porque es la diferencia
  // entre un mensaje y un control.
  it('comprueba de verdad que la BD desechable murió, en vez de afirmarlo', () => {
    expect(activeBackupSh).toMatch(/select 1 from pg_database where datname/);
    expect(activeBackupSh).toMatch(/SIGUE VIVA en el Postgres de producción/);
  });

  it('compara filas EXACTAS, no `n_live_tup` (que en una BD recién restaurada miente)', () => {
    expect(activeBackupSh).toMatch(/count\(\*\)/);
    expect(activeBackupSh).not.toMatch(/n_live_tup/);
  });

  // El ensayo comparaba solo `public`, así que un restore que hubiera perdido
  // `drizzle.__drizzle_migrations` pasaba con las 3 tablas de negocio intactas — y
  // esa BD le diría a Drizzle que ninguna migración se aplicó. Decisión tomada en
  // T3.2: entra en la comparación. Se fija aquí para que no pueda estrecharse otra
  // vez en silencio: es un cambio de una línea, invisible en un backup verde.
  it('la comparación cubre TODOS los schemas de usuario, no solo `public`', () => {
    expect(activeBackupSh).toMatch(/table_schema not in \('pg_catalog', 'information_schema'\)/);
    // El filtro es por "lo que no es sistema": volver a un allow-list de `public`
    // dejaría el registro de migraciones fuera del control sin que nada chille.
    expect(activeBackupSh).not.toMatch(/table_schema = 'public'/);
  });

  it('cualifica cada tabla con su schema (dos homónimas no pueden confundirse)', () => {
    expect(activeBackupSh).toMatch(/table_schema \|\| '\.' \|\| table_name/);
  });

  // El mensaje de éxito decía «tabla por tabla y fila por fila», que promete
  // CONTENIDO. Se compara `count(*)`: cardinalidad. Un restore con los recuentos
  // correctos y los valores corruptos imprimía «fila por fila» y pasaba. El control
  // no puede anunciar más de lo que mide.
  it('el mensaje de éxito no promete más de lo que el `count(*)` mide', () => {
    expect(activeBackupSh).toMatch(/mismo número de filas que producción/);
    expect(activeBackupSh).not.toMatch(/fila por fila/);
  });
});

describe('backup.sh — apto para correr desde cron', () => {
  it('añade a PATH los directorios que cron no trae (docker vive en /usr/local/bin)', () => {
    expect(activeBackupSh).toMatch(/export PATH="\$PATH:.*\/usr\/local\/bin/);
  });

  it('el volcado es atómico: `.part` + mv (un dump truncado no sobrevive a la poda)', () => {
    expect(activeBackupSh).toMatch(new RegExp(`tmp="${D}out\\.part"`));
    expect(activeBackupSh).toMatch(new RegExp(`mv "${D}tmp" "${D}out"`));
    expect(activeBackupSh).toMatch(new RegExp(`\\[ -s "${D}tmp" \\]`));
  });
});
