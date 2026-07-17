// API pública de @app/test-utils (testing/stack-setup.md §4). Este es el
// contrato que consumen los demás references: no renombres estos exports.
// `setup-env` va por su propio subpath: lo consumen los `setupFiles` de Vitest.
export { captureLogs, type CapturedLogs } from './capture-logs';
