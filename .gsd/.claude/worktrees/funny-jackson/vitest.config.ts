import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/shared',
      'packages/server',
      'packages/client',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: [
        'packages/server/src/**/*.ts',
        'packages/client/src/**/*.{ts,tsx}',
        'packages/shared/src/**/*.ts',
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.d.ts',
        '**/test/**',
        '**/index.ts',
      ],
    },
  },
});
