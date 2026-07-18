// Repo del agregado `user` (backend/db.md §4): funciones con el executor como
// primer argumento, cada query explícita para un caso de uso con nombre.
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../client';
import { user, type User } from '../schema/users';

/**
 * Normaliza un email para almacenamiento y búsqueda: recorta y baja a minúsculas.
 *
 * DECISIÓN DE UNICIDAD (T0.3, PRD §9): normalización en la app (esta función) +
 * índice único FUNCIONAL sobre `lower(email)` en la BD. NO citext. El repo
 * escribe y busca SIEMPRE con el email normalizado; el índice garantiza la
 * insensibilidad a mayúsculas a nivel de BD aunque una escritura la evitara.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Inserta un usuario y devuelve la fila creada. El email se normaliza aquí.
 *
 * IMPORTANTE: es un INSERT directo, sin SELECT-de-existencia previo. Un email
 * duplicado (mismo `lower(email)`) lo RECHAZA la constraint con 23505, que se
 * propaga — el control negativo prueba así la DECISIÓN (el índice), no la app.
 * El servicio de auth (T0.4) mapea el 23505 a su AppError de "email en uso".
 */
export async function createUser(
  db: Db,
  input: { email: string; passwordHash: string },
): Promise<User> {
  const [row] = await db
    .insert(user)
    .values({
      email: normalizeEmail(input.email),
      passwordHash: input.passwordHash,
    })
    .returning();
  if (!row) throw new Error('createUser: INSERT no devolvió fila');
  return row;
}

/** Lee un usuario por id. `undefined` si no existe. */
export async function getUserById(db: Db, id: string): Promise<User | undefined> {
  const [row] = await db.select().from(user).where(eq(user.id, id));
  return row;
}

/**
 * Lee un usuario por email (login, §8 auth). Busca por el email normalizado, de
 * modo que la capitalización de entrada es irrelevante; a prueba de una fila que
 * se hubiera colado sin normalizar, compara también con `lower()`.
 */
export async function getUserByEmail(db: Db, email: string): Promise<User | undefined> {
  const normalized = normalizeEmail(email);
  const [row] = await db
    .select()
    .from(user)
    .where(eq(sql`lower(${user.email})`, normalized));
  return row;
}
