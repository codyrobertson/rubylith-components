/**
 * Contract test fixtures
 * Predefined contract data for testing
 */

import { faker } from '@faker-js/faker';

export interface ContractFixture {
  name: string;
  version: string;
  schemaVersion: string;
  description: string;
  author: string;
  keywords: string[];
  schemaProps: Record<string, any>;
  schemaEvents: Record<string, any>;
  schemaMethods: Record<string, any>;
  validationRequired: string[];
  validationOptional: string[];
  validationRules: Record<string, any>;
  themeTokens: any[];
  themeVariants: any[];
  themeNamespace: string;
  layoutType: string;
  layoutGrid?: Record<string, any>;
  layoutBreakpoints?: Record<string, any>;
  layoutSpacing?: Record<string, any>;
  layoutContainerQuery?: Record<string, any>;
  styleEngineType: string;
  styleEngineConfig: Record<string, any>;
  styleEngineOptimization?: Record<string, any>;
  runtimeFramework: string;
  runtimeVersion: string;
  runtimePolyfills: string[];
  runtimeBrowserSupport: Record<string, any>;
  runtimeFeatures?: Record<string, any>;
  runtimePerformance?: Record<string, any>;
  compatibilityMinSchemaVersion: string;
  compatibilityBreakingChanges: string[];
  compatibilityMigrationGuide?: string;
  metadata?: Record<string, any>;
}

export interface ContractCreateFixture {
  name: string;
  version: string;
  schemaVersion: string;
  description: string;
  author: string;
  keywords: string[];
  schemaProps: Record<string, any>;
  schemaEvents: Record<string, any>;
  schemaMethods: Record<string, any>;
  validationRequired: string[];
  validationOptional: string[];
  validationRules: Record<string, any>;
  themeTokens: any[];
  themeVariants: any[];
  themeNamespace: string;
  layoutType: string;
  styleEngineType: string;
  styleEngineConfig: Record<string, any>;
  runtimeFramework: string;
  runtimeVersion: string;
  runtimePolyfills: string[];
  runtimeBrowserSupport: Record<string, any>;
  compatibilityMinSchemaVersion: string;
  compatibilityBreakingChanges: string[];
}

/**
 * Predefined contract fixtures for consistent testing
 */
