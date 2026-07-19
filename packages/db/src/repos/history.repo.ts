// Repo del agregado `history_entry` (backend/db.md §4). T2.1 solo necesita la ESCRITURA:
// el listado y el borrado son de T2.2 y llegan con sus tests (no adelantar trabajo).
//
// 🔴 D7 / §11: la firma de `createHistoryEntry` NO admite el input crudo. Lo que entra
// aquí ya viene redactado y resumido por `@app/core/history`; este repo no redacta nada
// (si redactara, habría dos sitios donde equivocarse). Si algún día alguien quiere
// añadir aquí un parámetro con el dato del usuario, ese es el bug.
import { desc, eq } from 'drizzle-orm';
import type { Db } from '../client';
import { historyEntry, type ChainSummaryEntry, type HistoryEntry } from '../schema/history';

export interface NewHistoryEntryInput {
  userId: string;
  /** Ya redactado y truncado a 120 (D7) — ver `buildPreview` en `@app/core/history`. */
  preview: string;
  inputKind: string;
  /** Resumen `[{ kind, transformId }]`, sin valores intermedios. */
  chain: ChainSummaryEntry[];
}

export async function createHistoryEntry(
  db: Db,
  input: NewHistoryEntryInput,
): Promise<HistoryEntry> {
  const [row] = await db
    .insert(historyEntry)
    .values({
      userId: input.userId,
      preview: input.preview,
      inputKind: input.inputKind,
      chain: input.chain,
    })
    .returning();
  if (!row) throw new Error('createHistoryEntry: INSERT no devolvió fila');
  return row;
}

/** Entradas de un usuario, de la más reciente a la más antigua. T2.1 la usa solo para
 *  verificar el efecto; T2.2 la ampliará con paginación (§8 history). */
export async function listHistoryEntriesByUser(db: Db, userId: string): Promise<HistoryEntry[]> {
  return db
    .select()
    .from(historyEntry)
    .where(eq(historyEntry.userId, userId))
    .orderBy(desc(historyEntry.createdAt));
}
