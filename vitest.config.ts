import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.mjs'],
    include: [
      'src/**/__tests__/**/*.{test,spec}.{ts,tsx}', 
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}'
    ],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: true
      }
    },
    sequence: {
      // Run database tests sequentially to avoid conflicts
      concurrent: false
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        '**/__mocks__/**',
        '**/__tests__/setup.ts',
        '**/__tests__/**',
        '**/generated/**',
        'tests/setup.ts',
        'tests/utils/**'
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false // Disable parallel file execution for database tests
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/contracts': path.resolve(__dirname, './src/contracts'),
      '@/registry': path.resolve(__dirname, './src/registry'),
      '@/adapters': path.resolve(__dirname, './src/adapters'),
      '@/environments': path.resolve(__dirname, './src/environments'),
    },
  },
});
