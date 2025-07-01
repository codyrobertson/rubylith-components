import { ComponentType, ComponentLifecycle, ComponentCreateRequest } from '../../src/types/component';

export interface ComponentCreateFixture extends ComponentCreateRequest {
  // This interface now matches the validation schema exactly
}

export function createComponentFixture(overrides: Partial<ComponentCreateFixture> = {}): ComponentCreateFixture {
  return {
    name: 'test-component',
    version: '1.0.0',
    type: ComponentType.BUTTON,
    lifecycle: ComponentLifecycle.STABLE,
    description: 'A test component for validation',
    author: 'Test Author',
    license: 'MIT',
    homepage: 'https://example.com',
    repository: 'https://github.com/test/test-component',
    keywords: ['ui', 'component', 'button'],
    contractId: 'contract-123',
    metadata: {
      framework: 'react',
      category: 'input'
    },
    ...overrides
  };
}

export function createMinimalComponentFixture(overrides: Partial<ComponentCreateFixture> = {}): ComponentCreateFixture {
  return {
    name: 'minimal-component',
    version: '1.0.0',
    type: ComponentType.OTHER,
    lifecycle: ComponentLifecycle.ALPHA,
    description: 'A minimal test component',
    author: 'Test Author',
    license: 'MIT',
    keywords: ['test'],
    ...overrides
  };
}

export function createInvalidComponentFixture(): any {
  return {
    name: '', // Invalid: empty string
    version: 'invalid-version', // Invalid: doesn't match semver pattern
    type: 'invalid-type', // Invalid: not in enum
    lifecycle: 'invalid-lifecycle', // Invalid: not in enum
    description: 'Test component with invalid data',
    author: 'Test Author',
    license: 'MIT',
    keywords: 'not-an-array', // Invalid: should be array
  };
}