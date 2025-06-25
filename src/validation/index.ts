import { z } from 'zod';
import type {
  Component,
  Contract,
  Environment,
  Capability,
  VersionString,
  VersionRange,
} from '../types/index';

// =============================================================================
// Base Schema Definitions
// =============================================================================

/**
 * Schema for semantic version strings
 */
export const versionStringSchema = z
  .string()
  .regex(
    /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)?(?:\+[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)?$/,
    {
      message: 'Must be a valid semantic version (e.g., 1.0.0, 2.1.0-alpha.1)',
    }
  )
  .brand<VersionString>();

/**
 * Schema for version range strings
 */
export const versionRangeSchema = z
  .string()
  .min(1, 'Version range cannot be empty')
  .brand<VersionRange>();

/**
 * Schema for ISO 8601 timestamp strings
 */
export const timestampSchema = z.string().datetime();

/**
 * Schema for generic metadata objects
 */
export const metadataSchema = z.record(z.string(), z.unknown());

/**
 * Schema for component identifiers
 */
export const componentIdSchema = z.object({
  name: z.string().min(1, 'Component name is required'),
  version: versionStringSchema,
});

// =============================================================================
// Enum Schemas
// =============================================================================

export const componentTypeSchema = z.enum([
  'ui-component',
  'layout-component',
  'data-component',
  'nav-component',
  'form-component',
  'utility-component',
  'composite',
  'template',
  'adapter',
  'plugin',
] as const);

export const componentLifecycleSchema = z.enum([
  'development',
  'alpha',
  'beta',
  'stable',
  'deprecated',
  'archived',
] as const);

export const styleEngineSchema = z.enum([
  'css-modules',
  'styled-components',
  'emotion',
  'vanilla-extract',
  'tailwind',
  'css-in-js',
  'scss',
  'postcss',
  'none',
] as const);

export const runtimeFrameworkSchema = z.enum([
  'react',
  'react-18',
  'vue',
  'angular',
  'svelte',
  'vanilla',
  'web-components',
] as const);

export const capabilityTypeSchema = z.enum([
  'theme-provider',
  'layout-engine',
  'style-injection',
  'state-management',
  'routing',
  'i18n',
  'analytics',
  'error-boundary',
  'performance',
  'accessibility',
  'testing',
  'devtools',
  'security',
  'caching',
  'validation',
  'authentication',
  'authorization',
  'networking',
  'storage',
  'crypto',
  'custom',
] as const);

export const compatibilityLevelSchema = z.enum(['full', 'partial', 'emulated', 'none'] as const);

export const environmentStatusSchema = z.enum([
  'active',
  'inactive',
  'maintenance',
  'deprecated',
  'failed',
] as const);

export const mountModeSchema = z.enum(['static', 'interactive', 'isolated', 'hybrid'] as const);

export const mountPlanStatusSchema = z.enum([
  'draft',
  'validated',
  'executing',
  'completed',
  'failed',
  'cancelled',
  'rollback',
] as const);

export const profileScopeSchema = z.enum([
  'global',
  'environment',
  'team',
  'personal',
  'project',
] as const);

export const profilePermissionSchema = z.enum([
  'read',
  'use',
  'modify',
  'manage',
  'admin',
] as const);

// =============================================================================
// Component Schema
// =============================================================================

export const componentDependencySchema = z.object({
  name: z.string().min(1, 'Dependency name is required'),
  versionRange: versionRangeSchema,
  optional: z.boolean().optional(),
  reason: z.string().optional(),
});

export const componentProvidesSchema = z.object({
  name: z.string().min(1, 'Capability name is required'),
  version: versionStringSchema,
  config: metadataSchema.optional(),
});

export const componentRequiresSchema = z.object({
  name: z.string().min(1, 'Required capability name is required'),
  versionRange: versionRangeSchema,
  optional: z.boolean().optional(),
  fallback: z.string().optional(),
});

