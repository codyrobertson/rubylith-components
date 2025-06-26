/**
 * Database connection and configuration module
 * Provides Prisma client instance with connection pooling and error handling
 */

import { PrismaClient } from '../../generated/prisma';

// =============================================================================
// Types
// =============================================================================

export interface DatabaseConfig {
  url: string;
  maxConnections?: number;
  connectionTimeout?: number;
  queryTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ConnectionHealth {
  isConnected: boolean;
  latency?: number;
  error?: string;
  timestamp: Date;
}

// =============================================================================
// Database Class
// =============================================================================

class Database {
  private client: PrismaClient | null = null;
  private config: DatabaseConfig;
  private connectionPromise: Promise<PrismaClient> | null = null;
  private isConnecting = false;
  private retryCount = 0;

  constructor(config?: Partial<DatabaseConfig>) {
    this.config = {
      url: process.env['DATABASE_URL'] || '',
      maxConnections: 10,
      connectionTimeout: 10000,
      queryTimeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Get the Prisma client instance with automatic connection management
   */
  async getClient(): Promise<PrismaClient> {
    if (this.client) {
      return this.client;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.connect();
    return this.connectionPromise;
  }

  /**
   * Establish database connection with retry logic
   */
  private async connect(): Promise<PrismaClient> {
    if (this.isConnecting) {
      throw new Error('Connection already in progress');
    }

    this.isConnecting = true;

    try {
      const client = new PrismaClient({
        datasources: {
          db: {
            url: this.config.url,
          },
        },
        log: [
          { level: 'error', emit: 'stdout' },
          { level: 'warn', emit: 'stdout' },
        ],
      });

      // Test the connection
      await client.$connect();

      this.client = client;
      this.isConnecting = false;
      this.retryCount = 0;
      this.connectionPromise = null;

      if (process.env['NODE_ENV'] !== 'test') {
        console.log('Database connection established successfully');
      }
      return client;
    } catch (error) {
      this.isConnecting = false;
      this.connectionPromise = null;

      if (this.retryCount < (this.config.retryAttempts || 3)) {
        this.retryCount++;
        if (process.env['NODE_ENV'] !== 'test') {
          console.warn(
            `Database connection failed, retrying (${this.retryCount}/${this.config.retryAttempts})...`
          );
        }

        await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay || 1000));

        return this.connect();
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to connect to database after ${this.config.retryAttempts} attempts: ${errorMessage}`
      );
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.$disconnect();
      this.client = null;
      this.connectionPromise = null;
      if (process.env['NODE_ENV'] !== 'test') {
        console.log('Database connection closed');
      }
    }
  }

  /**
   * Check database connection health
   */
  async checkHealth(): Promise<ConnectionHealth> {
    const startTime = Date.now();

    try {
      const client = await this.getClient();
      await client.$queryRaw`SELECT 1 as result`;

      return {
        isConnected: true,
        latency: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Execute a database transaction
   */
  async transaction<T>(
    callback: (
      tx: Omit<
        PrismaClient,
        '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
      >
    ) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();

    return client.$transaction(callback);
  }

  /**
   * Execute raw SQL query
   */
  async raw<T = unknown>(query: string, ...args: unknown[]): Promise<T> {
    const client = await this.getClient();
    return client.$queryRawUnsafe<T>(query, ...args);
  }
}

// =============================================================================
// Database Instance and Utilities
// =============================================================================

// Global database instance
let databaseInstance: Database | null = null;

/**
 * Get the global database instance
 */
export function getDatabase(config?: Partial<DatabaseConfig>): Database {
  if (!databaseInstance) {
    databaseInstance = new Database(config);
  }
  return databaseInstance;
}

/**
 * Get Prisma client from global database instance
 */
export async function getPrismaClient(): Promise<PrismaClient> {
  const db = getDatabase();
  return db.getClient();
}

/**
 * Initialize database connection (useful for app startup)
 */
export async function initializeDatabase(config?: Partial<DatabaseConfig>): Promise<void> {
  const db = getDatabase(config);
  await db.getClient();
  if (process.env['NODE_ENV'] !== 'test') {
    console.log('Database initialized successfully');
  }
}

/**
 * Close database connection (useful for app shutdown)
 */
export async function closeDatabase(): Promise<void> {
  if (databaseInstance) {
    await databaseInstance.disconnect();
    databaseInstance = null;
  }
}

/**
 * Execute database transaction with global instance
 */
export async function executeTransaction<T>(
  callback: (
    tx: Omit<
      PrismaClient,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >
  ) => Promise<T>
): Promise<T> {
  const db = getDatabase();
  return db.transaction(callback);
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<ConnectionHealth> {
  const db = getDatabase();
  return db.checkHealth();
}

// =============================================================================
// Exports
// =============================================================================

export { Database };
