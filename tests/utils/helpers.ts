/**
 * Test helper utilities
 * Common testing utilities and helper functions
 */

import request from 'supertest';
import type { Express } from 'express';
import { PasswordService, TokenService } from '../../src/api/utils/auth';
import { testDb } from './database';

/**
 * API test helper class
 */
export class ApiTestHelper {
  private app: Express;
  private tokens: Map<string, string> = new Map();

  constructor(app: Express) {
    this.app = app;
  }

  /**
   * Make authenticated request
   */
  authenticatedRequest(method: 'get' | 'post' | 'put' | 'patch' | 'delete', endpoint: string, userEmail?: string) {
    const req = request(this.app)[method](endpoint);
    
    if (userEmail && this.tokens.has(userEmail)) {
      req.set('Authorization', `Bearer ${this.tokens.get(userEmail)}`);
    }
    
    return req;
  }

  /**
   * Login user and store token
   */
  async loginUser(email: string, password: string = 'password123'): Promise<string> {
    const response = await request(this.app)
      .post('/api/v1/public/auth/login')
      .send({ email, password })
      .expect(200);

    const token = response.body.data.tokens.accessToken;
    this.tokens.set(email, token);
    return token;
  }

  /**
   * Register and login user
   */
  async registerAndLoginUser(userData: {
    email: string;
    password: string;
    name: string;
  }): Promise<{ user: any; token: string }> {
    // Register user
    const registerResponse = await request(this.app)
      .post('/api/v1/public/auth/register')
      .send(userData)
      .expect(201);

    const user = registerResponse.body.data.user;
    const token = registerResponse.body.data.tokens.accessToken;
    this.tokens.set(userData.email, token);

    return { user, token };
  }

  /**
   * Clear stored tokens
   */
  clearTokens(): void {
    this.tokens.clear();
  }

  /**
   * Get stored token for user
   */
  getToken(userEmail: string): string | undefined {
    return this.tokens.get(userEmail);
  }
}

/**
 * Auth test utilities
 */
export class AuthTestUtils {
  /**
   * Generate test JWT token
   */
  static async generateTestToken(userId: string, role: string = 'CONTRIBUTOR'): Promise<string> {
    return TokenService.generateAccessToken({ id: userId, role });
  }

  /**
   * Hash test password
   */
  static async hashTestPassword(password: string): Promise<string> {
    return PasswordService.hashPassword(password);
  }

  /**
   * Verify test password
   */
  static async verifyTestPassword(password: string, hash: string): Promise<boolean> {
    return PasswordService.verifyPassword(password, hash);
  }

  /**
   * Create test user with hashed password
   */
  static async createTestUser(userData: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    isActive?: boolean;
  }) {
    const hashedPassword = await AuthTestUtils.hashTestPassword(userData.password || 'password123');
    
    return testDb.getClient().user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName || 'Test',
        lastName: userData.lastName || 'User',
        role: userData.role as any || 'CONTRIBUTOR',
        isActive: userData.isActive !== false,
      },
    });
  }
}

/**
 * Data validation utilities
 */
export class ValidationTestUtils {
  /**
   * Assert response has correct structure
   */
  static assertResponseStructure(response: any, expectedKeys: string[]): void {
    expect(response).toBeDefined();
    expect(typeof response).toBe('object');
    
    expectedKeys.forEach(key => {
      expect(response).toHaveProperty(key);
    });
  }

  /**
   * Assert pagination structure
   */
  static assertPaginationStructure(pagination: any): void {
    ValidationTestUtils.assertResponseStructure(pagination, [
      'limit',
      'offset', 
      'total',
      'hasMore'
    ]);
    
    expect(typeof pagination.limit).toBe('number');
    expect(typeof pagination.offset).toBe('number');
    expect(typeof pagination.total).toBe('number');
    expect(typeof pagination.hasMore).toBe('boolean');
  }

  /**
   * Assert error response structure
   */
  static assertErrorResponseStructure(response: any): void {
    ValidationTestUtils.assertResponseStructure(response, [
      'error',
      'timestamp',
      'path'
    ]);
    
    ValidationTestUtils.assertResponseStructure(response.error, [
      'message',
      'code'
    ]);
  }

