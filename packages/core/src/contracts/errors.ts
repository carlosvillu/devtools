// Envelope de errores de la API (backend/references/api.md §2).
import { z } from 'zod';
import { APP_ERROR_CODES } from './app-error';

export const ErrorCodeSchema = z.enum(APP_ERROR_CODES);

export const ErrorEnvelopeSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  details: z.unknown().optional(), // p. ej. z.flattenError() en validation_error
  request_id: z.string().optional(), // el mismo id que aparece en los logs pino
});

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
