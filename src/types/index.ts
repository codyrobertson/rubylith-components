import type { SemVer } from 'semver';

// =============================================================================
// Base Types
// =============================================================================

/**
 * Semantic version string (e.g., "1.2.3", "2.0.0-alpha.1")
 */
export type VersionString = string;

/**
 * Version range specification (e.g., "^1.0.0", "~2.1.0", ">=3.0.0")
 */
export type VersionRange = string;

/**
 * Timestamp in ISO 8601 format
 */
export type Timestamp = string;

/**
 * Component identifier (name + version)
 */
export interface ComponentId {
  name: string;
  version: VersionString;
}

/**
 * Generic metadata container
 */
export interface Metadata {
  [key: string]: unknown;
}

// =============================================================================
// Component Interface
// =============================================================================

/**
 * Component type categorization
 */
export type ComponentType =
  | 'ui-component' // Interactive UI elements (Button, Input, Modal)
  | 'layout-component' // Layout containers (Grid, Flex, Container)
  | 'data-component' // Data display components (Table, Chart, List)
  | 'nav-component' // Navigation elements (Menu, Breadcrumb, Tabs)
  | 'form-component' // Form controls (FormField, FormGroup, Validator)
  | 'utility-component' // Utility components (ErrorBoundary, Provider)
  | 'composite' // Multi-component compositions
  | 'template' // Page or section templates
  | 'adapter' // Bridge components for compatibility
  | 'plugin'; // Extension components

/**
 * Component lifecycle stage
 */
export type ComponentLifecycle =
  | 'development' // Under active development
  | 'alpha' // Internal testing
  | 'beta' // Limited external testing
  | 'stable' // Production ready
  | 'deprecated' // No longer recommended
  | 'archived'; // No longer maintained

/**
 * Component dependency specification
 */
export interface ComponentDependency {
  /** Component name */
  name: string;
  /** Version range requirement */
  versionRange: VersionRange;
  /** Whether this dependency is optional */
  optional?: boolean;
  /** Reason for the dependency */
  reason?: string;
}

/**
 * Component capability provision
 */
export interface ComponentProvides {
  /** Capability name */
  name: string;
  /** Version of the capability provided */
  version: VersionString;
  /** Configuration options for this capability */
  config?: Metadata;
}

/**
 * Component capability requirement
 */
export interface ComponentRequires {
  /** Required capability name */
  name: string;
  /** Version range requirement */
  versionRange: VersionRange;
  /** Whether this requirement is optional */
  optional?: boolean;
  /** Fallback behavior if capability is unavailable */
  fallback?: string;
}

/**
 * Component interface definition
 */
export interface Component {
  /** Unique component name */
  name: string;
  /** Semantic version */
  version: VersionString;
  /** Component type for categorization */
  type: ComponentType;
  /** Current lifecycle stage */
  lifecycle: ComponentLifecycle;

  /** Human-readable description */
  description: string;
  /** Component author/maintainer */
  author: string;
  /** License identifier (SPDX format) */
  license: string;
  /** Homepage or documentation URL */
  homepage?: string;
  /** Source repository URL */
  repository?: string;
  /** Keywords for discovery */
  keywords: string[];

  /** Component dependencies */
  dependencies: ComponentDependency[];
  /** Capabilities this component provides */
  provides: ComponentProvides[];
  /** Capabilities this component requires */
  requires: ComponentRequires[];

  /** Contract that defines this component's interface */
  contract: ComponentId;
  /** Bundle size information */
  bundleSize?: {
    minified: number;
    gzipped: number;
  };

  /** Component-specific metadata */
  metadata: Metadata;

  /** Creation timestamp */
  createdAt: Timestamp;
  /** Last update timestamp */
  updatedAt: Timestamp;
}

// =============================================================================
// Contract Interface
// =============================================================================

/**
 * Style engine configuration
 */
export type StyleEngine =
  | 'css-modules' // CSS Modules
  | 'styled-components' // Styled Components
  | 'emotion' // Emotion
  | 'vanilla-extract' // Vanilla Extract
  | 'tailwind' // Tailwind CSS
  | 'css-in-js' // Generic CSS-in-JS
  | 'scss' // SCSS/Sass
  | 'postcss' // PostCSS
  | 'none'; // No styling framework

/**
 * Runtime framework requirement
 */
export type RuntimeFramework =
  | 'react' // React 16+
  | 'react-18' // React 18+
  | 'vue' // Vue 2/3
  | 'angular' // Angular
  | 'svelte' // Svelte
  | 'vanilla' // No framework
  | 'web-components'; // Web Components

