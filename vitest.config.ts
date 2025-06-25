import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
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
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
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
