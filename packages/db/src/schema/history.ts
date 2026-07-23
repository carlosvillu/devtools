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

/** Dirección del motor que produjo la entrada (§9, D10, v1.2):
 *  - `'decode'` — se analizó algo (F1–F5): el `preview` es el input redactado (D7).
 *  - `'compose'` — se compuso una receta (F6): el `preview` es una ETIQUETA SINTÉTICA
 *    generada en el servidor a partir de la receta («compuesto · N pasos»); ni un solo
 *    carácter del usuario, porque el fuente/resultado/secreto nunca salen del navegador
 *    (§5.3, §11). El servidor no podría guardarlos aunque quisiera. */
export type HistoryDirection = 'decode' | 'compose';

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
    // Dirección del motor (§9, D10). `not null default 'decode'` A PROPÓSITO: las filas ya
    // existentes (todas de decodificar, F1–F5) quedan bien tipadas SIN backfill, y la migración
    // se aplica on-boot con lock (T0.3). No hay CHECK de valores: el borde de escritura solo
    // acepta 'decode'|'compose' (repo + Zod), y añadir un CHECK obligaría a una migración por
    // cada dirección nueva sin ganar seguridad sobre lo que ya validan los tipos.
    direction: text('direction').notNull().default('decode').$type<HistoryDirection>(),
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
