// Repo del agregado `history_entry` (backend/db.md §4). T2.1 solo necesita la ESCRITURA:
// el listado y el borrado son de T2.2 y llegan con sus tests (no adelantar trabajo).
//
// 🔴 D7 / §11: la firma de `createHistoryEntry` NO admite el input crudo. Lo que entra
// aquí ya viene redactado y resumido por `@app/core/history`; este repo no redacta nada
// (si redactara, habría dos sitios donde equivocarse). Si algún día alguien quiere
// añadir aquí un parámetro con el dato del usuario, ese es el bug.
import { and, desc, eq, sql } from 'drizzle-orm';
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

/** Página del listado: hasta `limit` entradas, de la más reciente a la más antigua. */
export const HISTORY_PAGE_MAX = 50;

/**
 * Cursor de paginación COMPUESTO `(createdAt, id)`.
 *
 * 🔵 POR QUÉ COMPUESTO Y NO SOLO `createdAt` (bug corregido en T2.2):
 * `created_at` es `timestamptz`, que en Postgres tiene precisión de MICROsegundos, pero el
 * driver lo entrega como `Date` de JS, que solo llega a MILIsegundos y TRUNCA HACIA ABAJO.
 * Con un filtro `created_at < cursor`, toda fila cuyo instante real caiga en el intervalo
 * `[cursor_truncado, cursor_real)` se pierde: no sale en la página actual (ya se pasó) ni
 * en la siguiente (queda por encima del corte). Es un HUECO SILENCIOSO — no un solape, que
 * es el fallo que la gente suele buscar. Reproducido contra Postgres real con filas en
 * `.500900/.500500/.500100` y `limit 2`: la tercera desaparecía de ambas páginas.
 *
 * La solución NO es bajar la precisión ni redondear (eso solo mueve el problema a los
 * empates): es un cursor compuesto con comparación de TUPLA `(created_at, id) < (…, …)`,
 * que Postgres evalúa lexicográficamente. Como `id` es único, el orden
 * `(created_at DESC, id DESC)` es TOTAL y ESTABLE, así que el corte es exacto aunque
 * varias filas compartan milisegundo — y aunque compartan microsegundo.
 */
export interface HistoryCursor {
  /**
   * Instante en ISO 8601 UTC con precisión de MICROsegundos, tal y como lo emite Postgres
   * (`2026-07-19T08:29:18.964123Z`). Es un STRING, no un `Date`, DELIBERADAMENTE: un `Date`
   * de JS solo llega a milisegundos, así que convertir aquí volvería a abrir el hueco que
   * el cursor compuesto existe para cerrar. El valor viaja de la BD al cliente y vuelve sin
   * pasar nunca por `Date`.
   */
  createdAt: string;
  id: string;
}

/** Expresión que renderiza `created_at` en ISO UTC con los 6 dígitos de microsegundos. */
const createdAtCursor = sql<string>`to_char(${historyEntry.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

/** Filas de una página + el cursor de la última (con precisión completa). */
export interface HistoryPageRows {
  rows: HistoryEntry[];
  /** Cursor de la ÚLTIMA fila devuelta, o `null` si la página vino vacía. */
  lastCursor: HistoryCursor | null;
}

export interface ListHistoryOptions {
  /** Tamaño de página. Se acota a [1, HISTORY_PAGE_MAX]; por defecto HISTORY_PAGE_MAX. */
  limit?: number;
  /** Cursor compuesto: devuelve solo entradas ESTRICTAMENTE posteriores en el orden. */
  before?: HistoryCursor;
}

/**
 * Entradas de un usuario, de la más reciente a la más antigua, paginadas.
 *
 * 🔴 AISLAMIENTO (T2.2): el filtro `user_id` va SIEMPRE en el WHERE de esta consulta y
 * el `userId` lo deriva el llamante de la SESIÓN DEL SERVIDOR — jamás de un parámetro,
 * query string, header o body del cliente. No existe (ni debe existir) una variante de
 * esta función sin filtro de usuario: esa sería la vía de fuga del historial ajeno.
 */
export async function listHistoryEntriesByUser(
  db: Db,
  userId: string,
  options: ListHistoryOptions = {},
): Promise<HistoryPageRows> {
  const limit = Math.min(
    Math.max(Math.trunc(options.limit ?? HISTORY_PAGE_MAX), 1),
    HISTORY_PAGE_MAX,
  );
  const cursor = options.before;
  const where = cursor
    ? and(
        eq(historyEntry.userId, userId),
        // Comparación de TUPLA (lexicográfica), no dos condiciones sueltas con OR: es la
        // que se corresponde exactamente con el ORDER BY de abajo y la que no deja huecos.
        // El instante entra como texto y se castea en la BD, conservando los microsegundos.
        sql`(${historyEntry.createdAt}, ${historyEntry.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`,
      )
    : eq(historyEntry.userId, userId);

  const selected = await db
    .select({ row: historyEntry, cursorAt: createdAtCursor })
    .from(historyEntry)
    .where(where)
    // Orden TOTAL: `id` desempata cuando dos filas comparten instante, de modo que la
    // paginación es determinista entre llamadas y el corte del cursor es exacto.
    .orderBy(desc(historyEntry.createdAt), desc(historyEntry.id))
    .limit(limit);

  const last = selected[selected.length - 1];
  return {
    rows: selected.map((s) => s.row),
    lastCursor: last ? { createdAt: last.cursorAt, id: last.row.id } : null,
  };
}

/**
 * Borra UNA entrada, acotada al usuario dueño. Devuelve `true` solo si se borró algo.
 *
 * 🔴 AISLAMIENTO: el `user_id` forma parte del WHERE, no de una comprobación posterior
 * en JavaScript. Un id de otra persona no encuentra fila → 0 borradas → `false` (que el
 * handler traduce a 404: nunca un 403, que confirmaría la existencia de la entrada ajena).
 */
export async function deleteHistoryEntryForUser(
  db: Db,
  userId: string,
  id: string,
): Promise<boolean> {
  const rows = await db
    .delete(historyEntry)
    .where(and(eq(historyEntry.id, id), eq(historyEntry.userId, userId)))
    .returning({ id: historyEntry.id });
  return rows.length > 0;
}

/** Borra TODAS las entradas del usuario (y solo las suyas). Devuelve cuántas borró. */
export async function deleteAllHistoryEntriesForUser(db: Db, userId: string): Promise<number> {
  const rows = await db
    .delete(historyEntry)
    .where(eq(historyEntry.userId, userId))
    .returning({ id: historyEntry.id });
  return rows.length;
}
