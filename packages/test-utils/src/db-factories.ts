// Factories de las filas de persistencia (testing/db-integration.md §9): cada
// una devuelve un input de INSERT válido y acepta overrides parciales. Cuando el
// schema evolucione, se arregla aquí una vez, no en cincuenta tests.
import { randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { historyEntry, type Db, type NewSession, type NewUser } from '@app/db';

/** Input para crear un `user`. Email único por defecto (evita colisiones entre
 *  tests que no las están probando). El hash es un literal de test evidente. */
export function makeUser(overrides: Partial<NewUser> = {}): NewUser {
  return {
    email: `user-${randomBytes(4).toString('hex')}@example.com`,
    passwordHash: 'scrypt$test$hash-not-a-secret',
    ...overrides,
  };
}

/** Input para crear una `session`. `userId` es obligatorio (FK): pásalo por
 *  override con el id de un user ya insertado. Expira a la hora por defecto. */
export function makeSession(overrides: Partial<NewSession> & { userId: string }): NewSession {
  return {
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    ...overrides,
  };
}

/**
 * Inserta una `history_entry` con un `created_at` EXACTO en MICROsegundos.
 *
 * Existe para los tests de paginación por cursor: `created_at` es `timestamptz` (µs en
 * Postgres) pero un `Date` de JS solo llega a milisegundos y trunca hacia abajo. Pasar un
 * `Date` haría IMPOSIBLE sembrar dos filas dentro del mismo milisegundo, que es justo la
 * condición bajo la que un cursor mal construido pierde filas. Por eso el instante viaja
 * como TEXTO y se castea en la BD, sin pasar nunca por `Date`.
 *
 * Vive aquí (y no en cada suite) porque lo consumen los tests de `@app/db` y los de
 * `apps/web`, que no depende de drizzle-orm directamente (frontera de paquetes).
 */
export async function insertHistoryEntryAt(
  db: Db,
  input: { userId: string; isoMicros: string; preview?: string },
): Promise<string> {
  const rows = await db
    .insert(historyEntry)
    .values({
      userId: input.userId,
      preview: input.preview ?? `at-${input.isoMicros}`,
      inputKind: 'jwt',
      chain: [{ kind: 'jwt', transformId: 'jwt.decode' }],
      createdAt: sql`${input.isoMicros}::timestamptz`,
    })
    .returning({ id: historyEntry.id });

  const id = rows[0]?.id;
  if (!id) throw new Error('insertHistoryEntryAt: INSERT no devolvió fila');
  return id;
}
