import { PrismaClient } from '../../generated/prisma';

let prisma: PrismaClient;
let injectedClient: PrismaClient | null = null;

/**
 * Inject a custom PrismaClient instance (useful for testing)
 */
export function injectPrismaClient(client: PrismaClient | null): void {
  injectedClient = client;
  if (client === null) {
    // Reset the singleton when clearing injection
    prisma = null as any;
  }
}

/**
 * Returns a singleton instance of the PrismaClient.
 * It initializes the client on the first call.
 */
export function getPrismaClient(): PrismaClient {
  // If a client was injected, use it
  if (injectedClient) {
    return injectedClient;
  }
  
  if (!prisma) {
    const isDatabaseTest = process.env.NODE_ENV === 'test';
    const defaultUrl = isDatabaseTest ? 'file:./prisma/test.db' : 'file:./dev.db';
    
    prisma = new PrismaClient({
      datasources: { 
        db: { 
          url: process.env.DATABASE_URL || defaultUrl
        } 
      },
    });
  }
  return prisma;
}

/**
 * Establishes the database connection.
 */
export async function initializeDatabase(): Promise<void> {
  const client = getPrismaClient();
  await client.$connect();
  if (process.env['NODE_ENV'] !== 'test') {
    console.log('Database initialized successfully');
  }
}

/**
 * Closes the database connection.
 */
export async function closeDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}

// Legacy Database class for backward compatibility
export class Database {
  private static connected = false;
  private static instance: Database | null = null;

  constructor(config?: any) {
    // Accept config parameter for test compatibility
  }

  async getClient(): Promise<PrismaClient> {
    if (!Database.connected) {
      await initializeDatabase();
      Database.connected = true;
    }
    return getPrismaClient();
  }

  async disconnect(): Promise<void> {
    await closeDatabase();
    Database.connected = false;
  }

  async checkHealth(): Promise<{ status: string; connection: string; latency?: number }> {
    try {
      const start = Date.now();
      const client = await this.getClient();
      await client.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      return { status: 'healthy', connection: 'active', latency };
    } catch (error) {
      return { status: 'unhealthy', connection: 'error' };
    }
  }

  async transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    return client.$transaction(fn);
  }

  async raw<T = any>(query: string, values?: any[]): Promise<T> {
    const client = await this.getClient();
    return client.$queryRawUnsafe(query, ...(values || []));
  }

  async rawQuery<T = any>(query: string, values?: any[]): Promise<T> {
    return this.raw<T>(query, values);
  }
}

// Export legacy functions for backward compatibility
export async function runTransaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
  const db = new Database();
  return db.transaction(fn);
}

export function getDatabase(config?: any) {
  if (!Database.instance) {
    Database.instance = new Database(config);
  }
  return Database.instance;
}

export async function checkDatabaseHealth() {
  const db = new Database();
  return db.checkHealth();
}

export async function executeTransaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
  return runTransaction(fn);
}