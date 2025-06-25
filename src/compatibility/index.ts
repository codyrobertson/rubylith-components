/**
 * @rubylith/component-registry
 * Compatibility checking utilities for components, contracts, environments, and capabilities
 */

import type {
  Component,
  Contract,
  Environment,
  Capability,
  VersionString,
  VersionRange,
  ComponentType,
  CapabilityType,
} from '../types';
import {
  satisfiesRange,
  getCompatibilityLevel,
  compareVersions,
  isValidVersion,
  isValidVersionRange,
  type VersionCompatibilityLevel,
} from '../utils';

// =============================================================================
// Type Predicates and Guards
// =============================================================================

/**
 * Type predicate to check if a value is a Component
 */
export function isComponent(value: unknown): value is Component {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'version' in value &&
    'type' in value &&
    'lifecycle' in value &&
    'contract' in value &&
    typeof (value as Component).name === 'string' &&
    isValidVersion((value as Component).version)
  );
}

/**
 * Type predicate to check if a value is a Contract
 */
export function isContract(value: unknown): value is Contract {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'version' in value &&
    'schemaVersion' in value &&
    'schema' in value &&
    typeof (value as Contract).name === 'string' &&
    isValidVersion((value as Contract).version) &&
    isValidVersion((value as Contract).schemaVersion)
  );
}

/**
 * Type predicate to check if a value is an Environment
 */
export function isEnvironment(value: unknown): value is Environment {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'type' in value &&
    'capabilities' in value &&
    typeof (value as Environment).id === 'string' &&
    typeof (value as Environment).name === 'string' &&
    Array.isArray((value as Environment).capabilities)
  );
}

/**
 * Type predicate to check if a value is a Capability
 */
export function isCapability(value: unknown): value is Capability {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'type' in value &&
    'version' in value &&
    typeof (value as Capability).id === 'string' &&
    typeof (value as Capability).name === 'string' &&
    isValidVersion((value as Capability).version)
  );
}

// =============================================================================
// Compatibility Result Types
// =============================================================================

export interface CompatibilityResult {
  compatible: boolean;
  level: VersionCompatibilityLevel;
  issues: CompatibilityIssue[];
  score: number; // 0-100, higher is better
}

export interface CompatibilityIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  field?: string;
  suggestion?: string;
}

export interface DependencyCompatibility {
  dependency: string;
  required: VersionRange;
  available?: VersionString;
  compatible: boolean;
  level: VersionCompatibilityLevel;
}

export interface CompatibilityCapabilityMatch {
  capability: CapabilityType;
  required: boolean;
  available: boolean;
  compatible: boolean;
  provider?: string | undefined;
  version?: VersionString | undefined;
}

// =============================================================================
// Component Compatibility Checking
// =============================================================================

/**
 * Check if a component is compatible with a contract
 */
