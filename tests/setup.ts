// Global test setup
import { TestDatabase } from './helpers/TestDatabase';

// Setup global test environment
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
});

// Clean up after all tests
afterAll(async () => {
  const testDb = TestDatabase.getInstance();
  await testDb.clearAllUsers();
});

// Add custom matchers or global test utilities here if needed