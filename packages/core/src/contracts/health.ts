// Contrato del healthcheck público `GET /api/health` (PRD §9).
import { z } from 'zod';

// v1 de T0.1: solo `ok`. T0.2 (compose + Postgres) le añade `db: boolean` —
// la forma final del PRD §9 es `{ ok, db }`.
export const HealthSchema = z.object({
  ok: z.literal(true),
});

export type Health = z.infer<typeof HealthSchema>;