export function checkComponentContractCompatibility(
  component: Component,
  contract: Contract
): CompatibilityResult {
  const issues: CompatibilityIssue[] = [];
  let score = 100;

  // Check contract reference
  if (component.contract.name !== contract.name) {
    issues.push({
      type: 'error',
      code: 'CONTRACT_MISMATCH',
      message: `Component references contract "${component.contract.name}" but expected "${contract.name}"`,
      field: 'contract.name',
    });
    score -= 50;
  }

  // Check contract version compatibility - newer versions are preferred if backward compatible
  const componentVersion = component.contract.version;
  const contractVersion = contract.version;

  let contractVersionCompatibility: VersionCompatibilityLevel;

  if (componentVersion === contractVersion) {
    contractVersionCompatibility = 'patch'; // exact match
  } else if (satisfiesRange(contractVersion, `>=${componentVersion}`)) {
    // Newer contract version, check if backward compatible
    contractVersionCompatibility = getCompatibilityLevel(componentVersion, contractVersion);

    // For contracts, newer minor/patch versions are typically backward compatible
    if (contractVersionCompatibility === 'major' || contractVersionCompatibility === 'minor') {
      // Bonus points for newer compatible versions
      score += 10;
    }
  } else {
    // Older contract version
    contractVersionCompatibility = getCompatibilityLevel(componentVersion, contractVersion);
    if (contractVersionCompatibility === 'none') {
      score -= 40;
    }
  }

  if (contractVersionCompatibility === 'none') {
    issues.push({
      type: 'error',
      code: 'CONTRACT_VERSION_INCOMPATIBLE',
      message: `Component contract version ${componentVersion} is incompatible with contract version ${contractVersion}`,
      field: 'contract.version',
    });
  }

  // Check runtime framework compatibility
  const componentFramework = contract.runtime.framework;
  const requiredFramework = contract.runtime.framework;

  if (componentFramework !== requiredFramework) {
    issues.push({
      type: 'error',
      code: 'RUNTIME_FRAMEWORK_MISMATCH',
      message: `Component framework mismatch: expected ${requiredFramework}`,
      field: 'runtime.framework',
    });
    score -= 30;
  }

  // Check component type compatibility
  const supportedTypes = ['ui-component', 'layout-component', 'data-component'] as ComponentType[];
  if (!supportedTypes.includes(component.type)) {
    issues.push({
      type: 'warning',
      code: 'COMPONENT_TYPE_UNSUPPORTED',
      message: `Component type "${component.type}" may not be fully supported`,
      field: 'type',
    });
    score -= 10;
  }

  const compatible = issues.filter((i) => i.type === 'error').length === 0;
  const level = compatible ? contractVersionCompatibility : ('none' as VersionCompatibilityLevel);

  return {
    compatible,
    level,
    issues,
    score: Math.max(0, score),
  };
}

/**
 * Check if a component's dependencies are satisfied
 */
export function checkDependencyCompatibility(
  component: Component,
  availableComponents: Component[]
): DependencyCompatibility[] {
  return component.dependencies.map((dep) => {
    const availableComponent = availableComponents.find((c) => c.name === dep.name);

    if (!availableComponent) {
      return {
        dependency: dep.name,
        required: dep.versionRange,
        compatible: dep.optional || false,
        level: 'none' as VersionCompatibilityLevel,
      };
    }

    const compatible = satisfiesRange(availableComponent.version, dep.versionRange);
    const level: VersionCompatibilityLevel = compatible ? 'patch' : 'none';

    return {
      dependency: dep.name,
      required: dep.versionRange,
      available: availableComponent.version,
      compatible,
      level,
    };
  });
}

// =============================================================================
// Environment Compatibility Checking
// =============================================================================

/**
 * Check if a component is compatible with an environment
 */
export function checkComponentEnvironmentCompatibility(
  component: Component,
  environment: Environment
): CompatibilityResult {
  const issues: CompatibilityIssue[] = [];
  let score = 100;

  // Check if component type is supported
  if (!environment.compatibility.supportedTypes.includes(component.type)) {
    issues.push({
      type: 'error',
      code: 'COMPONENT_TYPE_UNSUPPORTED',
      message: `Component type "${component.type}" is not supported in this environment`,
      field: 'type',
    });
    score -= 50;
  }

  // Check if component is blacklisted
  const isBlacklisted = environment.compatibility.blacklist.some(
    (blacklisted) => blacklisted.name === component.name
  );

  if (isBlacklisted) {
    issues.push({
      type: 'error',
      code: 'COMPONENT_BLACKLISTED',
      message: `Component "${component.name}" is blacklisted in this environment`,
    });
    score -= 100;
  }

  // Check version constraints
  const versionConstraint = environment.compatibility.constraints[component.name];
  if (versionConstraint && !satisfiesRange(component.version, versionConstraint)) {
    issues.push({
      type: 'error',
      code: 'VERSION_CONSTRAINT_VIOLATION',
      message: `Component version ${component.version} violates environment constraint ${versionConstraint}`,
      field: 'version',
    });
    score -= 40;
  }

  // Check required capabilities
  const capabilityMatches = checkCapabilityMatches(component, environment);
  const missingCapabilities = capabilityMatches.filter(
    (match) => match.required && !match.available
  );

  if (missingCapabilities.length > 0) {
    issues.push({
      type: 'error',
      code: 'MISSING_CAPABILITIES',
      message: `Missing required capabilities: ${missingCapabilities.map((c) => c.capability).join(', ')}`,
      suggestion: 'Ensure environment provides all required capabilities',
    });
    score -= missingCapabilities.length * 15;
  }

  const compatible = issues.filter((i) => i.type === 'error').length === 0;

  return {
    compatible,
    level: compatible ? 'patch' : 'none',
    issues,
    score: Math.max(0, score),
  };
}

