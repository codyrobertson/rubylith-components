import { PrismaClient } from '../../generated/prisma';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { setupTestDatabase } from '../setup/setupTestDb';

export class TestDatabase {
  private static instance: TestDatabase;
  private static instanceCount = 0;
  private client: PrismaClient | null = null;
  private dbPath: string;
  private dbUrl: string;
  private isConnected: boolean = false;
  private isSetup: boolean = false;

  private constructor() {
    // Ensure test directory exists
    const testDir = path.join(process.cwd(), 'tests', 'db');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create unique database file for this test run
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    this.dbPath = path.join(testDir, `test-${timestamp}-${random}.db`);
    this.dbUrl = `file:${this.dbPath}`;
  }

  static getInstance(): TestDatabase {
    if (!TestDatabase.instance) {
      TestDatabase.instance = new TestDatabase();
      TestDatabase.instanceCount++;
      console.log(`Creating TestDatabase instance #${TestDatabase.instanceCount}`);
    }
    return TestDatabase.instance;
  }

  async setup(): Promise<void> {
    if (this.isSetup) {
      console.log('TestDatabase already setup, skipping...');
      return;
    }
    
    try {
      // Setup the test database schema
      setupTestDatabase(this.dbUrl);

      // Create new Prisma client with explicit datasource
      this.client = new PrismaClient({
        datasources: {
          db: {
            url: this.dbUrl
          }
        },
        log: ['error', 'warn'] // Reduce logging to prevent stack overflow
      });

      // Connect to database
      await this.client.$connect();
      this.isConnected = true;
      this.isSetup = true;

      // Clear all data for a fresh start
      console.log('Initial clear of test database...');
      await this.clearAllData();
    } catch (error: any) {
      console.error('Database setup failed:', error);
      throw new Error(`Failed to setup test database: ${error.message}`);
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      // Get list of tables that actually exist
      const tables = await this.client.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%' 
        AND name NOT LIKE '_prisma_%'
      `;
      
      const tableNames = tables.map(t => t.name);
      console.log('Tables found in database:', tableNames);

      // Clear tables in order, only if they exist
      const clearOperations = [];
      
      if (tableNames.includes('MountPlan')) {
        clearOperations.push(this.client.mountPlan.deleteMany());
      }
      if (tableNames.includes('ComponentRequires')) {
        clearOperations.push(this.client.componentRequires.deleteMany());
      }
      if (tableNames.includes('ComponentProvides')) {
        clearOperations.push(this.client.componentProvides.deleteMany());
      }
      if (tableNames.includes('ComponentDependency')) {
        clearOperations.push(this.client.componentDependency.deleteMany());
      }
      if (tableNames.includes('Contract')) {
        clearOperations.push(this.client.contract.deleteMany());
      }
      if (tableNames.includes('Capability')) {
        clearOperations.push(this.client.capability.deleteMany());
      }
      if (tableNames.includes('Environment')) {
        clearOperations.push(this.client.environment.deleteMany());
      }
      if (tableNames.includes('Component')) {
        clearOperations.push(this.client.component.deleteMany());
      }
      if (tableNames.includes('Profile')) {
        clearOperations.push(this.client.profile.deleteMany());
      }
      if (tableNames.includes('User')) {
        clearOperations.push(this.client.user.deleteMany());
      }

      if (clearOperations.length > 0) {
        await this.client.$transaction(clearOperations);
      }
    } catch (error) {
      console.warn('Failed to clear all data:', error);
      // Try to clear tables individually
      const tables = ['User', 'Component', 'Environment', 'Contract', 'Profile'];
      for (const table of tables) {
        try {
          await this.client[table.toLowerCase()].deleteMany();
        } catch (e) {
          // Ignore errors for non-existent tables
        }
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.$disconnect();
      this.isConnected = false;
    }
  }

  async teardown(): Promise<void> {
    await this.disconnect();
    
    // Remove database file
    if (fs.existsSync(this.dbPath)) {
      try {
        fs.unlinkSync(this.dbPath);
      } catch (error: any) {
        console.warn(`Failed to delete test database: ${error.message}`);
      }
    }
    
    this.client = null;
  }

  async clean(): Promise<void> {
    await this.clearAllData();
  }

  async cleanDatabase(): Promise<void> {
    await this.clearAllData();
  }

  getClient(): PrismaClient {
    if (!this.client || !this.isConnected) {
      throw new Error('Test database not initialized. Call setup() first.');
    }
    return this.client;
  }

  get prisma(): PrismaClient {
    return this.getClient();
  }

  // Helper methods for creating test data
  async createUser(data: any): Promise<any> {
    const client = this.getClient();
    
    // Remove isActive if present, use status instead
    const { isActive, ...cleanData } = data;
    if (isActive !== undefined && !cleanData.status) {
      cleanData.status = isActive ? 'ACTIVE' : 'INACTIVE';
    }
    
    return client.user.create({
      data: {
        email: cleanData.email,
        password: cleanData.password,
        firstName: cleanData.firstName || 'Test',
        lastName: cleanData.lastName || 'User',
        role: cleanData.role || 'CONSUMER',
        status: cleanData.status || 'ACTIVE',
        ...cleanData
      }
    });
  }

  async createComponent(data: any): Promise<any> {
    const client = this.getClient();
    
    if (!data.name) {
      throw new Error('Component name is required');
    }
    if (!data.version) {
      data.version = '1.0.0';
    }
    if (!data.createdById) {
      throw new Error('Component createdById is required');
    }

    return client.component.create({
      data: {
        name: data.name,
        version: data.version,
        type: data.type || 'UI_COMPONENT',
        lifecycle: data.lifecycle || 'DEVELOPMENT',
        description: data.description || 'Test component',
        author: data.author || 'Test Author',
        license: data.license || 'MIT',
        keywords: data.keywords || ['test'],
        metadata: data.metadata || {},
        createdById: data.createdById,
        ...data
      }
    });
  }

  async createContract(data: any): Promise<any> {
    const client = this.getClient();
    
    if (!data.name) {
      throw new Error('Contract name is required');
    }
    if (!data.version) {
      throw new Error('Contract version is required');
    }
    if (!data.createdById) {
      throw new Error('Contract createdById is required');
    }

    return client.contract.create({ 
      data: {
        ...data,
        schemaVersion: data.schemaVersion || '1.0.0',
        description: data.description || 'Test contract',
        author: data.author || 'Test Author',
        keywords: data.keywords || ['test'],
        schemaProps: data.schemaProps || {},
        schemaEvents: data.schemaEvents || {},
        schemaMethods: data.schemaMethods || {},
        metadata: data.metadata || {}
      }
    });
  }

  async createEnvironment(data: any): Promise<any> {
    const client = this.getClient();
    
    if (!data.name) {
      throw new Error('Environment name is required');
    }
    if (!data.version) {
      data.version = '1.0.0';
    }
    if (!data.createdById) {
      throw new Error('Environment createdById is required');
    }

    return client.environment.create({
      data: {
        name: data.name,
        version: data.version,
        status: data.status || 'ACTIVE',
        health: data.health || 'HEALTHY',
        description: data.description || 'Test environment',
        provider: data.provider || 'test',
        deploymentTarget: data.deploymentTarget || 'test',
        deploymentConfig: data.deploymentConfig || {},
        metadata: data.metadata || {},
        createdById: data.createdById,
        ...data
      }
    });
  }

  async createAuditLog(data: any): Promise<any> {
    const client = this.getClient();
    // Ensure the AuditLog model exists in your schema
    return (client as any).auditLog?.create({ data }) || null;
  }
}

// Factory function to create test database instances
export const createTestDatabase = (suiteName?: string) => TestDatabase.getInstance();

// Helper to create environments
export async function createEnvironment(db: TestDatabase, data: any) {
  return db.createEnvironment(data);
}

// Export for backward compatibility
export const testDb = TestDatabase.getInstance();