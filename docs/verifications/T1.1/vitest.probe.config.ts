import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../..');

export default defineConfig({
  test: {
    name: 'verifier:probe',
    include: ['docs/verifications/T1.1/probe.test.ts'],
    environment: 'node',
    alias: {
      '@app/core/engine': resolve(root, 'packages/core/src/engine/index.ts'),
    },
  },
});
