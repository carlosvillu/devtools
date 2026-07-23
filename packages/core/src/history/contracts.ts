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
import { DataKindSchema, MAX_COMPOSE_STEPS } from '../engine/contracts';
import { ENCODE_TRANSFORM_IDS } from '../engine/encode-transforms';

/** Un paso del resumen de cadena persistido: kind detectado + transformación aplicada. */
export const HistoryChainStepSchema = z.object({
  kind: DataKindSchema,
  /** `null` en el paso terminal (no se aplicó transformación). */
  transformId: z.string().nullable(),
});
export type HistoryChainStep = z.infer<typeof HistoryChainStepSchema>;

/**
 * Dirección del motor que produjo la entrada (§9, D10). Enum CERRADO: se declara aquí, en core,
 * y NO se importa de `@app/db` (la dirección de dependencias es db → core, nunca al revés). Es
 * estructuralmente el mismo literal que `HistoryDirection` de la capa de persistencia.
 */
export const HistoryDirectionSchema = z.enum(['decode', 'compose']);
export type HistoryDirection = z.infer<typeof HistoryDirectionSchema>;

/**
 * 🔴 EL CUERPO DE `POST /api/history` (T6.10, D10) — la frontera de persistencia de una receta.
 *
 * Recibe EXCLUSIVAMENTE la receta: `steps: [{ transform_id, kind }]`. Todo lo demás se rechaza,
 * y esa exclusión es una DECISIÓN DE SEGURIDAD, no una comodidad de validación:
 *
 *   · `.strict()` EN LOS DOS NIVELES (el sobre y cada paso). El secreto de firma de `jwt.sign`
 *     vive en `ComposeStepSpec.options` (§11, T6.5/T6.8); §9 dice que lo que se persiste es la
 *     RECETA. Nada en `core` puede impedir que este borde escriba `options.secret` en la BD si lo
 *     aceptara — es exactamente el camino por el que un secreto acabaría en `psql`. Por eso el
 *     schema es ALLOWLIST: enumera lo que ENTRA (`transform_id`, `kind`) y RECHAZA con 400 todo
 *     lo demás (`source`, `output`, `secret`, `preview`, `options`, `userId`…). Una blacklist se
 *     quedaría corta en cuanto apareciera un campo nuevo; una allowlist no.
 *   · `transform_id` se valida CONTRA EL CATÁLOGO DEL MOTOR (`ENCODE_TRANSFORM_IDS`), no contra
 *     una lista suelta que se desincronizaría (§6.6). Un id fuera del catálogo → 400.
 *   · `kind` se valida contra `DataKindSchema` (el mismo enum del motor): es dato del motor
 *     (detectado sobre la salida, I10), no del usuario.
 *   · `.min(1)`: una receta vacía no deja rastro que persistir (I12: `output === source`), así
 *     que no crea fila. `.max(MAX_COMPOSE_STEPS)`: el tope de 8 (§6.6, I2).
 *
 * NO lleva `userId`: el dueño lo pone el servidor desde la sesión (`withSession`), jamás el
 * cliente — intentar fijarlo en el cuerpo lo rechaza `.strict()`.
 */
export const HistoryComposeStepSchema = z
  .object({
    transform_id: z.string().refine((id) => ENCODE_TRANSFORM_IDS.has(id), {
      message: 'transform_id no está en el catálogo de codificación',
    }),
    kind: DataKindSchema,
  })
  .strict();
export type HistoryComposeStep = z.infer<typeof HistoryComposeStepSchema>;

export const HistoryComposeBodySchema = z
  .object({
    steps: z.array(HistoryComposeStepSchema).min(1).max(MAX_COMPOSE_STEPS),
  })
  .strict();
export type HistoryComposeBody = z.infer<typeof HistoryComposeBodySchema>;

/**
 * Una entrada de historial tal y como viaja por HTTP.
 * `createdAt` es un STRING ISO: JSON no tiene tipo fecha, así que el contrato declara lo
 * que de verdad cruza el cable (un `z.date()` aquí fallaría en cada carga del cliente).
 */
export const HistoryEntryViewSchema = z.object({
  id: z.uuid(),
  /** Vista previa YA redactada y truncada (≤120). Nunca el dato crudo (D7). Para una entrada
   *  de composición es una ETIQUETA SINTÉTICA del servidor («compuesto · N pasos»), no dato. */
  preview: z.string(),
  inputKind: DataKindSchema,
  chain: z.array(HistoryChainStepSchema),
  /** Dirección del motor: la fila la distingue en `/history` (un análisis de una receta) y
   *  el «reabrir» ramifica por ella (decode → diálogo; compose → restaura los pasos en
   *  `/compose`). Es dato del motor, nunca del usuario. */
  direction: HistoryDirectionSchema,
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
