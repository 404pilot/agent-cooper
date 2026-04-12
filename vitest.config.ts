import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30000,
    exclude: ['tests/integration/pre-deploy/**', 'node_modules/**', '.deploy/**'],
  },
});
