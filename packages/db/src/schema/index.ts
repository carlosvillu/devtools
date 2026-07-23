// Barrel del schema (backend/db.md §1). `drizzle(pool, { schema })` recibe este
// objeto completo; añadir un dominio nuevo re-exporta aquí y basta.
// Sin `relations.ts`: los repos de esta fase usan solo query builder (selects
// simples), así se esquiva la divergencia de la API de relaciones 0.x vs 1.0.
export { user, type User, type NewUser } from './users';
export { session, type Session, type NewSession } from './sessions';
export {
  historyEntry,
  type HistoryEntry,
  type NewHistoryEntry,
  type ChainSummaryEntry,
  type HistoryDirection,
} from './history';
