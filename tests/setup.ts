import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.PORT = '0'; // Use random port for tests

// Ensure tests directory exists
const testsDir = path.join(process.cwd(), 'tests');
if (!fs.existsSync(testsDir)) {
  fs.mkdirSync(testsDir, { recursive: true });
}

beforeAll(() => {
  console.log('Test environment initialized');
});

afterAll(async () => {
  // Clean up any remaining test databases
  const files = fs.readdirSync(testsDir);
  for (const file of files) {
    if (file.endsWith('.db')) {
      try {
        fs.unlinkSync(path.join(testsDir, file));
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
});

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
