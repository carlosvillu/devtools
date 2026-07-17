// Raíz de @app/core: re-exporta lo transversal mínimo (architecture.md §3).
// Los módulos de dominio (el motor de detección/transformación, F1) llegarán como
// subpath exports propios.
export * from './contracts';
export type { Clock, Logger } from './ports';
