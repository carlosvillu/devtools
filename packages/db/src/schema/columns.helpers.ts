// Helpers de columna compartidos por el schema (backend/db.md §1).
//
// PK = `uuid` con `defaultRandom()` (Postgres `gen_random_uuid()`), NO ULID.
// El PRD §9 fija `id uuid pk` para las tres tablas y el PRD manda sobre la skill
// (jerarquía CLAUDE.md). La razón del ULID-en-app de la skill (referenciar la
// fila antes del INSERT desde `singletonKey` de pg-boss o payloads de NOTIFY) no
// aplica aquí: §5.2 del PRD descarta cola y SSE. La generación en la BD es la
// opción más simple y sin dependencias.
import { timestamp, uuid } from 'drizzle-orm/pg-core';

/** PK uuid generada por Postgres. */
export const uuidPk = () => uuid('id').primaryKey().defaultRandom();

/**
 * `created_at timestamptz default now()` (§9). Las tres tablas del modelo tienen
 * SOLO `created_at` (no `updated_at`): nada aquí muta tras el INSERT.
 */
export const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
