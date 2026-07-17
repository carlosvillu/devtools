// Puertos transversales de core (backend/references/architecture.md §2).
// Un puerto es una interface que consume core y que db o una app implementan.

export interface Logger {
  trace(obj: object, msg?: string): void;
  debug(obj: object, msg?: string): void;
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
  /** Correlación: request_id (observability.md §3). */
  child(bindings: Record<string, unknown>): Logger;
}

/** Inyectable ⇒ tests deterministas sin fake timers. */
export interface Clock {
  now(): Date;
}