/**
 * Theme token definition
 */
export interface ThemeToken {
  /** Token name/path (e.g., "color.primary.500") */
  name: string;
  /** Token type */
  type: 'color' | 'spacing' | 'typography' | 'shadow' | 'border' | 'size' | 'duration' | 'custom';
  /** Default value */
  value: string | number;
  /** Description of the token's purpose */
  description?: string;
  /** Deprecated flag and replacement info */
  deprecated?: {
    reason: string;
    replacement?: string;
  };
}

/**
 * Theme variant configuration
 */
export interface ThemeVariant {
  /** Variant name (e.g., "light", "dark", "high-contrast") */
  name: string;
  /** Variant description */
  description: string;
  /** Token overrides for this variant */
  tokens: Record<string, string | number>;
  /** Whether this is the default variant */
  default?: boolean;
}

/**
 * Layout system configuration
 */
export interface LayoutSystem {
  /** Grid system configuration */
  grid?: {
    columns: number;
    gutters: string[];
    breakpoints: Record<string, string>;
  };
  /** Spacing scale */
  spacing?: {
    scale: Record<string, string>;
    semantic: Record<string, string>;
  };
  /** Container constraints */
  containers?: {
    sizes: Record<string, string>;
    padding: Record<string, string>;
  };
}

/**
 * Input/Output schema definition for component props
 */
export interface ComponentSchema {
  /** Required properties */
  required: string[];
  /** Property definitions */
  properties: Record<
    string,
    {
      type: string;
      description?: string;
      default?: unknown;
      enum?: unknown[];
      items?: ComponentSchema;
      properties?: Record<string, ComponentSchema>;
    }
  >;
  /** Additional properties allowed */
  additionalProperties?: boolean;
}

/**
 * Runtime requirements specification
 */
export interface RuntimeRequirements {
  /** Target framework */
  framework: RuntimeFramework;
  /** Minimum framework version */
  frameworkVersion: VersionRange;
  /** Browser compatibility */
  browsers: string[];
  /** Required polyfills */
  polyfills?: string[];
  /** Bundle environment */
  environment: 'browser' | 'node' | 'universal';
  /** Module format */
  moduleFormat: 'esm' | 'cjs' | 'umd' | 'amd';
}

/**
 * Style engine configuration details
 */
export interface StyleEngineConfig {
  /** Style engine type */
  engine: StyleEngine;
  /** Engine-specific configuration */
  config: Metadata;
  /** Theme compilation options */
  compilation?: {
    extractCss: boolean;
    purgeUnused: boolean;
    optimization: 'none' | 'basic' | 'aggressive';
  };
}

/**
 * Contract validation rules
 */
export interface ContractValidation {
  /** Schema validation rules */
  schema: ComponentSchema;
  /** Custom validation functions */
  customRules?: string[];
  /** Accessibility requirements */
  accessibility?: {
    wcagLevel: 'A' | 'AA' | 'AAA';
    requirements: string[];
  };
  /** Performance constraints */
  performance?: {
    maxBundleSize: number;
    maxRenderTime: number;
    memoryUsage: number;
  };
}

/**
 * Contract interface definition
 *
 * Defines the interface and requirements for components, including
 * theme system, layout specifications, and runtime requirements.
 */
export interface Contract {
  /** Contract name (typically matches component name) */
  name: string;
  /** Contract version (independent of component version) */
  version: VersionString;
  /** Schema version for contract format evolution */
  schemaVersion: VersionString;

  /** Human-readable description */
  description: string;
  /** Contract author/maintainer */
  author: string;
  /** Keywords for discovery */
  keywords: string[];

  /** Component input/output schema */
  schema: ComponentSchema;
  /** Validation rules */
  validation: ContractValidation;

  /** Theme system configuration */
  theme: {
    /** Available design tokens */
    tokens: ThemeToken[];
    /** Theme variants */
    variants: ThemeVariant[];
    /** Token namespace hierarchy */
    namespace: string;
  };

  /** Layout system specification */
  layout: LayoutSystem;

  /** Style engine configuration */
  styleEngine: StyleEngineConfig;

  /** Runtime framework requirements */
  runtime: RuntimeRequirements;

  /** Compatibility matrix */
  compatibility: {
    /** Minimum contract schema version supported */
    minSchemaVersion: VersionString;
    /** Breaking changes from previous versions */
    breakingChanges?: string[];
    /** Migration guide URL */
    migrationGuide?: string;
  };

