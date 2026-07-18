// Lo que la migración PROMETE, fijado como comportamiento observable contra
// Postgres real (testing/db-integration.md §5): unicidad case-insensitive de
// email, `ON DELETE CASCADE` de las FKs y presencia de los índices de §9. El
// schema TS y el SQL migrado pueden divergir; estos tests hacen que un cambio
// accidental rompa un test, no producción. Blindan además, como test permanente,
// las cláusulas deterministas de la Verificación de T0.3.
import { inArray, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTestDatabase,
  makeSession,
  makeUser,
  pgErrorCode,
  type TestDatabase,
} from '@app/test-utils';
import { historyEntry, session, user } from '@app/db/schema';

let tdb: TestDatabase;
beforeAll(async () => {
  tdb = await createTestDatabase({ label: 'schema.constraints' });
});
afterAll(async () => {
  await tdb.close();
});

describe('user: índice único insensible a mayúsculas sobre lower(email)', () => {
  it('rechaza un segundo email que solo difiere en capitalización (control negativo, nivel BD)', async () => {
    await tdb.db.insert(user).values(makeUser({ email: 'Alice@Example.COM' }));
    // Inserción DIRECTA (sin el repo): prueba que la garantía es del índice, no
    // de la normalización de la app. Distinta capitalización ⇒ unique_violation.
    const err = await tdb.db
      .insert(user)
      .values(makeUser({ email: 'alice@example.com' }))
      .then(() => undefined)
      .catch((e: unknown) => e);
    expect(pgErrorCode(err)).toBe('23505'); // unique_violation
  });

  it('admite emails distintos', async () => {
    await tdb.db.insert(user).values(makeUser({ email: 'bob@example.com' }));
    await tdb.db.insert(user).values(makeUser({ email: 'carol@example.com' }));
    const rows = await tdb.db
      .select()
      .from(user)
      .where(inArray(user.email, ['bob@example.com', 'carol@example.com']));
    expect(rows).toHaveLength(2);
  });
});

describe('FKs: ON DELETE CASCADE (§9)', () => {
  it('borrar el user borra sus sesiones', async () => {
    const [u] = await tdb.db.insert(user).values(makeUser()).returning();
    await tdb.db.insert(session).values(makeSession({ userId: u!.id }));

    await tdb.db.delete(user).where(sql`${user.id} = ${u!.id}`);
    const rows = await tdb.db
      .select()
      .from(session)
      .where(sql`${session.userId} = ${u!.id}`);
    expect(rows).toHaveLength(0);
  });

  it('borrar el user borra sus entradas de historial', async () => {
    const [u] = await tdb.db.insert(user).values(makeUser()).returning();
    await tdb.db.insert(historyEntry).values({
      userId: u!.id,
      preview: 'redacted-preview',
      inputKind: 'json',
      chain: [{ kind: 'json', transformId: null }],
    });

    await tdb.db.delete(user).where(sql`${user.id} = ${u!.id}`);
    const rows = await tdb.db
      .select()
      .from(historyEntry)
      .where(sql`${historyEntry.userId} = ${u!.id}`);
    expect(rows).toHaveLength(0);
  });
});

describe('índices de §9 presentes en la BD migrada', () => {
  it('history_entry tiene el índice (user_id, created_at DESC)', async () => {
    const res = await tdb.db.execute(sql`
      SELECT indexdef FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = 'history_entry_user_created_idx'
    `);
    expect(res.rows).toHaveLength(1);
    // El DESC es el que hace que sirva la query del historial sin sort extra.
    expect((res.rows[0] as { indexdef: string }).indexdef).toMatch(/user_id,\s*created_at DESC/i);
  });

  it('session tiene índices en (user_id) y (expires_at)', async () => {
    const res = await tdb.db.execute(sql`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'session'
    `);
    const names = res.rows.map((r) => (r as { indexname: string }).indexname);
    expect(names).toContain('session_user_id_idx');
    expect(names).toContain('session_expires_at_idx');
  });
});