export const contractFixtures: Record<string, ContractFixture> = {
  buttonContract: {
    name: 'ButtonContract',
    version: '1.0.0',
    schemaVersion: '1.0.0',
    description: 'Contract defining the interface for button components',
    author: 'UI Team',
    keywords: ['button', 'interactive', 'ui', 'form'],
    
    schemaProps: {
      children: {
        type: 'ReactNode',
        description: 'Button content',
        required: true,
      },
      onClick: {
        type: 'function',
        description: 'Click event handler',
        signature: '(event: MouseEvent) => void',
        required: true,
      },
      disabled: {
        type: 'boolean',
        description: 'Whether button is disabled',
        default: false,
        required: false,
      },
      variant: {
        type: 'string',
        description: 'Button visual variant',
        enum: ['primary', 'secondary', 'outline', 'ghost'],
        default: 'primary',
        required: false,
      },
      size: {
        type: 'string',
        description: 'Button size',
        enum: ['small', 'medium', 'large'],
        default: 'medium',
        required: false,
      },
    },
    
    schemaEvents: {
      click: {
        type: 'MouseEvent',
        description: 'Fired when button is clicked',
        bubbles: true,
        cancelable: true,
      },
      focus: {
        type: 'FocusEvent',
        description: 'Fired when button receives focus',
        bubbles: false,
        cancelable: false,
      },
      blur: {
        type: 'FocusEvent',
        description: 'Fired when button loses focus',
        bubbles: false,
        cancelable: false,
      },
    },
    
    schemaMethods: {
      focus: {
        description: 'Programmatically focus the button',
        signature: '() => void',
        returns: 'void',
      },
      blur: {
        description: 'Programmatically blur the button',
        signature: '() => void',
        returns: 'void',
      },
    },
    
    validationRequired: ['children', 'onClick'],
    validationOptional: ['disabled', 'variant', 'size', 'className', 'id'],
    validationRules: {
      children: {
        notEmpty: true,
        maxLength: 100,
      },
      variant: {
        oneOf: ['primary', 'secondary', 'outline', 'ghost'],
      },
      size: {
        oneOf: ['small', 'medium', 'large'],
      },
    },
    
    themeTokens: [
      {
        name: 'button-primary-bg',
        type: 'color',
        default: '#007bff',
        description: 'Primary button background color',
      },
      {
        name: 'button-primary-text',
        type: 'color',
        default: '#ffffff',
        description: 'Primary button text color',
      },
      {
        name: 'button-border-radius',
        type: 'dimension',
        default: '4px',
        description: 'Button border radius',
      },
      {
        name: 'button-padding',
        type: 'dimension',
        default: '8px 16px',
        description: 'Button padding',
      },
    ],
    
    themeVariants: [
      {
        name: 'primary',
        tokens: {
          'button-bg': '$button-primary-bg',
          'button-text': '$button-primary-text',
          'button-border': '$button-primary-bg',
        },
      },
      {
        name: 'secondary',
        tokens: {
          'button-bg': '#6c757d',
          'button-text': '#ffffff',
          'button-border': '#6c757d',
        },
      },
    ],
    
    themeNamespace: 'button',
    layoutType: 'inline-flex',
    
    layoutGrid: {
      templateAreas: '"content"',
      templateColumns: 'auto',
      gap: '0',
    },
    
    layoutBreakpoints: {
      small: '320px',
      medium: '768px',
      large: '1024px',
    },
    
    layoutSpacing: {
      padding: '8px 16px',
      margin: '0',
      gap: '0',
    },
    
    styleEngineType: 'css-in-js',
    styleEngineConfig: {
      runtime: 'emotion',
      optimizeAtBuild: true,
      extractCss: true,
    },
    
    styleEngineOptimization: {
      deadCodeElimination: true,
      cssMinification: true,
      cssVendorPrefixes: true,
    },
    
    runtimeFramework: 'react',
    runtimeVersion: '18.0.0',
    runtimePolyfills: ['Promise', 'Array.from'],
    
    runtimeBrowserSupport: {
      chrome: '90+',
      firefox: '88+',
      safari: '14+',
      edge: '90+',
    },
    
    runtimeFeatures: {
      hooks: true,
      context: true,
      suspense: false,
      concurrent: false,
    },
    
    runtimePerformance: {
      bundleSize: 'small',
      renderCost: 'low',
      memoryCost: 'low',
    },
    
    compatibilityMinSchemaVersion: '1.0.0',
    compatibilityBreakingChanges: [],
    compatibilityMigrationGuide: 'No breaking changes in this version.',
    
    metadata: {
      category: 'Form Controls',
      maturity: 'stable',
      accessibility: 'WCAG-AA',
    },
  },

  inputContract: {
    name: 'InputContract',
    version: '1.0.0',
    schemaVersion: '1.0.0',
    description: 'Contract defining the interface for input components',
    author: 'Form Team',
    keywords: ['input', 'form', 'text', 'validation'],
    
    schemaProps: {
      value: {
        type: 'string',
        description: 'Input value',
        required: false,
      },
      onChange: {
        type: 'function',
        description: 'Change event handler',
        signature: '(value: string) => void',
        required: true,
      },
      placeholder: {
        type: 'string',
        description: 'Placeholder text',
        required: false,
      },
      disabled: {
        type: 'boolean',
        description: 'Whether input is disabled',
        default: false,
        required: false,
      },
      type: {
        type: 'string',
        description: 'Input type',
        enum: ['text', 'email', 'password', 'number'],
        default: 'text',
        required: false,
      },
    },
    
    schemaEvents: {
      change: {
        type: 'ChangeEvent',
        description: 'Fired when input value changes',
        bubbles: true,
        cancelable: false,
      },
      focus: {
        type: 'FocusEvent',
        description: 'Fired when input receives focus',
        bubbles: false,
        cancelable: false,
      },
      blur: {
        type: 'FocusEvent',
        description: 'Fired when input loses focus',
        bubbles: false,
        cancelable: false,
      },
    },
    
    schemaMethods: {
      focus: {
        description: 'Programmatically focus the input',
        signature: '() => void',
        returns: 'void',
      },
      select: {
        description: 'Select all text in the input',
        signature: '() => void',
        returns: 'void',
      },
    },
    
    validationRequired: ['onChange'],
    validationOptional: ['value', 'placeholder', 'disabled', 'type'],
    validationRules: {
      type: {
        oneOf: ['text', 'email', 'password', 'number'],
      },
      placeholder: {
        maxLength: 100,
      },
    },
    
    themeTokens: [
      {
        name: 'input-border-color',
        type: 'color',
        default: '#ced4da',
        description: 'Input border color',
      },
      {
        name: 'input-focus-border-color',
        type: 'color',
        default: '#007bff',
        description: 'Input border color when focused',
      },
    ],
    
    themeVariants: [],
    themeNamespace: 'input',
    layoutType: 'block',
    
    styleEngineType: 'css-in-js',
    styleEngineConfig: {
      runtime: 'emotion',
    },
    
    runtimeFramework: 'react',
    runtimeVersion: '18.0.0',
    runtimePolyfills: [],
    runtimeBrowserSupport: {
      chrome: '90+',
      firefox: '88+',
      safari: '14+',
      edge: '90+',
    },
    
    compatibilityMinSchemaVersion: '1.0.0',
    compatibilityBreakingChanges: [],
    
    metadata: {
      category: 'Form Controls',
      accessibility: 'WCAG-AA',
    },
  },

  modalContract: {
    name: 'ModalContract',
    version: '2.0.0',
    schemaVersion: '1.0.0',
    description: 'Contract for modal dialog components',
    author: 'Overlay Team',
    keywords: ['modal', 'dialog', 'overlay', 'popup'],
    
    schemaProps: {
      isOpen: {
        type: 'boolean',
        description: 'Whether modal is open',
        required: true,
      },
      onClose: {
        type: 'function',
        description: 'Close event handler',
        signature: '() => void',
        required: true,
      },
      title: {
        type: 'string',
        description: 'Modal title',
        required: false,
      },
      children: {
        type: 'ReactNode',
        description: 'Modal content',
        required: false,
      },
    },
    
    schemaEvents: {
      close: {
        type: 'CustomEvent',
        description: 'Fired when modal is closed',
        bubbles: false,
        cancelable: true,
      },
      open: {
        type: 'CustomEvent',
        description: 'Fired when modal is opened',
        bubbles: false,
        cancelable: false,
      },
    },
    
    schemaMethods: {
      close: {
        description: 'Programmatically close the modal',
        signature: '() => void',
        returns: 'void',
      },
    },
    
    validationRequired: ['isOpen', 'onClose'],
    validationOptional: ['title', 'children'],
    validationRules: {},
    
    themeTokens: [
      {
        name: 'modal-overlay-bg',
        type: 'color',
        default: 'rgba(0, 0, 0, 0.5)',
        description: 'Modal overlay background',
      },
      {
        name: 'modal-content-bg',
        type: 'color',
        default: '#ffffff',
        description: 'Modal content background',
      },
    ],
    
    themeVariants: [],
    themeNamespace: 'modal',
    layoutType: 'fixed',
    
    styleEngineType: 'css-in-js',
    styleEngineConfig: {
      runtime: 'emotion',
      portal: true,
    },
    
    runtimeFramework: 'react',
    runtimeVersion: '18.0.0',
    runtimePolyfills: [],
    runtimeBrowserSupport: {
      chrome: '90+',
      firefox: '88+',
      safari: '14+',
      edge: '90+',
    },
    
    compatibilityMinSchemaVersion: '1.0.0',
    compatibilityBreakingChanges: ['Removed size prop', 'Changed onClose signature'],
    compatibilityMigrationGuide: 'See migration guide for v2.0.0 changes.',
    
    metadata: {
      category: 'Overlays',
      accessibility: 'WCAG-AA',
      portal: true,
    },
  },
};

