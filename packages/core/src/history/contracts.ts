// Contratos de la API de historial (`GET/DELETE /api/history`, PRD §8) — T2.2.
// Son la frontera de tipos entre el route handler (que los usa para SERIALIZAR la
// salida) y el api-client del frontend (que los usa para VALIDAR lo que recibe): un
// drift entre ambos revienta en test, no en producción.
//
// 🔴 D7 / §11 — lo que este contrato NO tiene, y no puede tener nunca:
//   - ningún campo con el input crudo (no existe en la BD: solo hay `preview` redactado);
//   - ningún `userId`. El historial que se devuelve es SIEMPRE el del usuario de la
//     sesión del servidor. Si el contrato transportara un `userId`, invitaría a que
//     alguien lo aceptara como ENTRADA — y ese es exactamente el bug de aislamiento que
//     la tarea prohíbe. El cliente no elige de quién es el historial: no puede nombrarlo.
import { z } from 'zod';
import { DataKindSchema } from '../engine/contracts';

/** Un paso del resumen de cadena persistido: kind detectado + transformación aplicada. */
export const HistoryChainStepSchema = z.object({
  kind: DataKindSchema,
  /** `null` en el paso terminal (no se aplicó transformación). */
  transformId: z.string().nullable(),
});
export type HistoryChainStep = z.infer<typeof HistoryChainStepSchema>;

/**
 * Una entrada de historial tal y como viaja por HTTP.
 * `createdAt` es un STRING ISO: JSON no tiene tipo fecha, así que el contrato declara lo
 * que de verdad cruza el cable (un `z.date()` aquí fallaría en cada carga del cliente).
 */
export const HistoryEntryViewSchema = z.object({
  id: z.uuid(),
  /** Vista previa YA redactada y truncada (≤120). Nunca el dato crudo (D7). */
  preview: z.string(),
  inputKind: DataKindSchema,
  chain: z.array(HistoryChainStepSchema),
  createdAt: z.iso.datetime(),
});
export type HistoryEntryView = z.infer<typeof HistoryEntryViewSchema>;

/**
 * Cursor de paginación COMPUESTO. Lleva `id` además de `createdAt` a propósito: el
 * `timestamptz` de Postgres tiene precisión de microsegundos pero viaja como `Date` de JS
 * (milisegundos, truncado hacia abajo), así que un cursor de solo tiempo PIERDE filas
 * silenciosamente en el intervalo truncado. Con `(createdAt, id)` el orden es total y el
 * corte exacto. Ver `listHistoryEntriesByUser` en `@app/db`.
 */
export const HistoryCursorSchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.uuid(),
});
export type HistoryCursorView = z.infer<typeof HistoryCursorSchema>;

/** Página de historial. `nextCursor` es el cursor desde el que pedir la siguiente. */
export const HistoryPageSchema = z.object({
  entries: z.array(HistoryEntryViewSchema),
  nextCursor: HistoryCursorSchema.nullable(),
});
export type HistoryPage = z.infer<typeof HistoryPageSchema>;

/** Respuesta de un borrado: cuántas entradas se eliminaron (0 nunca ocurre: es un 404). */
export const HistoryDeleteResultSchema = z.object({
  deleted: z.number().int().nonnegative(),
});
export type HistoryDeleteResult = z.infer<typeof HistoryDeleteResultSchema>;
