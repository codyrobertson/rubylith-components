import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'unit',
      include: ['src/**/*.test.ts'],
      // Exclude the database-dependent tests from the parallel pool
      exclude: ['src/database/__tests__/*.test.ts'],
    },
  },
  {
    test: {
      name: 'database-integration',
      // Group all DB-dependent tests into one pool
      include: ['src/database/__tests__/*.test.ts', 'tests/integration/**/*.test.ts'],
      // This is the critical setting that solves the "database is locked" error
      poolOptions: {
        threads: {
          singleThread: true,
        },
      },
    },
  },
]);