  /** Contract-specific metadata */
  metadata: Metadata;

  /** Creation timestamp */
  createdAt: Timestamp;
  /** Last update timestamp */
  updatedAt: Timestamp;
}

// =============================================================================
// Environment Interface
// =============================================================================

/**
 * Environment capability type
 */
export type CapabilityType =
  | 'theme-provider' // Design system theme provision
  | 'layout-engine' // Layout system capabilities
  | 'style-injection' // CSS/styling injection
  | 'state-management' // Global state management
  | 'routing' // Client-side routing
  | 'i18n' // Internationalization
  | 'analytics' // Analytics and tracking
  | 'error-boundary' // Error handling
  | 'performance' // Performance monitoring
  | 'accessibility' // A11y tools and features
  | 'testing' // Testing utilities
  | 'devtools' // Development tools
  | 'security' // Security features
  | 'caching' // Data caching
  | 'validation' // Input validation
  | 'authentication' // User authentication
  | 'authorization' // User authorization
  | 'networking' // HTTP client capabilities
  | 'storage' // Local/session storage
  | 'crypto' // Cryptographic functions
  | 'custom'; // Custom capability type

/**
 * Capability compatibility level
 */
export type CompatibilityLevel =
  | 'full' // Complete compatibility
  | 'partial' // Limited compatibility with workarounds
  | 'emulated' // Compatibility through emulation/polyfills
  | 'none'; // No compatibility

/**
 * Environment capability definition
 */
export interface Capability {
  /** Unique capability identifier */
  id: string;
  /** Capability name */
  name: string;
  /** Capability type for categorization */
  type: CapabilityType;
  /** Version of the capability implementation */
  version: VersionString;

  /** Description of what this capability provides */
  description: string;
  /** Provider/implementation name */
  provider: string;
  /** Capability-specific configuration */
  config: Metadata;

  /** Compatibility matrix with other capabilities */
  compatibility: Record<string, CompatibilityLevel>;
  /** Dependencies required for this capability */
  dependencies: ComponentDependency[];
  /** Performance characteristics */
  performance?: {
    /** Memory usage in KB */
    memoryUsage: number;
    /** Initialization time in ms */
    initTime: number;
    /** Runtime overhead score (1-10, lower is better) */
    overhead: number;
  };

  /** Feature flags and options */
  features: {
    /** Available feature flags */
    flags: string[];
    /** Default configuration */
    defaults: Metadata;
    /** Optional feature configuration */
    optional: Metadata;
  };

  /** Capability-specific metadata */
  metadata: Metadata;

  /** Creation timestamp */
  createdAt: Timestamp;
  /** Last update timestamp */
  updatedAt: Timestamp;
}

/**
 * Environment status
 */
export type EnvironmentStatus =
  | 'active' // Ready for component deployment
  | 'inactive' // Temporarily disabled
  | 'maintenance' // Under maintenance
  | 'deprecated' // No longer recommended
  | 'failed'; // Health check failures

/**
 * Environment health metrics
 */
export interface EnvironmentHealth {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Health score (0-100) */
  score: number;
  /** Last health check timestamp */
  lastCheck: Timestamp;
  /** Specific health indicators */
  indicators: {
    /** CPU usage percentage */
    cpu: number;
    /** Memory usage percentage */
    memory: number;
    /** Network latency in ms */
    latency: number;
    /** Error rate percentage */
    errorRate: number;
  };
  /** Health check details */
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    timestamp: Timestamp;
  }>;
}

/**
 * Environment resource constraints
 */
export interface ResourceConstraints {
  /** Maximum memory usage in MB */
  maxMemory: number;
  /** Maximum CPU usage percentage */
  maxCpu: number;
  /** Network bandwidth limits */
  bandwidth: {
    /** Download limit in Mbps */
    download: number;
    /** Upload limit in Mbps */
    upload: number;
  };
  /** Storage limits */
  storage: {
    /** Local storage limit in MB */
    local: number;
    /** Session storage limit in MB */
    session: number;
    /** Cache storage limit in MB */
    cache: number;
  };
  /** Execution time limits */
  execution: {
    /** Maximum render time in ms */
    maxRenderTime: number;
    /** Maximum API response time in ms */
    maxApiTime: number;
    /** Script execution timeout in ms */
    scriptTimeout: number;
  };
}

/**
 * Environment deployment configuration
 */
