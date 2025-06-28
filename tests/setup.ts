/**
 * Vitest test setup and global configuration
 * Runs before all tests to set up the testing environment
 */

import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({
  path: path.join(__dirname, '..', '.env.test'),
});

// Set test environment
process.env.NODE_ENV = 'test';

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

export {};