export const componentSchema = z.object({
  name: z.string().min(1, 'Component name is required'),
  version: versionStringSchema,
  type: componentTypeSchema,
  lifecycle: componentLifecycleSchema,
  description: z.string().min(1, 'Description is required'),
  author: z.string().min(1, 'Author is required'),
  license: z.string().min(1, 'License is required'),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  keywords: z.array(z.string()).default([]),
  dependencies: z.array(componentDependencySchema).default([]),
  provides: z.array(componentProvidesSchema).default([]),
  requires: z.array(componentRequiresSchema).default([]),
  contract: componentIdSchema,
  bundleSize: z
    .object({
      minified: z.number().min(0, 'Bundle size must be non-negative'),
      gzipped: z.number().min(0, 'Bundle size must be non-negative'),
    })
    .optional(),
  metadata: metadataSchema.default({}),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

// =============================================================================
// Contract Schema
// =============================================================================

export const themeTokenSchema = z.object({
  name: z.string().min(1, 'Token name is required'),
  type: z.enum([
    'color',
    'spacing',
    'typography',
    'shadow',
    'border',
    'size',
    'duration',
    'custom',
  ]),
  value: z.union([z.string(), z.number()]),
  description: z.string().optional(),
  deprecated: z
    .object({
      reason: z.string().min(1, 'Deprecation reason is required'),
      replacement: z.string().optional(),
    })
    .optional(),
});

export const themeVariantSchema = z.object({
  name: z.string().min(1, 'Variant name is required'),
  description: z.string().min(1, 'Variant description is required'),
  tokens: z.record(z.string(), z.union([z.string(), z.number()])),
  default: z.boolean().optional(),
});

export const layoutSystemSchema = z.object({
  grid: z
    .object({
      columns: z.number().min(1, 'Grid must have at least 1 column'),
      gutters: z.array(z.string()),
      breakpoints: z.record(z.string(), z.string()),
    })
    .optional(),
  spacing: z
    .object({
      scale: z.record(z.string(), z.string()),
      semantic: z.record(z.string(), z.string()),
    })
    .optional(),
  containers: z
    .object({
      sizes: z.record(z.string(), z.string()),
      padding: z.record(z.string(), z.string()),
    })
    .optional(),
});

export const componentSchemaDefinition: z.ZodType = z.lazy(() =>
  z.object({
    required: z.array(z.string()).default([]),
    properties: z.record(
      z.string(),
      z.object({
        type: z.string(),
        description: z.string().optional(),
        default: z.unknown().optional(),
        enum: z.array(z.unknown()).optional(),
        items: componentSchemaDefinition.optional(),
        properties: z.record(z.string(), componentSchemaDefinition).optional(),
      })
    ),
    additionalProperties: z.boolean().optional(),
  })
);

export const runtimeRequirementsSchema = z.object({
  framework: runtimeFrameworkSchema,
  frameworkVersion: versionRangeSchema,
  browsers: z.array(z.string()).default([]),
  polyfills: z.array(z.string()).optional(),
  environment: z.enum(['browser', 'node', 'universal']),
  moduleFormat: z.enum(['esm', 'cjs', 'umd', 'amd']),
});

export const styleEngineConfigSchema = z.object({
  engine: styleEngineSchema,
  config: metadataSchema.default({}),
  compilation: z
    .object({
      extractCss: z.boolean(),
      purgeUnused: z.boolean(),
      optimization: z.enum(['none', 'basic', 'aggressive']),
    })
    .optional(),
});

export const contractValidationSchema = z.object({
  schema: componentSchemaDefinition,
  customRules: z.array(z.string()).optional(),
  accessibility: z
    .object({
      wcagLevel: z.enum(['A', 'AA', 'AAA']),
      requirements: z.array(z.string()),
    })
    .optional(),
  performance: z
    .object({
      maxBundleSize: z.number().min(0),
      maxRenderTime: z.number().min(0),
      memoryUsage: z.number().min(0),
    })
    .optional(),
});

export const contractSchema = z.object({
  name: z.string().min(1, 'Contract name is required'),
  version: versionStringSchema,
  schemaVersion: versionStringSchema,
  description: z.string().min(1, 'Description is required'),
  author: z.string().min(1, 'Author is required'),
  keywords: z.array(z.string()).default([]),
  schema: componentSchemaDefinition,
  validation: contractValidationSchema,
  theme: z.object({
    tokens: z.array(themeTokenSchema).default([]),
    variants: z.array(themeVariantSchema).default([]),
    namespace: z.string().min(1, 'Theme namespace is required'),
  }),
  layout: layoutSystemSchema,
  styleEngine: styleEngineConfigSchema,
  runtime: runtimeRequirementsSchema,
  compatibility: z.object({
    minSchemaVersion: versionStringSchema,
    breakingChanges: z.array(z.string()).optional(),
    migrationGuide: z.string().url().optional(),
  }),
  metadata: metadataSchema.default({}),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

// =============================================================================
// Environment and Capability Schemas
// =============================================================================

export const capabilitySchema = z.object({
  id: z.string().min(1, 'Capability ID is required'),
  name: z.string().min(1, 'Capability name is required'),
  type: capabilityTypeSchema,
  version: versionStringSchema,
  description: z.string().min(1, 'Description is required'),
  provider: z.string().min(1, 'Provider is required'),
  config: metadataSchema.default({}),
  compatibility: z.record(z.string(), compatibilityLevelSchema).default({}),
  dependencies: z.array(componentDependencySchema).default([]),
  performance: z
    .object({
      memoryUsage: z.number().min(0, 'Memory usage must be non-negative'),
      initTime: z.number().min(0, 'Init time must be non-negative'),
      overhead: z.number().min(1).max(10, 'Overhead score must be between 1-10'),
    })
    .optional(),
  features: z.object({
    flags: z.array(z.string()).default([]),
    defaults: metadataSchema.default({}),
    optional: metadataSchema.default({}),
  }),
  metadata: metadataSchema.default({}),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const environmentHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  score: z.number().min(0).max(100, 'Health score must be between 0-100'),
  lastCheck: timestampSchema,
  indicators: z.object({
    cpu: z.number().min(0).max(100, 'CPU usage must be between 0-100'),
    memory: z.number().min(0).max(100, 'Memory usage must be between 0-100'),
    latency: z.number().min(0, 'Latency must be non-negative'),
    errorRate: z.number().min(0).max(100, 'Error rate must be between 0-100'),
  }),
  checks: z.array(
    z.object({
      name: z.string().min(1, 'Check name is required'),
      status: z.enum(['pass', 'fail', 'warn']),
      message: z.string().optional(),
      timestamp: timestampSchema,
    })
  ),
});

export const resourceConstraintsSchema = z.object({
  maxMemory: z.number().min(0, 'Max memory must be non-negative'),
  maxCpu: z.number().min(0).max(100, 'Max CPU must be between 0-100'),
  bandwidth: z.object({
    download: z.number().min(0, 'Download bandwidth must be non-negative'),
    upload: z.number().min(0, 'Upload bandwidth must be non-negative'),
  }),
  storage: z.object({
    local: z.number().min(0, 'Local storage must be non-negative'),
    session: z.number().min(0, 'Session storage must be non-negative'),
    cache: z.number().min(0, 'Cache storage must be non-negative'),
  }),
  execution: z.object({
    maxRenderTime: z.number().min(0, 'Max render time must be non-negative'),
    maxApiTime: z.number().min(0, 'Max API time must be non-negative'),
    scriptTimeout: z.number().min(0, 'Script timeout must be non-negative'),
  }),
});

export const deploymentConfigSchema = z.object({
  strategy: z.enum(['blue-green', 'rolling', 'canary', 'recreate']),
  scaling: z.object({
    min: z.number().min(0, 'Min instances must be non-negative'),
    max: z.number().min(1, 'Max instances must be at least 1'),
    auto: z.boolean(),
    metrics: z.array(z.string()).default([]),
  }),
  loadBalancing: z.object({
    algorithm: z.enum(['round-robin', 'least-connections', 'ip-hash', 'weighted']),
    healthCheck: z.object({
      path: z.string().min(1, 'Health check path is required'),
      interval: z.number().min(1, 'Health check interval must be positive'),
      timeout: z.number().min(1, 'Health check timeout must be positive'),
      retries: z.number().min(0, 'Health check retries must be non-negative'),
    }),
  }),
});

export const environmentSchema = z.object({
  id: z.string().min(1, 'Environment ID is required'),
  name: z.string().min(1, 'Environment name is required'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['development', 'staging', 'production', 'testing', 'preview']),
  status: environmentStatusSchema,
  version: versionStringSchema,
  capabilities: z.array(capabilitySchema).default([]),
  runtime: z.object({
    framework: runtimeFrameworkSchema,
    frameworkVersion: versionStringSchema,
    nodeVersion: versionStringSchema.optional(),
    browsers: z.array(z.string()).default([]),
    polyfills: z.array(z.string()).default([]),
  }),
  constraints: resourceConstraintsSchema,
  deployment: deploymentConfigSchema,
  security: z.object({
    csp: z.string().optional(),
    cors: z.object({
      origins: z.array(z.string()).default([]),
      methods: z.array(z.string()).default([]),
      headers: z.array(z.string()).default([]),
    }),
    auth: z.object({
      required: z.boolean(),
      providers: z.array(z.string()).default([]),
    }),
  }),
  health: environmentHealthSchema,
  compatibility: z.object({
    supportedTypes: z.array(componentTypeSchema).default([]),
    blacklist: z.array(componentIdSchema).default([]),
    constraints: z.record(z.string(), versionRangeSchema).default({}),
  }),
  metadata: metadataSchema.default({}),
  owner: z.string().min(1, 'Owner is required'),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validates a component object
 */
export function validateComponent(data: unknown): Component {
  return componentSchema.parse(data) as Component;
}

/**
 * Validates a contract object
 */
export function validateContract(data: unknown): Contract {
  return contractSchema.parse(data) as Contract;
}

/**
 * Validates an environment object
 */
export function validateEnvironment(data: unknown): Environment {
  return environmentSchema.parse(data) as Environment;
}

/**
 * Validates a capability object
 */
export function validateCapability(data: unknown): Capability {
  return capabilitySchema.parse(data) as Capability;
}

/**
 * Safe validation functions that return results instead of throwing
 */
export type ValidationResult<T> =
  | { success: true; data: T; errors: null }
  | { success: false; data: null; errors: z.ZodError };

/**
 * Safely validates a component
 */
export function safeValidateComponent(data: unknown): ValidationResult<Component> {
  const result = componentSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as Component, errors: null };
  }
  return { success: false, data: null, errors: result.error };
}

/**
 * Safely validates a contract
 */
export function safeValidateContract(data: unknown): ValidationResult<Contract> {
  const result = contractSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as Contract, errors: null };
  }
  return { success: false, data: null, errors: result.error };
}

/**
 * Safely validates an environment
 */
export function safeValidateEnvironment(data: unknown): ValidationResult<Environment> {
  const result = environmentSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as Environment, errors: null };
  }
  return { success: false, data: null, errors: result.error };
}

/**
 * Safely validates a capability
 */
export function safeValidateCapability(data: unknown): ValidationResult<Capability> {
  const result = capabilitySchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as Capability, errors: null };
  }
  return { success: false, data: null, errors: result.error };
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly zodError: z.ZodError,
    public readonly path?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  /**
   * Get formatted error messages
   */
  getFormattedErrors(): string[] {
    return this.zodError.errors.map((error) => {
      const path = error.path.length > 0 ? ` at ${error.path.join('.')}` : '';
      return `${error.message}${path}`;
    });
  }
}

/**
 * Helper to create validation error from Zod error
 */
export function createValidationError(zodError: z.ZodError, context?: string): ValidationError {
  const message = context
    ? `Validation failed for ${context}: ${zodError.errors.length} error(s)`
    : `Validation failed: ${zodError.errors.length} error(s)`;

  return new ValidationError(message, zodError, context);
}
