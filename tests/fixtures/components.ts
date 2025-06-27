/**
 * Component test fixtures
 * Predefined component data for testing
 */

import { faker } from '@faker-js/faker';

export interface ComponentFixture {
  name: string;
  version: string;
  description: string;
  author: string;
  keywords: string[];
  contractId: string;
  sourceCode: string;
  buildArtifacts: Record<string, any>;
  type: 'COMPONENT' | 'TEMPLATE' | 'LAYOUT' | 'UTILITY';
  lifecycle: 'EXPERIMENTAL' | 'ALPHA' | 'BETA' | 'STABLE' | 'DEPRECATED';
  metadata: Record<string, any>;
}

export interface ComponentCreateFixture {
  name: string;
  version: string;
  description: string;
  author: string;
  keywords: string[];
  contractId: string;
  sourceCode: string;
  buildArtifacts?: Record<string, any>;
}

export interface ComponentUpdateFixture {
  description?: string;
  keywords?: string[];
  sourceCode?: string;
  buildArtifacts?: Record<string, any>;
}

/**
 * Predefined component fixtures for consistent testing
 */
export const componentFixtures: Record<string, ComponentFixture> = {
  button: {
    name: 'TestButton',
    version: '1.0.0',
    description: 'A reusable button component for UI interactions',
    author: 'Test Author',
    keywords: ['button', 'ui', 'interactive', 'clickable'],
    contractId: 'contract-button-1',
    sourceCode: `import React from 'react';
import { ButtonProps } from './types';

export const TestButton: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  disabled = false,
  variant = 'primary'
}) => {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={\`btn btn-\${variant}\`}
    >
      {children}
    </button>
  );
};`,
    buildArtifacts: {
      bundle: 'test-button.bundle.js',
      styles: 'test-button.css',
      types: 'test-button.d.ts',
      size: 2458,
      dependencies: ['react'],
    },
    type: 'COMPONENT',
    lifecycle: 'STABLE',
    metadata: {
      category: 'Forms',
      accessibility: 'WCAG-AA',
      responsive: true,
    },
  },

  input: {
    name: 'TestInput',
    version: '1.0.0',
    description: 'A reusable input component for form data collection',
    author: 'Test Author',
    keywords: ['input', 'form', 'text', 'validation'],
    contractId: 'contract-input-1',
    sourceCode: `import React, { useState } from 'react';
import { InputProps } from './types';

export const TestInput: React.FC<InputProps> = ({ 
  value,
  onChange,
  placeholder,
  disabled = false,
  type = 'text'
}) => {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="form-input"
    />
  );
};`,
    buildArtifacts: {
      bundle: 'test-input.bundle.js',
      styles: 'test-input.css',
      types: 'test-input.d.ts',
      size: 1834,
      dependencies: ['react'],
    },
    type: 'COMPONENT',
    lifecycle: 'STABLE',
    metadata: {
      category: 'Forms',
      accessibility: 'WCAG-AA',
      validation: true,
    },
  },

  modal: {
    name: 'TestModal',
    version: '2.0.0',
    description: 'A flexible modal dialog component',
    author: 'Test Author',
    keywords: ['modal', 'dialog', 'overlay', 'popup'],
    contractId: 'contract-modal-1',
    sourceCode: `import React from 'react';
import { ModalProps } from './types';

export const TestModal: React.FC<ModalProps> = ({ 
  isOpen,
  onClose,
  title,
  children
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};`,
    buildArtifacts: {
      bundle: 'test-modal.bundle.js',
      styles: 'test-modal.css',
      types: 'test-modal.d.ts',
      size: 3241,
      dependencies: ['react', 'react-dom'],
    },
    type: 'COMPONENT',
    lifecycle: 'BETA',
    metadata: {
      category: 'Overlays',
      accessibility: 'WCAG-AA',
      portal: true,
    },
  },

  card: {
    name: 'TestCard',
    version: '1.2.1',
    description: 'A versatile card component for content display',
    author: 'Test Author',
    keywords: ['card', 'container', 'content', 'layout'],
    contractId: 'contract-card-1',
    sourceCode: `import React from 'react';
import { CardProps } from './types';

export const TestCard: React.FC<CardProps> = ({ 
  title,
  children,
  actions,
  variant = 'default'
}) => {
  return (
    <div className={\`card card-\${variant}\`}>
      {title && <div className="card-header">{title}</div>}
      <div className="card-content">{children}</div>
      {actions && <div className="card-actions">{actions}</div>}
    </div>
  );
};`,
    buildArtifacts: {
      bundle: 'test-card.bundle.js',
      styles: 'test-card.css',
      types: 'test-card.d.ts',
      size: 1967,
      dependencies: ['react'],
    },
    type: 'COMPONENT',
    lifecycle: 'STABLE',
    metadata: {
      category: 'Layout',
      responsive: true,
      variants: ['default', 'elevated', 'outlined'],
    },
  },

  experimentalWidget: {
    name: 'ExperimentalWidget',
    version: '0.1.0',
    description: 'An experimental widget component for testing new features',
    author: 'Research Team',
    keywords: ['experimental', 'widget', 'research', 'prototype'],
    contractId: 'contract-experimental-1',
    sourceCode: `import React from 'react';

export const ExperimentalWidget: React.FC = () => {
  return (
    <div className="experimental-widget">
      <p>This is an experimental component</p>
    </div>
  );
};`,
    buildArtifacts: {
      bundle: 'experimental-widget.bundle.js',
      size: 1024,
      dependencies: ['react'],
    },
    type: 'COMPONENT',
    lifecycle: 'EXPERIMENTAL',
    metadata: {
      experimental: true,
      unstable: true,
    },
  },
};