  /**
   * Assert user object structure
   */
  static assertUserStructure(user: any): void {
    ValidationTestUtils.assertResponseStructure(user, [
      'id',
      'email',
      'firstName',
      'lastName',
      'role',
      'isActive',
      'createdAt',
      'updatedAt'
    ]);
    
    // Should not contain password
    expect(user).not.toHaveProperty('password');
  }

  /**
   * Assert component object structure
   */
  static assertComponentStructure(component: any): void {
    ValidationTestUtils.assertResponseStructure(component, [
      'id',
      'name',
      'version',
      'description',
      'author',
      'keywords',
      'contractId',
      'sourceCode',
      'type',
      'lifecycle',
      'createdAt',
      'updatedAt'
    ]);
  }

  /**
   * Assert contract object structure
   */
  static assertContractStructure(contract: any): void {
    ValidationTestUtils.assertResponseStructure(contract, [
      'id',
      'name',
      'version',
      'schemaVersion',
      'description',
      'author',
      'keywords',
      'schemaProps',
      'schemaEvents',
      'schemaMethods',
      'runtimeFramework',
      'runtimeVersion',
      'createdAt',
      'updatedAt'
    ]);
  }

  /**
   * Assert environment object structure
   */
  static assertEnvironmentStructure(environment: any): void {
    ValidationTestUtils.assertResponseStructure(environment, [
      'id',
      'name',
      'version',
      'description',
      'provider',
      'status',
      'health',
      'deploymentTarget',
      'createdAt',
      'updatedAt'
    ]);
  }
}

/**
 * Mock data generators
 */
export class MockDataUtils {
  /**
   * Generate random string
   */
  static randomString(length: number = 10): string {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  /**
   * Generate random email
   */
  static randomEmail(): string {
    return `test-${MockDataUtils.randomString(8)}@example.com`;
  }

  /**
   * Generate semantic version
   */
  static randomVersion(): string {
    const major = Math.floor(Math.random() * 10);
    const minor = Math.floor(Math.random() * 10);
    const patch = Math.floor(Math.random() * 10);
    return `${major}.${minor}.${patch}`;
  }

  /**
   * Generate mock component data
   */
  static mockComponentData(overrides: any = {}): any {
    return {
      name: `TestComponent${MockDataUtils.randomString(5)}`,
      version: MockDataUtils.randomVersion(),
      description: `Test component ${MockDataUtils.randomString(8)}`,
      author: 'Test Author',
      keywords: ['test', 'component'],
      sourceCode: 'import React from "react"; export const Component = () => <div>Test</div>;',
      buildArtifacts: {},
      ...overrides,
    };
  }

  /**
   * Generate mock contract data
   */
  static mockContractData(overrides: any = {}): any {
    return {
      name: `TestContract${MockDataUtils.randomString(5)}`,
      version: MockDataUtils.randomVersion(),
      schemaVersion: '1.0.0',
      description: `Test contract ${MockDataUtils.randomString(8)}`,
      author: 'Test Author',
      keywords: ['test', 'contract'],
      schemaProps: {},
      schemaEvents: {},
      schemaMethods: {},
      validationRequired: [],
      validationOptional: [],
      validationRules: {},
      themeTokens: [],
      themeVariants: [],
      themeNamespace: 'test',
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
      ...overrides,
    };
  }

  /**
   * Generate mock environment data
   */
  static mockEnvironmentData(overrides: any = {}): any {
    return {
      name: `TestEnv${MockDataUtils.randomString(5)}`,
      version: MockDataUtils.randomVersion(),
      description: `Test environment ${MockDataUtils.randomString(8)}`,
      provider: 'aws',
      region: 'us-east-1',
      status: 'HEALTHY',
      health: 'HEALTHY',
      deploymentTarget: 'testing',
      deploymentConfig: {
        strategy: 'rolling',
        autoScale: false,
      },
      metadata: {},
      ...overrides,
    };
  }
}

/**
 * Test timing utilities
 */
export class TimingUtils {
  /**
   * Wait for specified milliseconds
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 100
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await TimingUtils.wait(delay);
      }
    }
    
    throw lastError!;
  }
}