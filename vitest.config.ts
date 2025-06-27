import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'src/**/__tests__/**/*.{test,spec}.{ts,tsx}', 
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}'
    ],
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
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
      '@/types': resolve(__dirname, './src/types'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/components': resolve(__dirname, './src/components'),
      '@/contracts': resolve(__dirname, './src/contracts'),
      '@/registry': resolve(__dirname, './src/registry'),
      '@/adapters': resolve(__dirname, './src/adapters'),
      '@/environments': resolve(__dirname, './src/environments'),
    },
  },
});
