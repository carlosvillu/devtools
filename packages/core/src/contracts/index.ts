// API pública de los contratos transversales de core: los que cruzan módulos o
// viajan al frontend (architecture.md §4).
export { APP_ERROR_CODES, AppError, type AppErrorCode } from './app-error';
export { ErrorCodeSchema, ErrorEnvelopeSchema, type ErrorEnvelope } from './errors';
export { HealthSchema, type Health } from './health';
