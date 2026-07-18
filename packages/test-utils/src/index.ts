// API pública de @app/test-utils (testing/stack-setup.md §4). Este es el
// contrato que consumen los demás references: no renombres estos exports.
// `setup-env` va por su propio subpath: lo consumen los `setupFiles` de Vitest.
export { captureLogs, type CapturedLogs } from './capture-logs';
export { makeChain, makeChainStep, makeDetection, makeTransform } from './factories';
export { makeSession, makeUser } from './db-factories';
export { pgErrorCode } from './pg-errors';
export { createTestDatabase, type DrizzleDb, type TestDatabase } from './create-test-database';
// El harness de contenedor, expuesto para scripts FUERA de vitest (p. ej. el stack E2E
// de apps/web): arrancan su propio Postgres + template y clonan con createTestDatabase.
export { startPostgresContainer, withDatabaseName } from './postgres-container';
