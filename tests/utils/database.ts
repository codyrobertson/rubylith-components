/**
 * Database utilities for testing
 * Handles test database setup, teardown, and data management
 */

import { PrismaClient } from '../../generated/prisma';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export class TestDatabase {
  private client: PrismaClient | null = null;
  private dbPath: string;
  private isSetup: boolean = false;

  constructor(testSuiteName?: string) {
    // Generate unique database path for each test suite
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const suiteName = testSuiteName || 'test';
    this.dbPath = path.join(process.cwd(), 'tests', `${suiteName}-${timestamp}-${random}.db`);
    
    // Update the DATABASE_URL to use our test database
    process.env.DATABASE_URL = `file:${this.dbPath}`;
  }

  /**
   * Initialize test database
   */
  async setup(): Promise<void> {
    if (this.isSetup) {
      return;
    }

    try {
      // Ensure tests directory exists
      await fs.mkdir(path.dirname(this.dbPath), { recursive: true });

      // Run database migrations
      execSync('npx prisma db push --force-reset', {
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: `file:${this.dbPath}` },
      });

      // Create Prisma client
      this.client = new PrismaClient({
        datasources: {
          db: {
            url: `file:${this.dbPath}`,
          },
        },
        log: process.env.NODE_ENV === 'test' ? [] : ['query', 'error', 'warn'],
      });

      await this.client.$connect();
      this.isSetup = true;
      console.log(`Test database initialized: ${this.dbPath}`);
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw error;
    }
  }

  /**
   * Get Prisma client instance
   */
  getClient(): PrismaClient {
    if (!this.client) {
      throw new Error('Test database not initialized. Call setup() first.');
    }
    return this.client;
  }

  /**
   * Get Prisma client instance (alias for compatibility)
   */
  get prisma(): PrismaClient {
    return this.getClient();
  }

  /**
   * Clean all data from database
   */
  async cleanDatabase(): Promise<void> {
    if (!this.client) return;

    try {
      // Delete all records in reverse dependency order
      await this.client.component.deleteMany();
      await this.client.contract.deleteMany();
      await this.client.capability.deleteMany();
      await this.client.mountPlan.deleteMany();
      await this.client.profile.deleteMany();
      await this.client.environment.deleteMany();
      await this.client.user.deleteMany();
    } catch (error) {
      console.error('Failed to clean database:', error);
      throw error;
    }
  }

  /**
   * Seed database with basic test data
   */
  async seedDatabase(): Promise<{
    users: any[];
    contracts: any[];
    environments: any[];
    components: any[];
  }> {
    if (!this.client) {
      throw new Error('Test database not initialized');
    }

    try {
      // Create test users
      const users = await Promise.all([
        this.client.user.create({
          data: {
            email: 'owner@test.com',
            password: '$2b$10$test.hash.for.owner',
            firstName: 'Test',
            lastName: 'Owner',
            role: 'OWNER',
            isActive: true,
          },
        }),
        this.client.user.create({
          data: {
            email: 'maintainer@test.com',
            password: '$2b$10$test.hash.for.maintainer',
            firstName: 'Test',
            lastName: 'Maintainer',
            role: 'MAINTAINER',
            isActive: true,
          },
        }),
        this.client.user.create({
          data: {
            email: 'contributor@test.com',
            password: '$2b$10$test.hash.for.contributor',
            firstName: 'Test',
            lastName: 'Contributor',
            role: 'CONTRIBUTOR',
            isActive: true,
          },
        }),
      ]);

      // Create test contracts
      const contracts = await Promise.all([
        this.client.contract.create({
          data: {
            name: 'TestButton',
            version: '1.0.0',
            schemaVersion: '1.0.0',
            description: 'Test button contract',
            author: 'Test Author',
            keywords: ['button', 'ui', 'test'],
            schemaProps: { onClick: { type: 'function' } },
            schemaEvents: { click: { type: 'event' } },
            schemaMethods: { focus: { type: 'method' } },
            validationRequired: ['onClick'],
            validationOptional: ['disabled'],
            validationRules: {},
            themeTokens: [],
            themeVariants: [],
            themeNamespace: 'button',
            layoutType: 'flex',
            styleEngineType: 'css-in-js',
            styleEngineConfig: {},
            runtimeFramework: 'react',
            runtimeVersion: '18.0.0',
            runtimePolyfills: [],
            runtimeBrowserSupport: {},
            compatibilityMinSchemaVersion: '1.0.0',
            compatibilityBreakingChanges: [],
            metadata: {},
          },
        }),
        this.client.contract.create({
          data: {
            name: 'TestInput',
            version: '1.0.0',
            schemaVersion: '1.0.0',
            description: 'Test input contract',
            author: 'Test Author',
            keywords: ['input', 'form', 'test'],
            schemaProps: { value: { type: 'string' }, onChange: { type: 'function' } },
            schemaEvents: { change: { type: 'event' } },
            schemaMethods: { focus: { type: 'method' } },
            validationRequired: ['onChange'],
            validationOptional: ['placeholder'],
            validationRules: {},
            themeTokens: [],
            themeVariants: [],
            themeNamespace: 'input',
            layoutType: 'block',
            styleEngineType: 'css-in-js',
            styleEngineConfig: {},
            runtimeFramework: 'react',
            runtimeVersion: '18.0.0',
            runtimePolyfills: [],
            runtimeBrowserSupport: {},
            compatibilityMinSchemaVersion: '1.0.0',
            compatibilityBreakingChanges: [],
            metadata: {},
          },
        }),
      ]);

      // Create test environments
      const environments = await Promise.all([
        this.client.environment.create({
          data: {
            name: 'TestProduction',
            version: '1.0.0',
            description: 'Test production environment',
            provider: 'aws',
            region: 'us-east-1',
            status: 'HEALTHY',
            health: 'HEALTHY',
            deploymentTarget: 'production',
            deploymentConfig: {
              strategy: 'rolling',
              autoScale: true,
              minInstances: 2,
              maxInstances: 10,
            },
            resourcesMemoryLimit: 8192,
            resourcesCpuLimit: '4 cores',
            resourcesStorageLimit: 100,
            metadata: {},
          },
        }),
        this.client.environment.create({
          data: {
            name: 'TestStaging',
            version: '1.0.0',
            description: 'Test staging environment',
            provider: 'aws',
            region: 'us-west-2',
            status: 'HEALTHY',
            health: 'HEALTHY',
            deploymentTarget: 'staging',
            deploymentConfig: {
              strategy: 'blue-green',
              autoScale: false,
              minInstances: 1,
              maxInstances: 3,
            },
            resourcesMemoryLimit: 4096,
            resourcesCpuLimit: '2 cores',
            resourcesStorageLimit: 50,
            metadata: {},
          },
        }),
      ]);

      // Create test components
      const components = await Promise.all([
        this.client.component.create({
          data: {
            name: 'TestButton',
            version: '1.0.0',
            description: 'Test button component implementation',
            author: 'Test Author',
            keywords: ['button', 'ui', 'test'],
            contractId: contracts[0].id,
            sourceCode: 'import React from "react"; export const TestButton = () => <button>Test</button>;',
            buildArtifacts: {
              bundle: 'test-bundle.js',
              styles: 'test-styles.css',
            },
            type: 'COMPONENT',
            lifecycle: 'STABLE',
            metadata: {},
          },
        }),
        this.client.component.create({
          data: {
            name: 'TestInput',
            version: '1.0.0',
            description: 'Test input component implementation',
            author: 'Test Author',
            keywords: ['input', 'form', 'test'],
            contractId: contracts[1].id,
            sourceCode: 'import React from "react"; export const TestInput = () => <input type="text" />;',
            buildArtifacts: {
              bundle: 'test-input-bundle.js',
              styles: 'test-input-styles.css',
            },
            type: 'COMPONENT',
            lifecycle: 'STABLE',
            metadata: {},
          },
        }),
      ]);

      return { users, contracts, environments, components };
    } catch (error) {
      console.error('Failed to seed database:', error);
      throw error;
    }
  }

  /**
   * Teardown test database
   */
  async teardown(): Promise<void> {
    try {
      if (this.client) {
        await this.client.$disconnect();
        this.client = null;
      }

      // Remove test database file
      try {
        await fs.unlink(this.dbPath);
        console.log(`Test database removed: ${this.dbPath}`);
      } catch (error) {
        // Ignore if file doesn't exist
      }
    } catch (error) {
      console.error('Failed to teardown test database:', error);
    }
  }

  /**
   * Reset database to clean state
   */
  async reset(): Promise<void> {
    await this.cleanDatabase();
  }

  /**
   * Execute in transaction
   */
  async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    if (!this.client) {
      throw new Error('Test database not initialized');
    }
    return this.client.$transaction(callback);
  }

  /**
   * Clean database (alias)
   */
  async clean(): Promise<void> {
    return this.cleanDatabase();
  }

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    if (!this.client) {
      await this.setup();
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.$disconnect();
    }
  }

  /**
   * Create user helper
   */
  async createUser(data: any): Promise<any> {
    const client = this.getClient();
    return client.user.create({ data });
  }

  /**
   * Create component helper
   */
  async createComponent(data: any): Promise<any> {
    const client = this.getClient();
    return client.component.create({ data });
  }

  /**
   * Create contract helper
   */
  async createContract(data: any): Promise<any> {
    const client = this.getClient();
    return client.contract.create({ data });
  }

  /**
   * Create environment helper
   */
  async createEnvironment(data: any): Promise<any> {
    const client = this.getClient();
    return client.environment.create({ data });
  }

  /**
   * Create audit log helper
   */
  async createAuditLog(data: any): Promise<any> {
    const client = this.getClient();
    return client.auditLog.create({ data });
  }
}

// Export a factory function instead of singleton
export const createTestDatabase = (suiteName?: string) => new TestDatabase(suiteName);

// Helper to create environments
export async function createEnvironment(db: TestDatabase, data: any) {
  const client = db.getClient();
  return client.environment.create({ data });
}

// Export for backward compatibility
export const testDb = new TestDatabase('default');