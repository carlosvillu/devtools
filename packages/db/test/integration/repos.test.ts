// Roundtrip real de los repos mínimos de T0.3 (testing/db-integration.md §6):
// crear/leer user y session contra el clon de Postgres. El sistema de tipos no
// detecta un mapeo camelCase↔snake_case roto ni un default de BD; por eso el
// roundtrip va contra Postgres, no contra un stub.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase, makeUser, pgErrorCode, type TestDatabase } from '@app/test-utils';
import { createSession, createUser, getSessionById, getUserByEmail, getUserById } from '@app/db';

let tdb: TestDatabase;
beforeAll(async () => {
  tdb = await createTestDatabase({ label: 'repos' });
});
afterAll(async () => {
  await tdb.close();
});

describe('users.repo', () => {
  it('create/get hace roundtrip (uuid e timestamp generados por la BD)', async () => {
    const created = await createUser(tdb.db, {
      email: 'roundtrip@example.com',
      passwordHash: 'scrypt$test$hash-not-a-secret',
    });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.createdAt).toBeInstanceOf(Date);

    const fetched = await getUserById(tdb.db, created.id);
    expect(fetched).toEqual(created);
  });

  it('normaliza el email al crear (trim + lowercase)', async () => {
    const created = await createUser(tdb.db, {
      email: '  MixedCase@Example.COM  ',
      passwordHash: 'h-not-a-secret',
    });
    expect(created.email).toBe('mixedcase@example.com');
  });

  it('getUserByEmail encuentra sin importar la capitalización de entrada', async () => {
    const created = await createUser(tdb.db, {
      email: 'lookup@example.com',
      passwordHash: 'h-not-a-secret',
    });
    const byUpper = await getUserByEmail(tdb.db, 'LOOKUP@EXAMPLE.COM');
    expect(byUpper?.id).toBe(created.id);
  });

  it('getUserById devuelve undefined si no existe', async () => {
    const missing = await getUserById(tdb.db, '00000000-0000-0000-0000-000000000000');
    expect(missing).toBeUndefined();
  });

  it('control negativo vía repo: un email duplicado en distinta capitalización FALLA', async () => {
    await createUser(tdb.db, {
      email: 'dup@example.com',
      passwordHash: 'h-not-a-secret',
    });
    // El repo hace INSERT directo (sin SELECT de existencia previo): el rechazo
    // lo emite la constraint (23505), probando la DECISIÓN de unicidad.
    const err = await createUser(tdb.db, {
      email: 'DUP@Example.com',
      passwordHash: 'h-not-a-secret',
    })
      .then(() => undefined)
      .catch((e: unknown) => e);
    expect(pgErrorCode(err)).toBe('23505'); // unique_violation
  });
});

describe('sessions.repo', () => {
  it('create/get hace roundtrip y respeta expires_at', async () => {
    const u = await createUser(tdb.db, makeUser());
    const expiresAt = new Date(Date.now() + 3_600_000);
    const created = await createSession(tdb.db, { userId: u.id, expiresAt });

    const fetched = await getSessionById(tdb.db, created.id);
    expect(fetched).toEqual(created);
    expect(fetched?.userId).toBe(u.id);
    expect(fetched?.expiresAt.getTime()).toBe(expiresAt.getTime());
  });

  it('crear una sesión con un user_id inexistente FALLA (FK)', async () => {
    const err = await createSession(tdb.db, {
      userId: '00000000-0000-0000-0000-000000000000',
      expiresAt: new Date(Date.now() + 1000),
    })
      .then(() => undefined)
      .catch((e: unknown) => e);
    expect(pgErrorCode(err)).toBe('23503'); // foreign_key_violation
  });
});