export interface DeploymentConfig {
  /** Deployment strategy */
  strategy: 'blue-green' | 'rolling' | 'canary' | 'recreate';
  /** Scaling configuration */
  scaling: {
    /** Minimum instances */
    min: number;
    /** Maximum instances */
    max: number;
    /** Auto-scaling enabled */
    auto: boolean;
    /** Scaling metrics */
    metrics: string[];
  };
  /** Load balancing configuration */
  loadBalancing: {
    /** Algorithm type */
    algorithm: 'round-robin' | 'least-connections' | 'ip-hash' | 'weighted';
    /** Health check settings */
    healthCheck: {
      path: string;
      interval: number;
      timeout: number;
      retries: number;
    };
  };
}

/**
 * Environment interface definition
 *
 * Represents a deployment environment where components can be mounted
 * and executed with specific capabilities and constraints.
 */
export interface Environment {
  /** Unique environment identifier */
  id: string;
  /** Human-readable environment name */
  name: string;
  /** Environment description */
  description: string;

  /** Environment type */
  type: 'development' | 'staging' | 'production' | 'testing' | 'preview';
  /** Current status */
  status: EnvironmentStatus;
  /** Environment version */
  version: VersionString;

  /** Available capabilities */
  capabilities: Capability[];
  /** Runtime configuration */
  runtime: {
    /** Target framework */
    framework: RuntimeFramework;
    /** Framework version */
    frameworkVersion: VersionString;
    /** Node.js version (if applicable) */
    nodeVersion?: VersionString;
    /** Browser targets */
    browsers: string[];
    /** Feature polyfills */
    polyfills: string[];
  };

  /** Resource constraints and limits */
  constraints: ResourceConstraints;
  /** Deployment configuration */
  deployment: DeploymentConfig;

  /** Security configuration */
  security: {
    /** Content Security Policy */
    csp?: string;
    /** CORS configuration */
    cors: {
      origins: string[];
      methods: string[];
      headers: string[];
    };
    /** Authentication requirements */
    auth: {
      required: boolean;
      providers: string[];
    };
  };

  /** Environment health metrics */
  health: EnvironmentHealth;

  /** Compatibility matrix with components */
  compatibility: {
    /** Supported component types */
    supportedTypes: ComponentType[];
    /** Blacklisted components */
    blacklist: ComponentId[];
    /** Version constraints */
    constraints: Record<string, VersionRange>;
  };

  /** Environment-specific metadata */
  metadata: Metadata;

  /** Environment owner/maintainer */
  owner: string;
  /** Creation timestamp */
  createdAt: Timestamp;
  /** Last update timestamp */
  updatedAt: Timestamp;
}

// =============================================================================
// Capability Matching and Negotiation
// =============================================================================

/**
 * Capability match result
 */
export interface CapabilityMatch {
  /** The capability being matched */
  capability: Capability;
  /** Match quality (0-1, 1 being perfect match) */
  score: number;
  /** Compatibility level */
  compatibility: CompatibilityLevel;
  /** Required adaptations */
  adaptations: string[];
  /** Performance impact */
  impact: {
    /** Memory overhead in KB */
    memory: number;
    /** Performance penalty percentage */
    performance: number;
    /** Additional dependencies */
    dependencies: ComponentDependency[];
  };
}

/**
 * Capability negotiation result
 */
export interface CapabilityNegotiation {
  /** Whether negotiation was successful */
  success: boolean;
  /** Matched capabilities */
  matches: CapabilityMatch[];
  /** Unmatched requirements */
  unmatched: ComponentRequires[];
  /** Overall compatibility score */
  score: number;
  /** Required adaptations */
  adaptations: string[];
  /** Negotiation metadata */
  metadata: Metadata;
}

// =============================================================================
// MountPlan Interface
// =============================================================================

/**
 * Mount plan execution mode
 */
export type MountMode =
  | 'static' // Pre-computed mount plan
  | 'interactive' // Dynamic plan with user input
  | 'isolated' // Sandboxed execution
  | 'hybrid'; // Combination of modes

/**
 * Mount plan status
 */
export type MountPlanStatus =
  | 'draft' // Under construction
  | 'validated' // Passed validation
  | 'executing' // Currently executing
  | 'completed' // Successfully executed
  | 'failed' // Execution failed
  | 'cancelled' // Execution cancelled
  | 'rollback'; // Rolling back changes

/**
 * Adapter configuration for bridging capability gaps
 */
