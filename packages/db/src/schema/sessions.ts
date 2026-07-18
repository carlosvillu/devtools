// Tabla `session` (PRD §9). Sesión con expiración en BD (no solo en la cookie,
// §11); la crea/valida el auth de T0.4.
import { index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdAt, uuidPk } from './columns.helpers';
import { user } from './users';

export const session = pgTable(
  'session',
  {
    id: uuidPk(),
    userId: uuid('user_id')
      .notNull()
      // Borrar la cuenta borra sus sesiones: política de producto explícita (§9).
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    // (user_id): listar/invalidar las sesiones de un usuario (logout, §8 auth).
    index('session_user_id_idx').on(t.userId),
    // (expires_at): barrido de sesiones caducadas.
    index('session_expires_at_idx').on(t.expiresAt),
  ],
);

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