/**
 * Contract creation fixtures for API testing
 */
export const contractCreateFixtures: Record<string, ContractCreateFixture> = {
  validButton: {
    name: 'NewButtonContract',
    version: '1.0.0',
    schemaVersion: '1.0.0',
    description: 'A new button contract',
    author: 'Test Author',
    keywords: ['button', 'new'],
    schemaProps: {
      onClick: { type: 'function', required: true },
    },
    schemaEvents: {
      click: { type: 'MouseEvent' },
    },
    schemaMethods: {
      focus: { signature: '() => void' },
    },
    validationRequired: ['onClick'],
    validationOptional: [],
    validationRules: {},
    themeTokens: [],
    themeVariants: [],
    themeNamespace: 'new-button',
    layoutType: 'inline',
    styleEngineType: 'css-in-js',
    styleEngineConfig: {},
    runtimeFramework: 'react',
    runtimeVersion: '18.0.0',
    runtimePolyfills: [],
    runtimeBrowserSupport: {},
    compatibilityMinSchemaVersion: '1.0.0',
    compatibilityBreakingChanges: [],
  },

  duplicateName: {
    name: 'ButtonContract', // Already exists
    version: '2.0.0',
    schemaVersion: '1.0.0',
    description: 'Duplicate contract name',
    author: 'Test Author',
    keywords: ['duplicate'],
    schemaProps: {},
    schemaEvents: {},
    schemaMethods: {},
    validationRequired: [],
    validationOptional: [],
    validationRules: {},
    themeTokens: [],
    themeVariants: [],
    themeNamespace: 'duplicate',
    layoutType: 'block',
    styleEngineType: 'css-in-js',
    styleEngineConfig: {},
    runtimeFramework: 'react',
    runtimeVersion: '18.0.0',
    runtimePolyfills: [],
    runtimeBrowserSupport: {},
    compatibilityMinSchemaVersion: '1.0.0',
    compatibilityBreakingChanges: [],
  },

  invalidVersion: {
    name: 'InvalidVersionContract',
    version: 'not-semver',
    schemaVersion: '1.0.0',
    description: 'Contract with invalid version',
    author: 'Test Author',
    keywords: ['invalid'],
    schemaProps: {},
    schemaEvents: {},
    schemaMethods: {},
    validationRequired: [],
    validationOptional: [],
    validationRules: {},
    themeTokens: [],
    themeVariants: [],
    themeNamespace: 'invalid',
    layoutType: 'block',
    styleEngineType: 'css-in-js',
    styleEngineConfig: {},
    runtimeFramework: 'react',
    runtimeVersion: '18.0.0',
    runtimePolyfills: [],
    runtimeBrowserSupport: {},
    compatibilityMinSchemaVersion: '1.0.0',
    compatibilityBreakingChanges: [],
  },
};

