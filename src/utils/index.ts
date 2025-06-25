import semver from 'semver';
import type { VersionString, VersionRange } from '../types/index';

// =============================================================================
// Version Validation
// =============================================================================

/**
 * Type guard to check if a string is a valid semantic version
 */
export function isValidVersion(version: string): version is VersionString {
  return semver.valid(version) !== null;
}

/**
 * Type guard to check if a string is a valid version range
 */
export function isValidVersionRange(range: string): range is VersionRange {
  try {
    return semver.validRange(range) !== null;
  } catch {
    return false;
  }
}

/**
 * Validates and normalizes a version string
 * @param version - Version string to validate
 * @returns Normalized version string
 * @throws Error if version is invalid
 */
export function validateVersion(version: string): VersionString {
  const cleanVersion = semver.clean(version);
  if (!cleanVersion) {
    throw new Error(`Invalid version: ${version}`);
  }
  return cleanVersion;
}

/**
 * Validates and normalizes a version range string
 * @param range - Version range string to validate
 * @returns Normalized version range string
 * @throws Error if range is invalid
 */
export function validateVersionRange(range: string): VersionRange {
  const validRange = semver.validRange(range);
  if (!validRange) {
    throw new Error(`Invalid version range: ${range}`);
  }
  return validRange;
}

// =============================================================================
// Version Parsing
// =============================================================================

/**
 * Parses a version string into its components
 */
export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: ReadonlyArray<string | number>;
  build: ReadonlyArray<string>;
  version: VersionString;
  raw: string;
}

/**
 * Parses a version string into its semantic components
 * @param version - Version string to parse
 * @returns Parsed version object
 * @throws Error if version is invalid
 */
export function parseVersion(version: string): ParsedVersion {
  const parsed = semver.parse(version);
  if (!parsed) {
    throw new Error(`Invalid version: ${version}`);
  }

  return {
    major: parsed.major,
    minor: parsed.minor,
    patch: parsed.patch,
    prerelease: parsed.prerelease,
    build: parsed.build,
    version: parsed.version,
    raw: parsed.raw,
  };
}

// =============================================================================
// Version Comparison
// =============================================================================

/**
 * Compares two versions
 * @param version1 - First version to compare
 * @param version2 - Second version to compare
 * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
export function compareVersions(version1: VersionString, version2: VersionString): -1 | 0 | 1 {
  return semver.compare(version1, version2);
}

/**
 * Checks if version1 is greater than version2
 */
export function isVersionGreater(version1: VersionString, version2: VersionString): boolean {
  return semver.gt(version1, version2);
}

/**
 * Checks if version1 is greater than or equal to version2
 */
export function isVersionGreaterOrEqual(version1: VersionString, version2: VersionString): boolean {
  return semver.gte(version1, version2);
}

/**
 * Checks if version1 is less than version2
 */
export function isVersionLess(version1: VersionString, version2: VersionString): boolean {
  return semver.lt(version1, version2);
}

/**
 * Checks if version1 is less than or equal to version2
 */
export function isVersionLessOrEqual(version1: VersionString, version2: VersionString): boolean {
  return semver.lte(version1, version2);
}

/**
 * Checks if two versions are equal
 */
export function isVersionEqual(version1: VersionString, version2: VersionString): boolean {
  return semver.eq(version1, version2);
}

// =============================================================================
// Version Range Matching
// =============================================================================

/**
 * Checks if a version satisfies a given range
 * @param version - Version to check
 * @param range - Version range to check against
 * @returns True if version satisfies the range
 */
export function satisfiesRange(version: VersionString, range: VersionRange): boolean {
  return semver.satisfies(version, range);
}

/**
 * Finds the maximum version that satisfies a range from a list of versions
 * @param versions - Array of versions to check
 * @param range - Version range to satisfy
 * @returns Maximum satisfying version or null if none found
 */
export function maxSatisfying(
  versions: VersionString[],
  range: VersionRange
): VersionString | null {
  const result = semver.maxSatisfying(versions, range);
  return result;
}

/**
 * Finds the minimum version that satisfies a range from a list of versions
 * @param versions - Array of versions to check
 * @param range - Version range to satisfy
 * @returns Minimum satisfying version or null if none found
 */
export function minSatisfying(
  versions: VersionString[],
  range: VersionRange
): VersionString | null {
  const result = semver.minSatisfying(versions, range);
  return result;
}

/**
 * Filters versions that satisfy a given range
 * @param versions - Array of versions to filter
 * @param range - Version range to satisfy
 * @returns Array of versions that satisfy the range
 */
export function filterSatisfying(versions: VersionString[], range: VersionRange): VersionString[] {
  return versions.filter((version) => satisfiesRange(version, range));
}

// =============================================================================
// Version Sorting
// =============================================================================

