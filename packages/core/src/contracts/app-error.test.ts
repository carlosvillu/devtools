import { describe, expect, it } from 'vitest';
import { APP_ERROR_CODES, AppError } from './app-error';
import { ErrorEnvelopeSchema } from './errors';

describe('AppError', () => {
  it('deriva el status HTTP del code, sin elegirlo a mano', () => {
    expect(new AppError('validation_error', 'payload inválido').status).toBe(400);
    expect(new AppError('unauthorized', 'sesión requerida').status).toBe(401);
    expect(new AppError('not_found', 'no existe').status).toBe(404);
    expect(new AppError('payload_too_large', 'demasiado grande').status).toBe(413);
    expect(new AppError('rate_limited', 'demasiadas peticiones').status).toBe(429);
    expect(new AppError('internal', 'error interno').status).toBe(500);
  });

  it('es un Error atrapable con instanceof y conserva message y details', () => {
    const err = new AppError('validation_error', 'payload inválido', { fieldErrors: {} });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe('AppError');
    expect(err.message).toBe('payload inválido');
    expect(err.details).toEqual({ fieldErrors: {} });
  });

  it('todo code de la unión produce un envelope válido: la unión no tiene codes muertos', () => {
    for (const code of APP_ERROR_CODES) {
      const err = new AppError(code, 'x');
      const parsed = ErrorEnvelopeSchema.safeParse({
        code: err.code,
        message: err.message,
        request_id: 'req-1',
      });

      expect(parsed.success, `code ${code} fuera del envelope`).toBe(true);
      expect(Number.isInteger(err.status)).toBe(true);
    }
  });
});