/**
 * Component creation fixtures for API testing
 */
export const componentCreateFixtures: Record<string, ComponentCreateFixture> = {
  validButton: {
    name: 'NewButton',
    version: '1.0.0',
    description: 'A new button component',
    author: 'Test Author',
    keywords: ['button', 'new'],
    contractId: 'valid-contract-id',
    sourceCode: 'export const NewButton = () => <button>New</button>;',
    buildArtifacts: {},
  },

  validInput: {
    name: 'NewInput',
    version: '1.0.0',
    description: 'A new input component',
    author: 'Test Author',
    keywords: ['input', 'new'],
    contractId: 'valid-contract-id',
    sourceCode: 'export const NewInput = () => <input />;',
  },

  duplicateName: {
    name: 'TestButton', // Already exists
    version: '2.0.0',
    description: 'Duplicate name component',
    author: 'Test Author',
    keywords: ['duplicate'],
    contractId: 'valid-contract-id',
    sourceCode: 'export const DuplicateButton = () => <button>Duplicate</button>;',
  },

  invalidContract: {
    name: 'InvalidContractComponent',
    version: '1.0.0',
    description: 'Component with invalid contract',
    author: 'Test Author',
    keywords: ['invalid'],
    contractId: 'non-existent-contract',
    sourceCode: 'export const InvalidComponent = () => <div>Invalid</div>;',
  },

  emptyName: {
    name: '',
    version: '1.0.0',
    description: 'Component with empty name',
    author: 'Test Author',
    keywords: ['empty'],
    contractId: 'valid-contract-id',
    sourceCode: 'export const EmptyName = () => <div>Empty</div>;',
  },

  invalidVersion: {
    name: 'InvalidVersionComponent',
    version: 'not-semver',
    description: 'Component with invalid version',
    author: 'Test Author',
    keywords: ['invalid'],
    contractId: 'valid-contract-id',
    sourceCode: 'export const InvalidVersion = () => <div>Invalid</div>;',
  },

  missingSourceCode: {
    name: 'MissingCodeComponent',
    version: '1.0.0',
    description: 'Component missing source code',
    author: 'Test Author',
    keywords: ['missing'],
    contractId: 'valid-contract-id',
    sourceCode: '',
  },
};

/**
 * Component update fixtures for modification testing
 */
export const componentUpdateFixtures: Record<string, ComponentUpdateFixture> = {
  validUpdate: {
    description: 'Updated component description',
    keywords: ['updated', 'modified', 'new'],
  },

  sourceCodeUpdate: {
    sourceCode: `import React from 'react';
export const UpdatedComponent = () => {
  return <div>Updated source code</div>;
};`,
  },

  buildArtifactsUpdate: {
    buildArtifacts: {
      bundle: 'updated-bundle.js',
      styles: 'updated-styles.css',
      size: 3456,
      optimized: true,
    },
  },

  fullUpdate: {
    description: 'Completely updated component',
    keywords: ['complete', 'update', 'full'],
    sourceCode: 'export const FullyUpdated = () => <div>Fully updated</div>;',
    buildArtifacts: {
      bundle: 'full-update.bundle.js',
      size: 2000,
    },
  },

  emptyUpdate: {},

  invalidKeywords: {
    keywords: [''], // Empty keyword
  },
};

/**
 * Factory functions for generating dynamic component test data
 */
