// Contrato del healthcheck público `GET /api/health` (PRD §9).
import { z } from 'zod';

// v2 de T0.2 (compose + Postgres): `{ ok, db }` — la forma final del PRD §9.
// `ok` es SIEMPRE true (la web sirve); `db` refleja si Postgres respondió en este
// instante. Un `db:false` NO es un fallo de la ruta: es el estado observable de
// «la web vive pero la BD no contesta» (control negativo de la Verificación).
export const HealthSchema = z.object({
  ok: z.literal(true),
  db: z.boolean(),
});

export type Health = z.infer<typeof HealthSchema>;