/**
 * Factory functions for generating dynamic contract test data
 */
export class ContractFixtureFactory {
  /**
   * Generate a random valid contract
   */
  static generateContract(overrides: Partial<ContractFixture> = {}): ContractFixture {
    const contractName = faker.lorem.word().charAt(0).toUpperCase() + faker.lorem.word().slice(1);
    
    return {
      name: `${contractName}Contract`,
      version: ContractFixtureFactory.generateVersion(),
      schemaVersion: '1.0.0',
      description: faker.lorem.sentence(),
      author: faker.person.fullName(),
      keywords: faker.lorem.words(3).split(' '),
      schemaProps: ContractFixtureFactory.generateSchemaProps(),
      schemaEvents: ContractFixtureFactory.generateSchemaEvents(),
      schemaMethods: ContractFixtureFactory.generateSchemaMethods(),
      validationRequired: [],
      validationOptional: [],
      validationRules: {},
      themeTokens: [],
      themeVariants: [],
      themeNamespace: contractName.toLowerCase(),
      layoutType: faker.helpers.arrayElement(['block', 'inline', 'flex', 'grid']),
      styleEngineType: 'css-in-js',
      styleEngineConfig: {},
      runtimeFramework: 'react',
      runtimeVersion: '18.0.0',
      runtimePolyfills: [],
      runtimeBrowserSupport: {
        chrome: '90+',
        firefox: '88+',
        safari: '14+',
        edge: '90+',
      },
      compatibilityMinSchemaVersion: '1.0.0',
      compatibilityBreakingChanges: [],
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
   * Generate schema properties
   */
  static generateSchemaProps(): Record<string, any> {
    const props: Record<string, any> = {};
    const propCount = faker.number.int({ min: 1, max: 5 });
    
    for (let i = 0; i < propCount; i++) {
      const propName = faker.lorem.word();
      props[propName] = {
        type: faker.helpers.arrayElement(['string', 'number', 'boolean', 'function', 'object']),
        description: faker.lorem.sentence(),
        required: faker.datatype.boolean(),
      };
    }
    
    return props;
  }

  /**
   * Generate schema events
   */
  static generateSchemaEvents(): Record<string, any> {
    const events: Record<string, any> = {};
    const eventCount = faker.number.int({ min: 0, max: 3 });
    
    for (let i = 0; i < eventCount; i++) {
      const eventName = faker.lorem.word();
      events[eventName] = {
        type: faker.helpers.arrayElement(['MouseEvent', 'KeyboardEvent', 'FocusEvent', 'CustomEvent']),
        description: faker.lorem.sentence(),
        bubbles: faker.datatype.boolean(),
        cancelable: faker.datatype.boolean(),
      };
    }
    
    return events;
  }

  /**
   * Generate schema methods
   */
  static generateSchemaMethods(): Record<string, any> {
    const methods: Record<string, any> = {};
    const methodCount = faker.number.int({ min: 0, max: 3 });
    
    for (let i = 0; i < methodCount; i++) {
      const methodName = faker.lorem.word();
      methods[methodName] = {
        description: faker.lorem.sentence(),
        signature: '() => void',
        returns: 'void',
      };
    }
    
    return methods;
  }

  /**
   * Generate multiple contracts
   */
  static generateContracts(count: number, baseOverrides: Partial<ContractFixture> = {}): ContractFixture[] {
    return Array.from({ length: count }, (_, index) => 
      ContractFixtureFactory.generateContract({
        ...baseOverrides,
        name: `TestContract${index + 1}`,
      })
    );
  }

  /**
   * Generate contracts for different frameworks
   */
  static generateContractsForFrameworks(): ContractFixture[] {
    const frameworks = ['react', 'vue', 'angular', 'svelte'];
    
    return frameworks.map((framework, index) => 
      ContractFixtureFactory.generateContract({
        runtimeFramework: framework,
        name: `${framework.charAt(0).toUpperCase() + framework.slice(1)}Contract${index + 1}`,
      })
    );
  }

  /**
   * Generate contracts with different style engines
   */
  static generateContractsWithStyleEngines(): ContractFixture[] {
    const styleEngines = ['css-in-js', 'css-modules', 'styled-components', 'emotion'];
    
    return styleEngines.map((engine, index) => 
      ContractFixtureFactory.generateContract({
        styleEngineType: engine,
        name: `${engine.replace('-', '')}Contract${index + 1}`,
      })
    );
  }
}