/**
 * Check capability matches between component requirements and environment capabilities
 */
export function checkCapabilityMatches(
  component: Component,
  environment: Environment
): CompatibilityCapabilityMatch[] {
  const matches: CompatibilityCapabilityMatch[] = [];

  // Check each required capability
  component.requires.forEach((required) => {
    const availableCapability = environment.capabilities.find((cap) => cap.name === required.name);

    const compatible = availableCapability
      ? satisfiesRange(availableCapability.version, required.versionRange)
      : false;

    matches.push({
      capability: required.name as CapabilityType,
      required: !required.optional,
      available: !!availableCapability,
      compatible,
      provider: availableCapability?.provider,
      version: availableCapability?.version,
    });
  });

  return matches;
}

// =============================================================================
// Contract Compatibility Checking
// =============================================================================

/**
 * Check if two contracts are compatible (for migration scenarios)
 */
export function checkContractCompatibility(
  sourceContract: Contract,
  targetContract: Contract
): CompatibilityResult {
  const issues: CompatibilityIssue[] = [];
  let score = 100;

  // Check if same contract
  if (sourceContract.name !== targetContract.name) {
    issues.push({
      type: 'error',
      code: 'CONTRACT_NAME_MISMATCH',
      message: 'Contract names do not match',
    });
    return {
      compatible: false,
      level: 'none',
      issues,
      score: 0,
    };
  }

  // Check version compatibility
  const versionLevel = getCompatibilityLevel(sourceContract.version, targetContract.version);

  if (versionLevel === 'none') {
    issues.push({
      type: 'error',
      code: 'VERSION_INCOMPATIBLE',
      message: `Contract versions are incompatible: ${sourceContract.version} -> ${targetContract.version}`,
    });
    score -= 50;
  }

  // Check schema version compatibility
  const schemaLevel = getCompatibilityLevel(
    sourceContract.schemaVersion,
    targetContract.schemaVersion
  );

  if (schemaLevel === 'none') {
    issues.push({
      type: 'error',
      code: 'SCHEMA_VERSION_INCOMPATIBLE',
      message: `Schema versions are incompatible: ${sourceContract.schemaVersion} -> ${targetContract.schemaVersion}`,
    });
    score -= 40;
  }

  // Check runtime framework compatibility
  if (sourceContract.runtime.framework !== targetContract.runtime.framework) {
    issues.push({
      type: 'warning',
      code: 'RUNTIME_FRAMEWORK_CHANGE',
      message: `Runtime framework changed: ${sourceContract.runtime.framework} -> ${targetContract.runtime.framework}`,
      suggestion: 'Verify component compatibility with new runtime framework',
    });
    score -= 20;
  }

  // Check breaking changes
  if (
    targetContract.compatibility.breakingChanges &&
    targetContract.compatibility.breakingChanges.length > 0
  ) {
    issues.push({
      type: 'warning',
      code: 'BREAKING_CHANGES_PRESENT',
      message: `Contract contains ${targetContract.compatibility.breakingChanges.length} breaking changes`,
      suggestion: targetContract.compatibility.migrationGuide
        ? `See migration guide: ${targetContract.compatibility.migrationGuide}`
        : 'Review breaking changes before upgrading',
    });
    score -= targetContract.compatibility.breakingChanges.length * 10;
  }

  const compatible = issues.filter((i) => i.type === 'error').length === 0;

  // Map levels to numeric values for comparison
  const levelToNumber = (level: VersionCompatibilityLevel): number => {
    switch (level) {
      case 'patch':
        return 3;
      case 'minor':
        return 2;
      case 'major':
        return 1;
      case 'none':
        return 0;
      default:
        return 0;
    }
  };

  const numberToLevel = (num: number): VersionCompatibilityLevel => {
    switch (num) {
      case 3:
        return 'patch';
      case 2:
        return 'minor';
      case 1:
        return 'major';
      case 0:
        return 'none';
      default:
        return 'none';
    }
  };

  const finalLevel = compatible
    ? numberToLevel(Math.min(levelToNumber(versionLevel), levelToNumber(schemaLevel)))
    : 'none';

  return {
    compatible,
    level: finalLevel,
    issues,
    score: Math.max(0, score),
  };
}

