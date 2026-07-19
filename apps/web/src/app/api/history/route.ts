// `GET/DELETE /api/history` (PRD §8 módulo `history`, D6/D7) — T2.2.
//
// 🔴 AISLAMIENTO ENTRE USUARIOS — el invariante que gobierna este fichero:
// el `userId` con el que se consulta y se borra sale SIEMPRE de `auth.user.id`, es decir
// de la sesión validada CONTRA POSTGRES por `withSession`. Este handler NO acepta —ni
// lee, ni conoce— ningún id de usuario venido del cliente: no hay un `userId` en la query
// string, ni en un header, ni en el body. Manipular la URL no puede cambiar de quién es
// el historial que se devuelve, porque no existe ningún parámetro que lo nombre.
//
// El middleware de Edge (`proxy.ts`) NO autentica: solo mira que la cookie exista. La
// autenticación real ocurre aquí, en `withSession`. Ver el comentario de with-session.ts.
import { z } from 'zod';
import { HistoryDeleteResultSchema, HistoryPageSchema } from '@app/core/history';
import { AppError } from '@app/core/contracts';
import {
  HISTORY_PAGE_MAX,
  deleteAllHistoryEntriesForUser,
  deleteHistoryEntryForUser,
  listHistoryEntriesByUser,
  type HistoryEntry,
} from '@app/db';
import { getDb } from '@/server/db';
import { withSession } from '@/server/with-session';

// Toca Postgres: Node runtime obligatorio, nunca Edge. La respuesta depende de la sesión
// y de datos vivos: jamás cacheable.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Parámetros ACEPTADOS de la query. Nótese lo que NO está: ningún id de usuario.
 *
 * El cursor es COMPUESTO (`before` + `beforeId`) y los dos van juntos o ninguno: con solo
 * el instante, la pérdida de precisión de `Date` (ms) frente al `timestamptz` de Postgres
 * (µs) abriría un hueco silencioso en la paginación. Ver `listHistoryEntriesByUser`.
 */
const ListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(HISTORY_PAGE_MAX).optional(),
    before: z.iso.datetime().optional(),
    beforeId: z.uuid().optional(),
  })
  .refine((q) => (q.before === undefined) === (q.beforeId === undefined), {
    message: 'el cursor es compuesto: `before` y `beforeId` van juntos o ninguno',
    path: ['before'],
  });

const DeleteQuerySchema = z.object({
  /** Id de la entrada a borrar. Ausente ⇒ «borrar todas» (las del usuario de la sesión). */
  id: z.uuid().optional(),
});

/**
 * Serializa una fila a la vista pública. Se construye campo a campo A PROPÓSITO (nada de
 * esparcir la fila cruda): así una columna nueva en la tabla nunca se filtra sola por la
 * API, y `user_id` —que sí está en la fila— NO viaja al cliente.
 */
function toView(row: HistoryEntry): Record<string, unknown> {
  return {
    id: row.id,
    preview: row.preview,
    inputKind: row.inputKind,
    chain: row.chain,
    createdAt: row.createdAt.toISOString(),
  };
}

export const GET = withSession(
  async ({ req, auth }) => {
    const url = new URL(req.url);
    const parsed = ListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      throw new AppError(
        'validation_error',
        'parámetros de paginación inválidos',
        z.flattenError(parsed.error),
      );
    }

    const { rows, lastCursor } = await listHistoryEntriesByUser(getDb(), auth.user.id, {
      //                                                         ^^^^^^^^^^^^ de la SESIÓN, jamás de la URL
      limit: parsed.data.limit,
      before:
        parsed.data.before && parsed.data.beforeId
          ? { createdAt: parsed.data.before, id: parsed.data.beforeId }
          : undefined,
    });

    const limit = parsed.data.limit ?? HISTORY_PAGE_MAX;
    // Solo hay cursor si la página salió llena (si no, no queda nada detrás). El cursor lo
    // fabrica el REPO con la precisión completa de Postgres (µs): reconstruirlo aquí desde
    // `row.createdAt` (un `Date` de JS, en ms) reabriría el hueco de paginación.
    const nextCursor = rows.length === limit ? lastCursor : null;

    // Validación de SALIDA contra el contrato de core (el mismo que valida el api-client).
    return Response.json(HistoryPageSchema.parse({ entries: rows.map(toView), nextCursor }));
  },
  { route: '/api/history' },
);

export const DELETE = withSession(
  async ({ req, auth }) => {
    const url = new URL(req.url);
    const parsed = DeleteQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      throw new AppError(
        'validation_error',
        'id de entrada inválido',
        z.flattenError(parsed.error),
      );
    }

    // «Borrar todas» = las del usuario de la sesión. Nunca las de nadie más.
    if (!parsed.data.id) {
      const deleted = await deleteAllHistoryEntriesForUser(getDb(), auth.user.id);
      return Response.json(HistoryDeleteResultSchema.parse({ deleted }));
    }

    // Borrado de UNA entrada, acotado por `user_id` DENTRO del WHERE del repo. Un id ajeno
    // no encuentra fila → 404 (no un 403: un 403 confirmaría que esa entrada existe y es
    // de otra persona, lo que ya es filtrar información).
    const ok = await deleteHistoryEntryForUser(getDb(), auth.user.id, parsed.data.id);
    if (!ok) throw new AppError('not_found', 'la entrada no existe');

    return Response.json(HistoryDeleteResultSchema.parse({ deleted: 1 }));
  },
  { route: '/api/history' },
);
