import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'packages/**/dist/',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@woovi/client': path.resolve(__dirname, './packages/client/src'),
      '@woovi/server': path.resolve(__dirname, './packages/server/src'),
    },
  },
});