// =============================================================================
// Batch Compatibility Checking
// =============================================================================

/**
 * Check compatibility for multiple components against an environment
 */
export function checkBatchCompatibility(
  components: Component[],
  environment: Environment
): Map<string, CompatibilityResult> {
  const results = new Map<string, CompatibilityResult>();

  components.forEach((component) => {
    const result = checkComponentEnvironmentCompatibility(component, environment);
    results.set(component.name, result);
  });

  return results;
}

/**
 * Find compatible environments for a component
 */
export function findCompatibleEnvironments(
  component: Component,
  environments: Environment[],
  minScore = 80
): Array<{ environment: Environment; result: CompatibilityResult }> {
  return environments
    .map((env) => ({
      environment: env,
      result: checkComponentEnvironmentCompatibility(component, env),
    }))
    .filter(({ result }) => result.compatible && result.score >= minScore)
    .sort((a, b) => b.result.score - a.result.score);
}

/**
 * Find the best contract version for a component
 */
export function findBestContractVersion(
  component: Component,
  availableContracts: Contract[]
): Contract | null {
  const compatibleContracts = availableContracts
    .filter((contract) => contract.name === component.contract.name)
    .map((contract) => ({
      contract,
      result: checkComponentContractCompatibility(component, contract),
    }))
    .filter(({ result }) => result.compatible)
    .sort((a, b) => {
      // Prioritize by score, then by version (newer is better)
      if (a.result.score !== b.result.score) {
        return b.result.score - a.result.score;
      }
      return compareVersions(b.contract.version, a.contract.version);
    });

  return compatibleContracts.length > 0 ? compatibleContracts[0]!.contract : null;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate compatibility score between two version strings
 */
export function calculateCompatibilityScore(
  version1: VersionString,
  version2: VersionString
): number {
  if (version1 === version2) {
    return 100; // exact match
  }

  const level = getCompatibilityLevel(version1, version2);

  switch (level) {
    case 'patch':
      return 100;
    case 'minor':
      return 75;
    case 'major':
      return 50;
    case 'none':
      return 0;
    default:
      return 0;
  }
}

/**
 * Check if a version range is valid and properly formatted
 */
export function isValidVersionRangeFormat(range: VersionRange): boolean {
  return isValidVersionRange(range);
}

/**
 * Exhaustive type checking utility
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

/**
 * Type-safe enum checking
 */
export function isValidComponentType(value: string): value is ComponentType {
  const validTypes: ComponentType[] = [
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
  ];
  return validTypes.includes(value as ComponentType);
}

/**
 * Type-safe capability type checking
 */
export function isValidCapabilityType(value: string): value is CapabilityType {
  const validTypes: CapabilityType[] = [
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
  ];
  return validTypes.includes(value as CapabilityType);
}
