import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  validateComponent,
  validateContract,
  validateEnvironment,
  validateCapability,
  safeValidateComponent,
  ValidationError,
  createValidationError,
} from '../validation';
import type { Component, Contract, Environment, Capability } from '../types';

describe('Validation', () => {
  describe('Component validation', () => {
    it('validates a valid component successfully', () => {
      const validComponent: Component = {
        name: 'test-component',
        version: '1.0.0',
        type: 'ui-component',
        lifecycle: 'stable',
        description: 'A test component',
        author: 'Test Author',
        license: 'MIT',
        keywords: ['test', 'component'],
        dependencies: [],
        provides: [],
        requires: [],
        contract: { name: 'test-contract', version: '1.0.0' },
        metadata: {},
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      expect(() => validateComponent(validComponent)).not.toThrow();
      const result = validateComponent(validComponent);
      expect(result.name).toBe('test-component');
    });

    it('throws validation error for invalid component', () => {
      const invalidComponent = {
        name: '', // Invalid: empty name
        version: 'invalid-version', // Invalid: not semver
        type: 'invalid-type', // Invalid: not valid component type
      };

      expect(() => validateComponent(invalidComponent)).toThrow();
    });

    it('safely validates component without throwing', () => {
      const invalidComponent = {
        name: '',
        version: 'invalid',
      };

      const result = safeValidateComponent(invalidComponent);
      expect(result.success).toBe(false);
      expect(result.data).toBe(null);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Contract validation', () => {
    it('validates a valid contract successfully', () => {
      const validContract: Contract = {
        name: 'test-contract',
        version: '1.0.0',
        schemaVersion: '1.0.0',
        description: 'A test contract',
        author: 'Test Author',
        keywords: ['test'],
        schema: {
          required: ['children'],
          properties: {
            children: {
              type: 'string',
              description: 'Child content',
            },
          },
        },
        validation: {
          schema: {
            required: ['children'],
            properties: {
              children: {
                type: 'string',
              },
            },
          },
        },
        theme: {
          tokens: [],
          variants: [],
          namespace: 'test',
        },
        layout: {},
        styleEngine: {
          engine: 'css-modules',
          config: {},
        },
        runtime: {
          framework: 'react',
          frameworkVersion: '^18.0.0',
          browsers: ['chrome', 'firefox'],
          environment: 'browser',
          moduleFormat: 'esm',
        },
        compatibility: {
          minSchemaVersion: '1.0.0',
        },
        metadata: {},
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      expect(() => validateContract(validContract)).not.toThrow();
      const result = validateContract(validContract);
      expect(result.name).toBe('test-contract');
    });
  });

  describe('Environment validation', () => {
    it('validates a valid environment successfully', () => {
      const validEnvironment: Environment = {
        id: 'test-env',
        name: 'Test Environment',
        description: 'A test environment',
        type: 'development',
        status: 'active',
        version: '1.0.0',
        capabilities: [],
        runtime: {
          framework: 'react',
          frameworkVersion: '18.0.0',
          browsers: ['chrome'],
          polyfills: [],
        },
        constraints: {
          maxMemory: 1024,
          maxCpu: 80,
          bandwidth: {
            download: 100,
            upload: 50,
          },
          storage: {
            local: 100,
            session: 50,
            cache: 200,
          },
          execution: {
            maxRenderTime: 1000,
            maxApiTime: 5000,
            scriptTimeout: 10000,
          },
        },
        deployment: {
          strategy: 'rolling',
          scaling: {
            min: 1,
            max: 5,
            auto: true,
            metrics: ['cpu', 'memory'],
          },
          loadBalancing: {
            algorithm: 'round-robin',
            healthCheck: {
              path: '/health',
              interval: 30,
              timeout: 5,
              retries: 3,
            },
          },
        },
        security: {
          cors: {
            origins: ['*'],
            methods: ['GET', 'POST'],
            headers: ['Content-Type'],
          },
          auth: {
            required: false,
            providers: [],
          },
        },
        health: {
          status: 'healthy',
          score: 95,
          lastCheck: '2023-01-01T00:00:00.000Z',
          indicators: {
            cpu: 45,
            memory: 60,
            latency: 100,
            errorRate: 0.1,
          },
          checks: [],
        },
        compatibility: {
          supportedTypes: ['ui-component'],
          blacklist: [],
          constraints: {},
        },
        metadata: {},
        owner: 'test-owner',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      expect(() => validateEnvironment(validEnvironment)).not.toThrow();
      const result = validateEnvironment(validEnvironment);
      expect(result.id).toBe('test-env');
    });
  });

  describe('Capability validation', () => {
    it('validates a valid capability successfully', () => {
      const validCapability: Capability = {
        id: 'test-capability',
        name: 'Test Capability',
        type: 'theme-provider',
        version: '1.0.0',
        description: 'A test capability',
        provider: 'test-provider',
        config: {},
        compatibility: {},
        dependencies: [],
        features: {
          flags: [],
          defaults: {},
          optional: {},
        },
        metadata: {},
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      expect(() => validateCapability(validCapability)).not.toThrow();
      const result = validateCapability(validCapability);
      expect(result.id).toBe('test-capability');
    });
  });

  describe('ValidationError', () => {
    it('creates formatted error messages', () => {
      // Create a real ZodError by attempting to parse invalid data
      const testSchema = z.object({ name: z.string(), version: z.string() });
      const result = testSchema.safeParse({ name: '', version: 123 });

      if (result.success) {
        throw new Error('Expected validation to fail');
      }

      const validationError = new ValidationError(
        'Test validation failed',
        result.error,
        'component'
      );

      const formattedErrors = validationError.getFormattedErrors();
      expect(formattedErrors.length).toBeGreaterThan(0);
      expect(validationError.message).toContain('Test validation failed');
    });

    it('creates validation error from zod error', () => {
      // Create a real ZodError by attempting to parse invalid data
      const testSchema = z.object({ test: z.string() });
      const result = testSchema.safeParse({ test: 123 });

      if (result.success) {
        throw new Error('Expected validation to fail');
      }

      const error = createValidationError(result.error, 'test-context');
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('test-context');
    });
  });
});
