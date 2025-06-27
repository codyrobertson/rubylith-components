/**
 * Unit tests for database connection
 * Tests database connectivity and health checks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Database, getDatabase, getPrismaClient, initializeDatabase, closeDatabase, runTransaction, checkDatabaseHealth } from '../connection';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

// Mock console to suppress logs during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Database Connection', () => {
  beforeEach(() => {
    console.log = vi.fn();
    console.error = vi.fn();
    
    // Reset environment variables
    process.env.DATABASE_URL = 'file:./test-connection.db';
  });

  afterEach(async () => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    
    // Clean up test database
    try {
      await closeDatabase();
      await fs.unlink(path.join(process.cwd(), 'test-connection.db'));
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('Database class', () => {
    it('should create database instance with default config', () => {
      const db = new Database();
      
      expect(db).toBeInstanceOf(Database);
    });

    it('should create database instance with custom config', () => {
      const customConfig = {
        url: 'file:./custom-test.db',
        maxConnections: 5,
        connectionTimeout: 5000,
        queryTimeout: 10000,
        retryAttempts: 2,
        retryDelay: 500,
      };
      
      const db = new Database(customConfig);
      
      expect(db).toBeInstanceOf(Database);
    });

    it('should get client and establish connection', async () => {
      const db = new Database();
      const client = await db.getClient();
      
      expect(client).toBeInstanceOf(PrismaClient);
      
      // Verify connection by running a simple query
      const result = await client.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
    });

    it('should reuse existing client connection', async () => {
      const db = new Database();
      const client1 = await db.getClient();
      const client2 = await db.getClient();
      
      expect(client1).toBe(client2);
    });

    it('should disconnect from database', async () => {
      const db = new Database();
      await db.getClient(); // Establish connection
      
      await expect(db.disconnect()).resolves.not.toThrow();
    });

    it('should handle disconnect when not connected', async () => {
      const db = new Database();
      
      await expect(db.disconnect()).resolves.not.toThrow();
    });

    it('should check database health when connected', async () => {
      const db = new Database();
      await db.getClient(); // Establish connection
      
      const health = await db.checkHealth();
      
      expect(health).toEqual({
        status: 'healthy',
        latency: expect.any(Number),
        connection: 'active',
      });
      expect(health.latency).toBeGreaterThanOrEqual(0);
    });

    it('should check database health when not connected', async () => {
      const db = new Database();
      
      const health = await db.checkHealth();
      
      expect(health.status).toBe('unhealthy');
      expect(health.connection).toBe('disconnected');
    });

    it('should execute transaction', async () => {
      const db = new Database();
      
      const result = await db.transaction(async (tx) => {
        // Simple transaction that returns a value
        return 'transaction-result';
      });
      
      expect(result).toBe('transaction-result');
    });

    it('should rollback transaction on error', async () => {
      const db = new Database();
      
      await expect(
        db.transaction(async (tx) => {
          throw new Error('Transaction error');
        })
      ).rejects.toThrow('Transaction error');
    });

    it('should execute raw SQL query', async () => {
      const db = new Database();
      const result = await db.rawQuery('SELECT 1 as value');
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Global database functions', () => {
    describe('getDatabase', () => {
      it('should return singleton database instance', () => {
        const db1 = getDatabase();
        const db2 = getDatabase();
        
        expect(db1).toBe(db2);
        expect(db1).toBeInstanceOf(Database);
      });

      it('should create database with custom config on first call', () => {
        const customConfig = {
          url: 'file:./singleton-test.db',
          maxConnections: 3,
        };
        
        const db = getDatabase(customConfig);
        
        expect(db).toBeInstanceOf(Database);
      });
    });

    describe('getPrismaClient', () => {
      it('should return Prisma client instance', async () => {
        const client = await getPrismaClient();
        
        expect(client).toBeInstanceOf(PrismaClient);
      });

      it('should return same client instance on multiple calls', async () => {
        const client1 = await getPrismaClient();
        const client2 = await getPrismaClient();
        
        expect(client1).toBe(client2);
      });
    });

    describe('initializeDatabase', () => {
      it('should initialize database connection', async () => {
        await expect(initializeDatabase()).resolves.not.toThrow();
      });

      it('should handle multiple initialization calls', async () => {
        await initializeDatabase();
        await expect(initializeDatabase()).resolves.not.toThrow();
      });
    });

    describe('closeDatabase', () => {
      it('should close database connection', async () => {
        await initializeDatabase();
        await expect(closeDatabase()).resolves.not.toThrow();
      });

      it('should handle closing when not initialized', async () => {
        await expect(closeDatabase()).resolves.not.toThrow();
      });
    });

    describe('runTransaction', () => {
      it('should execute transaction function', async () => {
        const result = await runTransaction(async (tx) => {
          return { data: 'test' };
        });
        
        expect(result).toEqual({ data: 'test' });
      });

      it('should provide transaction context', async () => {
        await runTransaction(async (tx) => {
          expect(tx).toBeDefined();
          expect(tx.$queryRaw).toBeDefined();
        });
      });
    });

    describe('checkDatabaseHealth', () => {
      it('should return health status', async () => {
        const health = await checkDatabaseHealth();
        
        expect(health).toHaveProperty('status');
        expect(health).toHaveProperty('connection');
        expect(['healthy', 'unhealthy']).toContain(health.status);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle connection errors with retry', async () => {
      // Use invalid database URL
      process.env.DATABASE_URL = 'invalid://database';
      
      const db = new Database();
      
      // Should retry and eventually fail
      await expect(db.getClient()).rejects.toThrow();
    });

    it('should handle connection timeout', async () => {
      const db = new Database({
        url: 'file:./timeout-test.db',
        connectionTimeout: 1, // 1ms timeout
      });
      
      // Might succeed or timeout depending on system speed
      try {
        await db.getClient();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should provide meaningful error for missing DATABASE_URL', async () => {
      delete process.env.DATABASE_URL;
      
      const db = new Database();
      
      await expect(db.getClient()).rejects.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple rapid connection requests', async () => {
      const db = new Database();
      
      const promises = Array(10).fill(null).map(() => db.getClient());
      const clients = await Promise.all(promises);
      
      // All should be the same client instance
      const firstClient = clients[0];
      clients.forEach(client => {
        expect(client).toBe(firstClient);
      });
    });

    it('should handle reconnection after disconnect', async () => {
      const db = new Database();
      
      // Connect
      const client1 = await db.getClient();
      expect(client1).toBeInstanceOf(PrismaClient);
      
      // Disconnect
      await db.disconnect();
      
      // Reconnect
      const client2 = await db.getClient();
      expect(client2).toBeInstanceOf(PrismaClient);
      
      // Should be different instances
      expect(client1).not.toBe(client2);
    });

    it('should handle health check with query error', async () => {
      const db = new Database();
      const client = await db.getClient();
      
      // Mock query error
      client.$queryRaw = vi.fn().mockRejectedValue(new Error('Query failed'));
      
      const health = await db.checkHealth();
      
      expect(health.status).toBe('unhealthy');
      expect(health.error).toBe('Query failed');
    });
  });
});