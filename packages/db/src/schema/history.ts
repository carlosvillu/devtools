// Tabla `history_entry` (PRD §9). El schema se crea aquí (T0.3); su repo y su
// escritura llegan en T2.1. Sin repo todavía a propósito (no adelantar trabajo).
//
// §11 / D7 — SEGURIDAD: NO existe columna para el input crudo. `preview` es el
// texto YA truncado y redactado (D7, máx 120 chars, lo calcula T2.1); `chain`
// guarda SOLO el resumen `[{ kind, transform_id }]`, jamás los valores
// intermedios. El schema no debe invitar a persistir lo que §11 prohíbe.
import { index, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, uuidPk } from './columns.helpers';
import { user } from './users';

/** Resumen de un paso de la cadena: tipo detectado + transformación aplicada.
 *  `transformId` es null en el paso terminal (no se aplicó transformación). */
export interface ChainSummaryEntry {
  kind: string;
  transformId: string | null;
}

export const historyEntry = pgTable(
  'history_entry',
  {
    id: uuidPk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Truncado + redactado (D7), máx 120 chars. NUNCA el input crudo.
    preview: text('preview').notNull(),
    // DataKind del paso 0 (§6).
    inputKind: text('input_kind').notNull(),
    // Resumen de tipos y transformaciones, sin valores intermedios (D7).
    chain: jsonb('chain').$type<ChainSummaryEntry[]>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    // (user_id, created_at DESC): sirve la query del historial (§9) — las N
    // entradas más recientes de un usuario, ya ordenadas.
    index('history_entry_user_created_idx').on(t.userId, t.createdAt.desc()),
  ],
);

export type HistoryEntry = typeof historyEntry.$inferSelect;
export type NewHistoryEntry = typeof historyEntry.$inferInsert;
