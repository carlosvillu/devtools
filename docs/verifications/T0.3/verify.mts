// Verificación INDEPENDIENTE de T0.3 (verifier, contexto fresco).
// NO es el script del implementer. Levanta un Postgres 16 VACÍO con
// Testcontainers (jamás toca dev/prod), ejecuta el `pnpm db:migrate` REAL contra
// esa BD vacía, y comprueba LITERALMENTE la Verificación de planning.md:
//   - las 3 tablas + sus índices (psql \dt / \di / \d)
//   - smoke: insertar un user y leerlo de vuelta
//   - control negativo por DOS vías (repo y SQL crudo) → 23505 case-insensitive
//   - §11: history_entry sin columna de input crudo
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { createUser, getUserById } from '@app/db';
import { makeDb } from '@app/db';
import { Pool } from 'pg';

const EV = new URL('.', import.meta.url).pathname;
const REPO = '/home/developer/projects/devtools';
const out: string[] = [];
function log(s = '') {
  out.push(s);
  console.log(s);
}

async function main() {
  log('== Levantando Postgres 16 VACÍO (Testcontainers) ==');
  const container = await new PostgreSqlContainer('postgres:16')
    .withDatabase('devtools_verify')
    .withUsername('verify')
    .withPassword('verify-not-a-secret')
    .start();
  const uri = container.getConnectionUri();
  log(`URI host: 127.0.0.1:${container.getMappedPort(5432)} db=devtools_verify (password enmascarada)`);

  try {
    // --- Estado PRE-migración: la BD debe estar VACÍA ---
    const preTables = await container.exec([
      'psql', '-U', 'verify', '-d', 'devtools_verify', '-c', '\\dt',
    ]);
    log('\n== PRE-migración: psql \\dt (debe estar vacío) ==');
    log(preTables.output.trim());

    // --- Ejecutar el `pnpm db:migrate` REAL (la Verificación lo nombra) ---
    log('\n== Ejecutando `pnpm db:migrate` contra la BD vacía ==');
    const migrateOut = execSync('pnpm db:migrate', {
      cwd: REPO,
      env: { ...process.env, DATABASE_URL: uri },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    log(migrateOut.trim());

    // --- \dt: las 3 tablas ---
    log('\n== psql \\dt (post-migración) ==');
    log((await container.exec(['psql', '-U', 'verify', '-d', 'devtools_verify', '-c', '\\dt'])).output.trim());

    // --- \di: todos los índices ---
    log('\n== psql \\di (índices) ==');
    log((await container.exec(['psql', '-U', 'verify', '-d', 'devtools_verify', '-c', '\\di'])).output.trim());

    // --- \d de cada tabla (columnas + índices) ---
    for (const t of ['user', 'session', 'history_entry']) {
      log(`\n== psql \\d "${t}" ==`);
      log((await container.exec(['psql', '-U', 'verify', '-d', 'devtools_verify', '-c', `\\d "${t}"`])).output.trim());
    }

    // --- Índice funcional lower(email): comprobación explícita del indexdef ---
    log('\n== indexdef de los índices clave (pg_indexes) ==');
    log((await container.exec([
      'psql', '-U', 'verify', '-d', 'devtools_verify', '-c',
      "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename, indexname;",
    ])).output.trim());

    // --- SMOKE + controles negativos vía repos reales de @app/db ---
    const pool = new Pool({ connectionString: uri });
    const db = makeDb(pool);

    log('\n== SMOKE: createUser + getUserById (roundtrip) ==');
    const created = await createUser(db, {
      email: '  SmokeUser@Example.COM  ',
      passwordHash: 'scrypt$test$hash-not-a-secret',
    });
    const fetched = await getUserById(db, created.id);
    const smokeOk =
      fetched?.id === created.id &&
      created.email === 'smokeuser@example.com' &&
      JSON.stringify(fetched) === JSON.stringify(created);
    log(`created.id=${created.id}`);
    log(`created.email=${created.email} (normalizado a minúsculas ✓)`);
    log(`getUserById devuelve la misma fila: ${smokeOk}`);
    if (!smokeOk) throw new Error('SMOKE FALLÓ: roundtrip no coincide');

    log('\n== CONTROL NEGATIVO 1 (vía repo createUser): mismo email distinta caps ==');
    let code1: string | undefined;
    try {
      await createUser(db, { email: 'DUP@Example.com', passwordHash: 'h-not-a-secret' });
      await createUser(db, { email: 'dup@example.COM', passwordHash: 'h-not-a-secret' });
    } catch (e: any) {
      let cur: any = e;
      for (let i = 0; i < 10 && cur; i++) { if (typeof cur.code === 'string') { code1 = cur.code; break; } cur = cur.cause; }
    }
    log(`SQLSTATE esperado 23505 → obtenido: ${code1}`);
    if (code1 !== '23505') throw new Error('CONTROL NEGATIVO 1 FALLÓ: no hubo 23505');

    log('\n== CONTROL NEGATIVO 2 (INSERT CRUDO, sin repo): capitalización distinta ==');
    // Bypass total del repo: inserta directo con distinta capitalización. El
    // índice funcional lower(email) DEBE rechazarlo aunque nadie normalice.
    const raw = new Client({ connectionString: uri });
    await raw.connect();
    await raw.query(`INSERT INTO "user"(email, password_hash) VALUES ($1,$2)`, ['Raw@Case.COM', 'h-not-a-secret']);
    let code2: string | undefined;
    try {
      await raw.query(`INSERT INTO "user"(email, password_hash) VALUES ($1,$2)`, ['raw@case.com', 'h-not-a-secret']);
    } catch (e: any) {
      code2 = e.code;
    }
    await raw.end();
    log(`INSERT crudo 'Raw@Case.COM' luego 'raw@case.com' → SQLSTATE: ${code2} (esperado 23505)`);
    if (code2 !== '23505') throw new Error('CONTROL NEGATIVO 2 FALLÓ: el índice funcional no rechazó');

    await pool.end();

    log('\n== RESULTADO: TODAS LAS COMPROBACIONES PASARON ==');
  } finally {
    await container.stop();
    writeFileSync(EV + 'verify-output.txt', out.join('\n') + '\n');
  }
}

main().catch((e) => {
  log('\n!! ERROR: ' + (e?.message ?? e));
  writeFileSync(EV + 'verify-output.txt', out.join('\n') + '\n');
  process.exit(1);
});
