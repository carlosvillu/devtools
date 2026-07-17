// AppError: la ÚNICA clase de error del proyecto (architecture.md §5).
// Los servicios lanzan AppError con code semántico — jamás `throw new Error(...)`:
// el frontend hace switch sobre `code` y el wording de `message` no es contrato.

// Unión acotada al dominio REAL de devtools (architecture.md §5: «los codes que tu
// proyecto no necesite se eliminan al arrancar — una unión con codes muertos miente»):
// - sin webhooks (§5.2 del PRD) → sin `invalid_signature`
// - sin máquina de estados (§5.2) → sin `invalid_transition`
// - sin APIs de pago ni proveedores externos (D8) → sin `provider_error`
// `unauthorized` y `rate_limited` los estrena T0.4 (auth + rate limit por IP, §11).
export const APP_ERROR_CODES = [
  'validation_error',
  'unauthorized',
  'not_found',
  'rate_limited',
  'internal',
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

const STATUS: Record<AppErrorCode, number> = {
  validation_error: 400,
  unauthorized: 401,
  not_found: 404,
  rate_limited: 429,
  internal: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS[code]; // el status deriva del code: nadie elige un HTTP status a mano
    this.details = details;
  }
}