export interface AdapterConfig {
  /** Adapter identifier */
  id: string;
  /** Adapter name */
  name: string;
  /** Adapter version */
  version: VersionString;
  /** Source capability being adapted */
  source: string;
  /** Target capability to provide */
  target: string;
  /** Adapter-specific configuration */
  config: Metadata;
  /** Performance impact */
  impact: {
    /** Memory overhead in KB */
    memory: number;
    /** Performance penalty percentage */
    performance: number;
    /** Initialization time in ms */
    initTime: number;
  };
}

/**
 * Component mount specification
 */
export interface ComponentMount {
  /** Component to mount */
  component: ComponentId;
  /** Target environment */
  environment: string;
  /** Mount priority (lower numbers mount first) */
  priority: number;
  /** Dependencies that must be mounted first */
  dependencies: string[];
  /** Required adapters */
  adapters: AdapterConfig[];
  /** Mount-specific configuration */
  config: Metadata;
  /** Health scoring for this mount */
  health: {
    /** Compatibility score (0-1) */
    compatibility: number;
    /** Performance score (0-1) */
    performance: number;
    /** Security score (0-1) */
    security: number;
    /** Overall health score (0-1) */
    overall: number;
  };
}

/**
 * Mount plan diff for tracking changes
 */
export interface MountPlanDiff {
  /** Diff timestamp */
  timestamp: Timestamp;
  /** Previous plan version */
  previous: VersionString;
  /** Current plan version */
  current: VersionString;
  /** Added components */
  added: ComponentMount[];
  /** Removed components */
  removed: ComponentMount[];
  /** Modified components */
  modified: Array<{
    component: ComponentId;
    changes: string[];
    before: ComponentMount;
    after: ComponentMount;
  }>;
  /** Summary of changes */
  summary: {
    /** Total number of changes */
    changeCount: number;
    /** Impact assessment */
    impact: 'low' | 'medium' | 'high' | 'critical';
    /** Required testing */
    testing: string[];
  };
}

/**
 * Mount plan execution result
 */
export interface MountPlanExecution {
  /** Execution ID */
  id: string;
  /** Execution status */
  status: MountPlanStatus;
  /** Start timestamp */
  startedAt: Timestamp;
  /** End timestamp */
  completedAt?: Timestamp;
  /** Execution duration in ms */
  duration?: number;
  /** Successfully mounted components */
  success: ComponentMount[];
  /** Failed component mounts */
  failures: Array<{
    component: ComponentMount;
    error: string;
    recoverable: boolean;
    suggestions: string[];
  }>;
  /** Performance metrics */
  metrics: {
    /** Total memory usage in MB */
    memory: number;
    /** Total execution time in ms */
    executionTime: number;
    /** Bundle size in KB */
    bundleSize: number;
    /** Number of network requests */
    networkRequests: number;
  };
}

/**
 * Mount plan interface definition
 *
 * Represents a complete execution plan for mounting components
 * in a specific environment with dependency resolution and health scoring.
 */
export interface MountPlan {
  /** Unique plan identifier */
  id: string;
  /** Plan name */
  name: string;
  /** Plan description */
  description: string;
  /** Plan version */
  version: VersionString;

  /** Target environment */
  environment: ComponentId;
  /** Execution mode */
  mode: MountMode;
  /** Current status */
  status: MountPlanStatus;

  /** Components to mount */
  components: ComponentMount[];
  /** Execution order (topologically sorted) */
  executionOrder: string[];
  /** Total execution time estimate in ms */
  estimatedTime: number;

  /** Plan validation results */
  validation: {
    /** Whether plan is valid */
    valid: boolean;
    /** Validation errors */
    errors: string[];
    /** Validation warnings */
    warnings: string[];
    /** Last validation timestamp */
    lastValidated: Timestamp;
  };

  /** Plan health metrics */
  health: {
    /** Overall plan health score (0-1) */
    score: number;
    /** Individual health components */
    components: {
      compatibility: number;
      performance: number;
      security: number;
      maintainability: number;
    };
    /** Health trends */
    trends: Array<{
      timestamp: Timestamp;
      score: number;
      changes: string[];
    }>;
  };

  /** Plan history and changes */
  history: {
    /** Plan diffs */
    diffs: MountPlanDiff[];
    /** Execution history */
    executions: MountPlanExecution[];
    /** Plan lineage */
    parentPlan?: string;
    /** Child plans */
    childPlans: string[];
  };

  /** Plan metadata */
  metadata: Metadata;

  /** Plan author */
  author: string;
  /** Creation timestamp */
  createdAt: Timestamp;
  /** Last update timestamp */
  updatedAt: Timestamp;
}

