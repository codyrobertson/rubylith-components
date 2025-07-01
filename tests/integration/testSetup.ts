/**
 * Test setup for integration tests
 * Ensures proper database isolation and cleanup
 */

import { TestDatabase } from '../utils/database';
import { apiServer } from '../../src/api/server';
import type { Express } from 'express';

// Global test database instance
let testDb: TestDatabase;
let app: Express;

export async function setupIntegrationTest(suiteName: string) {
  // Create test database instance
  testDb = TestDatabase.getInstance();
  
  // Setup database
  await testDb.setup();
  
  // Get the test database client
  const testClient = testDb.getClient();
  
  // Inject test client into the connection module
  const { injectPrismaClient } = await import('../../src/database/connection');
  injectPrismaClient(testClient);
  
  // Get the Express app
  app = apiServer.getApp();
  
  return {
    app,
    testDb,
    testClient
  };
}

export async function teardownIntegrationTest() {
  // Clear injected client
  const { injectPrismaClient } = await import('../../src/database/connection');
  injectPrismaClient(null);
  
  if (testDb) {
    await testDb.teardown();
  }
}

export async function cleanTestDatabase() {
  if (testDb) {
    await testDb.clean();
  }
}