/**
 * Sorts versions in ascending order
 * @param versions - Array of versions to sort
 * @returns Sorted array of versions
 */
export function sortVersionsAsc(versions: VersionString[]): VersionString[] {
  return [...versions].sort(compareVersions);
}

/**
 * Sorts versions in descending order
 * @param versions - Array of versions to sort
 * @returns Sorted array of versions
 */
export function sortVersionsDesc(versions: VersionString[]): VersionString[] {
  return [...versions].sort((a, b) => compareVersions(b, a));
}

/**
 * Gets the latest (highest) version from an array
 * @param versions - Array of versions
 * @returns Latest version or null if array is empty
 */
export function getLatestVersion(versions: VersionString[]): VersionString | null {
  if (versions.length === 0) {
    return null;
  }
  return sortVersionsDesc(versions)[0] ?? null;
}

// =============================================================================
// Version Increment
// =============================================================================

/**
 * Release type for version incrementation
 */
export type ReleaseType =
  | 'major'
  | 'premajor'
  | 'minor'
  | 'preminor'
  | 'patch'
  | 'prepatch'
  | 'prerelease';

/**
 * Increments a version by the specified release type
 * @param version - Version to increment
 * @param releaseType - Type of release increment
 * @param identifier - Prerelease identifier (for prerelease types)
 * @returns Incremented version
 */
export function incrementVersion(
  version: VersionString,
  releaseType: ReleaseType,
  identifier?: string
): VersionString {
  const incremented = semver.inc(version, releaseType, identifier);
  if (!incremented) {
    throw new Error(`Failed to increment version: ${version}`);
  }
  return incremented;
}

// =============================================================================
// Compatibility Checking
// =============================================================================

/**
 * Version compatibility level between two versions
 */
export type VersionCompatibilityLevel = 'major' | 'minor' | 'patch' | 'none';

/**
 * Determines the compatibility level between two versions
 * @param version1 - First version
 * @param version2 - Second version
 * @returns Compatibility level
 */
export function getCompatibilityLevel(
  version1: VersionString,
  version2: VersionString
): VersionCompatibilityLevel {
  const parsed1 = parseVersion(version1);
  const parsed2 = parseVersion(version2);

  if (parsed1.major !== parsed2.major) {
    return 'none';
  }

  if (parsed1.minor !== parsed2.minor) {
    return 'major';
  }

  if (parsed1.patch !== parsed2.patch) {
    return 'minor';
  }

  return 'patch';
}

/**
 * Checks if two versions are compatible (same major version)
 * @param version1 - First version
 * @param version2 - Second version
 * @returns True if versions are compatible
 */
export function areVersionsCompatible(version1: VersionString, version2: VersionString): boolean {
  return getCompatibilityLevel(version1, version2) !== 'none';
}

// =============================================================================
// Version Range Creation
// =============================================================================

/**
 * Creates a caret range (^) for a version
 * @param version - Base version
 * @returns Caret range string
 */
export function createCaretRange(version: VersionString): VersionRange {
  return `^${version}`;
}

/**
 * Creates a tilde range (~) for a version
 * @param version - Base version
 * @returns Tilde range string
 */
export function createTildeRange(version: VersionString): VersionRange {
  return `~${version}`;
}

/**
 * Creates an exact range for a version
 * @param version - Base version
 * @returns Exact range string
 */
export function createExactRange(version: VersionString): VersionRange {
  return version;
}

/**
 * Creates a greater than or equal range
 * @param version - Minimum version
 * @returns Greater than or equal range string
 */
export function createMinRange(version: VersionString): VersionRange {
  return `>=${version}`;
}

/**
 * Creates a less than range
 * @param version - Maximum version (exclusive)
 * @returns Less than range string
 */
export function createMaxRange(version: VersionString): VersionRange {
  return `<${version}`;
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Custom error class for version-related errors
 */
export class VersionError extends Error {
  constructor(
    message: string,
    public readonly version?: string,
    public readonly range?: string
  ) {
    super(message);
    this.name = 'VersionError';
  }
}

/**
 * Safely parses a version, returning null on failure
 * @param version - Version string to parse
 * @returns Parsed version or null if invalid
 */
export function safeParseVersion(version: string): ParsedVersion | null {
  try {
    return parseVersion(version);
  } catch {
    return null;
  }
}

/**
 * Safely validates a version, returning false on failure
 * @param version - Version string to validate
 * @returns True if valid, false otherwise
 */
export function safeValidateVersion(version: string): version is VersionString {
  try {
    validateVersion(version);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely checks range satisfaction, returning false on failure
 * @param version - Version to check
 * @param range - Range to check against
 * @returns True if satisfies, false otherwise
 */
export function safeSatisfiesRange(version: string, range: string): boolean {
  try {
    return satisfiesRange(version, range);
  } catch {
    return false;
  }
}
