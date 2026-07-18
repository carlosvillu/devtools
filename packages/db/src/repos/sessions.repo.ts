// Repo del agregado `session` (backend/db.md §4). Mínimo para T0.3: crear y
// leer. La validación de expiración/invalidación es del auth (T0.4).
import { eq } from 'drizzle-orm';
import type { Db } from '../client';
import { session, type Session } from '../schema/sessions';

/** Crea una sesión (la expiración vive en BD, no solo en la cookie — §11). */
export async function createSession(
  db: Db,
  input: { userId: string; expiresAt: Date },
): Promise<Session> {
  const [row] = await db
    .insert(session)
    .values({ userId: input.userId, expiresAt: input.expiresAt })
    .returning();
  if (!row) throw new Error('createSession: INSERT no devolvió fila');
  return row;
}

/** Lee una sesión por id. `undefined` si no existe. */
export async function getSessionById(db: Db, id: string): Promise<Session | undefined> {
  const [row] = await db.select().from(session).where(eq(session.id, id));
  return row;
}