// =============================================================================
// Profile Interface
// =============================================================================

/**
 * Profile scope
 */
export type ProfileScope =
  | 'global' // Available to all environments
  | 'environment' // Specific to an environment type
  | 'team' // Shared within a team
  | 'personal' // Personal/private profile
  | 'project'; // Project-specific profile

/**
 * Profile permission level
 */
export type ProfilePermission =
  | 'read' // Can view profile
  | 'use' // Can apply profile
  | 'modify' // Can edit profile
  | 'manage' // Can manage permissions
  | 'admin'; // Full administrative access

/**
 * Environment snapshot for profile
 */
export interface EnvironmentSnapshot {
  /** Environment identifier */
  environmentId: string;
  /** Environment configuration at time of snapshot */
  config: Environment;
  /** Capability states */
  capabilities: Record<string, Metadata>;
  /** Snapshot timestamp */
  timestamp: Timestamp;
  /** Snapshot version */
  version: VersionString;
}

/**
 * Profile template for reusable configurations
 */
export interface ProfileTemplate {
  /** Template identifier */
  id: string;
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Template category */
  category: string;
  /** Default configuration values */
  defaults: Metadata;
  /** Required parameters */
  required: string[];
  /** Optional parameters */
  optional: string[];
  /** Template usage examples */
  examples: Array<{
    name: string;
    description: string;
    config: Metadata;
  }>;
}

/**
 * Profile sharing and collaboration
 */
export interface ProfileSharing {
  /** Whether profile is shareable */
  enabled: boolean;
  /** Share URL (if public) */
  shareUrl?: string;
  /** Access permissions */
  permissions: Array<{
    /** User or team identifier */
    principal: string;
    /** Principal type */
    type: 'user' | 'team' | 'organization';
    /** Permission level */
    level: ProfilePermission;
    /** Grant timestamp */
    grantedAt: Timestamp;
    /** Granted by */
    grantedBy: string;
  }>;
  /** Collaboration features */
  collaboration: {
    /** Allow comments */
    comments: boolean;
    /** Allow suggestions */
    suggestions: boolean;
    /** Require approval for changes */
    requireApproval: boolean;
  };
}

/**
 * Profile interface definition
 *
 * Represents a reusable configuration template for mount plans
 * with environment snapshots and sharing capabilities.
 */
export interface Profile {
  /** Unique profile identifier */
  id: string;
  /** Profile name */
  name: string;
  /** Profile description */
  description: string;
  /** Profile version */
  version: VersionString;

  /** Profile scope */
  scope: ProfileScope;
  /** Profile category/tags */
  category: string;
  /** Profile tags for discovery */
  tags: string[];

  /** Environment snapshots */
  environments: EnvironmentSnapshot[];
  /** Default mount plan template */
  mountPlanTemplate: Partial<MountPlan>;
  /** Profile-specific configuration */
  configuration: {
    /** Feature flags */
    features: Record<string, boolean>;
    /** Environment variables */
    env: Record<string, string>;
    /** Deployment settings */
    deployment: Partial<DeploymentConfig>;
    /** Resource constraints */
    constraints: Partial<ResourceConstraints>;
  };

  /** Profile validation rules */
  validation: {
    /** Required environment capabilities */
    requiredCapabilities: string[];
    /** Minimum environment health score */
    minHealthScore: number;
    /** Component compatibility rules */
    compatibilityRules: string[];
    /** Custom validation functions */
    customValidation: string[];
  };

  /** Template system */
  template: ProfileTemplate;

  /** Sharing and permissions */
  sharing: ProfileSharing;

  /** Profile usage statistics */
  usage: {
    /** Number of times used */
    useCount: number;
    /** Last used timestamp */
    lastUsed: Timestamp;
    /** Popular environments */
    popularEnvironments: string[];
    /** Success rate */
    successRate: number;
  };

  /** Profile history */
  history: {
    /** Version history */
    versions: Array<{
      version: VersionString;
      changes: string[];
      timestamp: Timestamp;
      author: string;
    }>;
    /** Fork relationships */
    forkedFrom?: string;
    /** Profile forks */
    forks: string[];
  };

  /** Profile metadata */
  metadata: Metadata;

  /** Profile owner */
  owner: string;
  /** Profile maintainers */
  maintainers: string[];
  /** Creation timestamp */
  createdAt: Timestamp;
  /** Last update timestamp */
  updatedAt: Timestamp;
}

// =============================================================================
// Re-export types from semver
// =============================================================================

export type { SemVer };
