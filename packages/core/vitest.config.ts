import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'core:unit',
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
    environment: 'node',
    setupFiles: ['@app/test-utils/setup-env'],
  },
});
