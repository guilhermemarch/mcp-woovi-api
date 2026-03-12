import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', 'node_modules', 'dist', '.worktrees/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '.worktrees/**',
        '**/.worktrees/**',
        'node_modules/',
        'dist/',
        'packages/**/dist/',
        '**/*.spec.ts',
        '**/*.test.ts',
        'qa-scenarios.js',
        'qa-scenarios.ts',
        'packages/teste.ts',
        'scripts/**',
        'packages/server/src/http.ts',
        'packages/server/src/stdio.ts',
        'packages/server/src/tools/index.ts',
        'packages/server/src/index.ts',
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 65,
      },
    },
  },
  resolve: {
    alias: {
      '@woovi/client': path.resolve(__dirname, './packages/client/src'),
      '@woovi/server': path.resolve(__dirname, './packages/server/src'),
    },
  },
});