export class ComponentFixtureFactory {
  /**
   * Generate a random valid component
   */
  static generateComponent(overrides: Partial<ComponentFixture> = {}): ComponentFixture {
    const componentName = faker.lorem.word().charAt(0).toUpperCase() + faker.lorem.word().slice(1);
    
    return {
      name: `Test${componentName}`,
      version: ComponentFixtureFactory.generateVersion(),
      description: faker.lorem.sentence(),
      author: faker.person.fullName(),
      keywords: faker.lorem.words(3).split(' '),
      contractId: `contract-${faker.string.alphanumeric(8)}`,
      sourceCode: ComponentFixtureFactory.generateSourceCode(componentName),
      buildArtifacts: ComponentFixtureFactory.generateBuildArtifacts(),
      type: 'COMPONENT',
      lifecycle: 'STABLE',
      metadata: {},
      ...overrides,
    };
  }

  /**
   * Generate semantic version
   */
  static generateVersion(): string {
    const major = faker.number.int({ min: 0, max: 9 });
    const minor = faker.number.int({ min: 0, max: 9 });
    const patch = faker.number.int({ min: 0, max: 9 });
    return `${major}.${minor}.${patch}`;
  }

  /**
   * Generate React component source code
   */
  static generateSourceCode(componentName: string): string {
    return `import React from 'react';

export interface ${componentName}Props {
  children?: React.ReactNode;
  className?: string;
}

export const ${componentName}: React.FC<${componentName}Props> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};`;
  }

  /**
   * Generate build artifacts
   */
  static generateBuildArtifacts(): Record<string, any> {
    return {
      bundle: `${faker.system.fileName()}.bundle.js`,
      styles: `${faker.system.fileName()}.css`,
      types: `${faker.system.fileName()}.d.ts`,
      size: faker.number.int({ min: 1000, max: 50000 }),
      dependencies: ['react'],
      hash: faker.string.alphanumeric(32),
      buildTime: faker.date.recent().toISOString(),
    };
  }

  /**
   * Generate multiple components
   */
  static generateComponents(count: number, baseOverrides: Partial<ComponentFixture> = {}): ComponentFixture[] {
    return Array.from({ length: count }, (_, index) => 
      ComponentFixtureFactory.generateComponent({
        ...baseOverrides,
        name: `TestComponent${index + 1}`,
      })
    );
  }

  /**
   * Generate components with different lifecycles
   */
  static generateComponentsWithLifecycles(): ComponentFixture[] {
    const lifecycles: ComponentFixture['lifecycle'][] = ['EXPERIMENTAL', 'ALPHA', 'BETA', 'STABLE', 'DEPRECATED'];
    
    return lifecycles.map((lifecycle, index) => 
      ComponentFixtureFactory.generateComponent({
        lifecycle,
        name: `${lifecycle.toLowerCase()}Component${index + 1}`,
      })
    );
  }

  /**
   * Generate components with different types
   */
  static generateComponentsWithTypes(): ComponentFixture[] {
    const types: ComponentFixture['type'][] = ['COMPONENT', 'TEMPLATE', 'LAYOUT', 'UTILITY'];
    
    return types.map((type, index) => 
      ComponentFixtureFactory.generateComponent({
        type,
        name: `${type.toLowerCase()}Component${index + 1}`,
      })
    );
  }

  /**
   * Generate edge case components
   */
  static generateEdgeCaseComponents(): ComponentFixture[] {
    return [
      // Minimum viable component
      ComponentFixtureFactory.generateComponent({
        name: 'A',
        description: 'Minimal component',
        keywords: ['min'],
      }),
      
      // Maximum length values
      ComponentFixtureFactory.generateComponent({
        name: 'A'.repeat(255),
        description: 'A'.repeat(1000),
        keywords: Array(20).fill('keyword'),
      }),
      
      // Special characters in names
      ComponentFixtureFactory.generateComponent({
        name: 'Component-With-Dashes',
      }),
      
      // Complex source code
      ComponentFixtureFactory.generateComponent({
        sourceCode: ComponentFixtureFactory.generateComplexSourceCode(),
      }),
    ];
  }

  /**
   * Generate complex React component source code
   */
  static generateComplexSourceCode(): string {
    return `import React, { useState, useEffect, useCallback } from 'react';
import { ComplexComponentProps } from './types';

export const ComplexComponent: React.FC<ComplexComponentProps> = ({ 
  data,
  onUpdate,
  config,
  children 
}) => {
  const [state, setState] = useState(data);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setState(data);
  }, [data]);

  const handleUpdate = useCallback((newData) => {
    setLoading(true);
    try {
      setState(newData);
      onUpdate?.(newData);
    } finally {
      setLoading(false);
    }
  }, [onUpdate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="complex-component">
      <header>{config.title}</header>
      <main>{children}</main>
      <footer>
        <button onClick={() => handleUpdate({})}>
          Update
        </button>
      </footer>
    </div>
  );
};`;
  }
}