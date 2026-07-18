// API pública de @app/test-utils (testing/stack-setup.md §4). Este es el
// contrato que consumen los demás references: no renombres estos exports.
// `setup-env` va por su propio subpath: lo consumen los `setupFiles` de Vitest.
export { captureLogs, type CapturedLogs } from './capture-logs';
export { makeChain, makeChainStep, makeDetection, makeTransform } from './factories';
export { makeSession, makeUser } from './db-factories';
export { pgErrorCode } from './pg-errors';
export { createTestDatabase, type DrizzleDb, type TestDatabase } from './create-test-database';
