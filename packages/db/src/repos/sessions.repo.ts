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

/**
 * Borra una sesión por id (logout, §8 auth). Devuelve `true` si borró una fila.
 * Borrar de la BD —no solo limpiar la cookie— es lo que invalida la sesión de
 * verdad: la expiración vive en la BD (§11), así que una sesión sin fila ya no
 * valida aunque el cliente conservara la cookie.
 */
export async function deleteSession(db: Db, id: string): Promise<boolean> {
  const rows = await db.delete(session).where(eq(session.id, id)).returning({ id: session.id });
  return rows.length > 0;
}
