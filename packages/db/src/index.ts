// @app/db — schema Drizzle, migraciones y repos de la capa de persistencia.
//
// Dirección de dependencias (architecture.md §1):
//   core (contratos Zod, puertos) ← db (implementa) ← apps/web
// Prohibido: db exportando drizzle/pg hacia core.
export { createDb, makeDb, type Db, type DbClient, type DbTx } from './client';
export { runMigrations } from './migrate';

export * from './schema';

export { createUser, getUserById, getUserByEmail, normalizeEmail } from './repos/users.repo';
export { createSession, getSessionById, deleteSession } from './repos/sessions.repo';
export {
  HISTORY_PAGE_MAX,
  createHistoryEntry,
  deleteAllHistoryEntriesForUser,
  deleteHistoryEntryForUser,
  listHistoryEntriesByUser,
  type HistoryCursor,
  type ListHistoryOptions,
  type NewHistoryEntryInput,
} from './repos/history.repo';
