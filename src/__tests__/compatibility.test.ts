import { describe, it, expect } from 'vitest';
import {
  isComponent,
  isContract,
  isEnvironment,
  isCapability,
  checkComponentContractCompatibility,
  checkComponentEnvironmentCompatibility,
  checkDependencyCompatibility,
  checkCapabilityMatches,
  checkContractCompatibility,
  checkBatchCompatibility,
  findCompatibleEnvironments,
  findBestContractVersion,
  calculateCompatibilityScore,
  isValidVersionRangeFormat,
  isValidComponentType,
  isValidCapabilityType,
} from '../compatibility';
import type { Component, Contract, Environment, Capability, ComponentType } from '../types';

describe('Compatibility Utilities', () => {
  // Test data fixtures
  const validComponent: Component = {
    name: 'test-component',
    version: '1.2.0',
    type: 'ui-component',
    lifecycle: 'stable',
    description: 'A test component',
    author: 'Test Author',
    license: 'MIT',
    keywords: ['test'],
    dependencies: [
      { name: 'dep1', versionRange: '^1.0.0' },
      { name: 'dep2', versionRange: '>=2.0.0', optional: true },
    ],
    provides: [],
    requires: [{ name: 'theme-provider', versionRange: '^1.0.0' }],
    contract: { name: 'test-contract', version: '1.0.0' },
    metadata: {},
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

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
        children: { type: 'string' },
      },
    },
    validation: {
      schema: {
        required: ['children'],
        properties: {
          children: { type: 'string' },
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
      browsers: ['chrome'],
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

  const validEnvironment: Environment = {
    id: 'test-env',
    name: 'Test Environment',
    description: 'A test environment',
    type: 'development',
    status: 'active',
    version: '1.0.0',
    capabilities: [
      {
        id: 'theme-cap',
        name: 'theme-provider',
        type: 'theme-provider',
        version: '1.0.0',
        description: 'Theme capability',
        provider: 'test-provider',
        config: {},
        compatibility: {},
        dependencies: [],
        features: { flags: [], defaults: {}, optional: {} },
        metadata: {},
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    ],
    runtime: {
      framework: 'react',
      frameworkVersion: '18.0.0',
      browsers: ['chrome'],
      polyfills: [],
    },
    constraints: {
      maxMemory: 1024,
      maxCpu: 80,
      bandwidth: { download: 100, upload: 50 },
      storage: { local: 100, session: 50, cache: 200 },
      execution: { maxRenderTime: 1000, maxApiTime: 5000, scriptTimeout: 10000 },
    },
    deployment: {
      strategy: 'rolling',
      scaling: { min: 1, max: 5, auto: true, metrics: [] },
      loadBalancing: {
        algorithm: 'round-robin',
        healthCheck: { path: '/health', interval: 30, timeout: 5, retries: 3 },
      },
    },
    security: {
      cors: { origins: [], methods: [], headers: [] },
      auth: { required: false, providers: [] },
    },
    health: {
      status: 'healthy',
      score: 95,
      lastCheck: '2023-01-01T00:00:00.000Z',
      indicators: { cpu: 45, memory: 60, latency: 100, errorRate: 0.1 },
      checks: [],
    },
    compatibility: {
      supportedTypes: ['ui-component', 'layout-component'],
      blacklist: [],
      constraints: {},
    },
    metadata: {},
    owner: 'test-owner',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  const validCapability: Capability = {
    id: 'test-capability',
    name: 'test-capability',
    type: 'theme-provider',
    version: '1.0.0',
    description: 'A test capability',
    provider: 'test-provider',
    config: {},
    compatibility: {},
    dependencies: [],
    features: { flags: [], defaults: {}, optional: {} },
    metadata: {},
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  describe('Type Predicates', () => {
    describe('isComponent', () => {
      it('returns true for valid component', () => {
        expect(isComponent(validComponent)).toBe(true);
      });

      it('returns false for invalid component', () => {
        expect(isComponent({})).toBe(false);
        expect(isComponent(null)).toBe(false);
        expect(isComponent('string')).toBe(false);
        expect(isComponent({ name: 'test' })).toBe(false); // missing required fields
      });
    });

    describe('isContract', () => {
      it('returns true for valid contract', () => {
        expect(isContract(validContract)).toBe(true);
      });

      it('returns false for invalid contract', () => {
        expect(isContract({})).toBe(false);
        expect(isContract(null)).toBe(false);
        expect(isContract({ name: 'test' })).toBe(false);
      });
    });

    describe('isEnvironment', () => {
      it('returns true for valid environment', () => {
        expect(isEnvironment(validEnvironment)).toBe(true);
      });

      it('returns false for invalid environment', () => {
        expect(isEnvironment({})).toBe(false);
        expect(isEnvironment(null)).toBe(false);
        expect(isEnvironment({ id: 'test' })).toBe(false);
      });
    });

    describe('isCapability', () => {
      it('returns true for valid capability', () => {
        expect(isCapability(validCapability)).toBe(true);
      });

      it('returns false for invalid capability', () => {
        expect(isCapability({})).toBe(false);
        expect(isCapability(null)).toBe(false);
        expect(isCapability({ id: 'test' })).toBe(false);
      });
    });
  });

  describe('Component-Contract Compatibility', () => {
    it('checks compatible component and contract', () => {
      const result = checkComponentContractCompatibility(validComponent, validContract);

      expect(result.compatible).toBe(true);
      expect(result.score).toBeGreaterThan(80);
      expect(result.level).toBe('patch');
    });

    it('detects contract name mismatch', () => {
      const mismatchedContract = { ...validContract, name: 'different-contract' };
      const result = checkComponentContractCompatibility(validComponent, mismatchedContract);

      expect(result.compatible).toBe(false);
      expect(result.issues.some((i) => i.code === 'CONTRACT_MISMATCH')).toBe(true);
    });

    it('detects contract version incompatibility', () => {
      const incompatibleContract = { ...validContract, version: '2.0.0' };
      const component = {
        ...validComponent,
        contract: { name: 'test-contract', version: '1.0.0' },
      };
      const result = checkComponentContractCompatibility(component, incompatibleContract);

      expect(
        result.issues.some(
          (i) => i.code === 'CONTRACT_VERSION_PARTIAL' || i.code === 'CONTRACT_VERSION_INCOMPATIBLE'
        )
      ).toBe(true);
    });
  });

  describe('Dependency Compatibility', () => {
    it('checks dependency compatibility with available components', () => {
      const availableComponents: Component[] = [
        { ...validComponent, name: 'dep1', version: '1.5.0' },
        { ...validComponent, name: 'dep2', version: '2.1.0' },
      ];

      const results = checkDependencyCompatibility(validComponent, availableComponents);

      expect(results).toHaveLength(2);
      expect(results[0]?.compatible).toBe(true);
      expect(results[1]?.compatible).toBe(true);
    });

    it('handles missing dependencies', () => {
      const availableComponents: Component[] = [
        { ...validComponent, name: 'dep1', version: '1.5.0' },
      ];

      const results = checkDependencyCompatibility(validComponent, availableComponents);

      expect(results).toHaveLength(2);
      expect(results[0]?.compatible).toBe(true);
      expect(results[1]?.compatible).toBe(true); // optional dependency
    });

    it('detects incompatible dependency versions', () => {
      const availableComponents: Component[] = [
        { ...validComponent, name: 'dep1', version: '0.9.0' }, // doesn't satisfy ^1.0.0
      ];

      const results = checkDependencyCompatibility(validComponent, availableComponents);

      expect(results[0]?.compatible).toBe(false);
      expect(results[0]?.level).toBe('none');
    });
  });

  describe('Component-Environment Compatibility', () => {
    it('checks compatible component and environment', () => {
      const result = checkComponentEnvironmentCompatibility(validComponent, validEnvironment);

      expect(result.compatible).toBe(true);
      expect(result.score).toBeGreaterThan(80);
    });

    it('detects unsupported component type', () => {
      const unsupportedComponent = { ...validComponent, type: 'plugin' as const };
      const result = checkComponentEnvironmentCompatibility(unsupportedComponent, validEnvironment);

      expect(result.compatible).toBe(false);
      expect(result.issues.some((i) => i.code === 'COMPONENT_TYPE_UNSUPPORTED')).toBe(true);
    });

    it('detects blacklisted component', () => {
      const blacklistedEnvironment = {
        ...validEnvironment,
        compatibility: {
          ...validEnvironment.compatibility,
          blacklist: [{ name: 'test-component', version: '1.2.0' }],
        },
      };

      const result = checkComponentEnvironmentCompatibility(validComponent, blacklistedEnvironment);

      expect(result.compatible).toBe(false);
      expect(result.issues.some((i) => i.code === 'COMPONENT_BLACKLISTED')).toBe(true);
    });
  });

  describe('Capability Matching', () => {
    it('matches required capabilities', () => {
      const matches = checkCapabilityMatches(validComponent, validEnvironment);

      expect(matches).toHaveLength(1);
      expect(matches[0]?.capability).toBe('theme-provider');
      expect(matches[0]?.available).toBe(true);
      expect(matches[0]?.compatible).toBe(true);
    });

    it('detects missing capabilities', () => {
      const componentWithMissingCap = {
        ...validComponent,
        requires: [
          { name: 'theme-provider', versionRange: '^1.0.0' },
          { name: 'missing-capability', versionRange: '^1.0.0' },
        ],
      };

      const matches = checkCapabilityMatches(componentWithMissingCap, validEnvironment);

      expect(matches).toHaveLength(2);
      expect(matches[1]?.available).toBe(false);
      expect(matches[1]?.compatible).toBe(false);
    });
  });

  describe('Contract Compatibility', () => {
    it('checks compatible contracts', () => {
      const targetContract = { ...validContract, version: '1.1.0' };
      const result = checkContractCompatibility(validContract, targetContract);

      expect(result.compatible).toBe(true);
      expect(result.level).not.toBe('none');
    });

    it('detects contract name mismatch', () => {
      const differentContract = { ...validContract, name: 'different-contract' };
      const result = checkContractCompatibility(validContract, differentContract);

      expect(result.compatible).toBe(false);
      expect(result.score).toBe(0);
    });

    it('handles breaking changes', () => {
      const contractWithBreakingChanges = {
        ...validContract,
        version: '2.0.0',
        compatibility: {
          ...validContract.compatibility,
          breakingChanges: ['removed field X', 'changed interface Y'],
          migrationGuide: 'https://example.com/migration',
        },
      };

      const result = checkContractCompatibility(validContract, contractWithBreakingChanges);

      expect(result.issues.some((i) => i.code === 'BREAKING_CHANGES_PRESENT')).toBe(true);
      expect(result.issues.some((i) => i.suggestion?.includes('migration'))).toBe(true);
    });
  });

  describe('Batch Operations', () => {
    it('checks batch compatibility', () => {
      const components = [validComponent, { ...validComponent, name: 'component2' }];
      const results = checkBatchCompatibility(components, validEnvironment);

      expect(results.size).toBe(2);
      expect(results.get('test-component')?.compatible).toBe(true);
      expect(results.get('component2')?.compatible).toBe(true);
    });

    it('finds compatible environments', () => {
      const environments = [
        validEnvironment,
        {
          ...validEnvironment,
          id: 'env2',
          compatibility: {
            ...validEnvironment.compatibility,
            supportedTypes: ['plugin' as ComponentType],
          },
        },
      ];

      const compatible = findCompatibleEnvironments(validComponent, environments);

      expect(compatible).toHaveLength(1);
      expect(compatible[0]?.environment.id).toBe('test-env');
    });

    it('finds best contract version', () => {
      const contracts = [
        validContract,
        { ...validContract, version: '1.1.0' },
        { ...validContract, version: '1.2.0' },
      ];

      const best = findBestContractVersion(validComponent, contracts);

      expect(best?.version).toBe('1.2.0'); // highest compatible version
    });
  });

  describe('Utility Functions', () => {
    describe('calculateCompatibilityScore', () => {
      it('calculates correct scores for different compatibility levels', () => {
        expect(calculateCompatibilityScore('1.0.0', '1.0.0')).toBe(100); // patch (exact match)
        expect(calculateCompatibilityScore('1.0.0', '1.1.0')).toBe(50); // major (minor version change)
      });
    });

    describe('isValidVersionRangeFormat', () => {
      it('validates version ranges', () => {
        expect(isValidVersionRangeFormat('^1.0.0')).toBe(true);
        expect(isValidVersionRangeFormat('>=1.0.0')).toBe(true);
        expect(isValidVersionRangeFormat('~1.2.0')).toBe(true);
        expect(isValidVersionRangeFormat('invalid-range')).toBe(false);
      });
    });

    describe('Type validation functions', () => {
      it('validates component types', () => {
        expect(isValidComponentType('ui-component')).toBe(true);
        expect(isValidComponentType('invalid-type')).toBe(false);
      });

      it('validates capability types', () => {
        expect(isValidCapabilityType('theme-provider')).toBe(true);
        expect(isValidCapabilityType('invalid-capability')).toBe(false);
      });
    });
  });
});
