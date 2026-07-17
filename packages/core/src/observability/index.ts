// API pública de observabilidad. La regla §11 (el input del usuario nunca se
// loguea) vive escrita en ./logger.ts — léela antes de añadir cualquier log.
export { makeLogger, type Logger, type MakeLoggerOptions } from './logger';
export { REDACT_PATHS } from './redact';
