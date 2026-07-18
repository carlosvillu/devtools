// Tabla `user` (PRD §9). Cuenta de usuario para el auth email+contraseña (T0.4).
import { sql } from 'drizzle-orm';
import { pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { createdAt, uuidPk } from './columns.helpers';

export const user = pgTable(
  'user',
  {
    id: uuidPk(),
    // Se persiste YA normalizado (trim + lowercase) por el repo. Ver la decisión
    // de unicidad en el índice de abajo y en repos/users.repo.ts.
    email: text('email').notNull(),
    // Hash scrypt de node:crypto (T0.4). NUNCA la contraseña en claro (§11).
    passwordHash: text('password_hash').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    // Unicidad de email INSENSIBLE A MAYÚSCULAS (PRD §9: «el índice único debe
    // ser insensible a mayúsculas»). Índice FUNCIONAL sobre `lower(email)`, no
    // sobre la columna: así la garantía es a nivel de BD e incondicional —
    // aunque una escritura se saltara la normalización de la app, dos emails que
    // difieren solo en capitalización chocan con 23505. Sin la extensión citext.
    uniqueIndex('user_email_lower_uq').on(sql`lower(${t.email})`),
  ],
);

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
