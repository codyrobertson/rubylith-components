/**
 * Environment test fixtures
 * Predefined environment data for testing
 */

import { faker } from '@faker-js/faker';

export interface EnvironmentFixture {
  name: string;
  version: string;
  description: string;
  provider: string;
  region?: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'MAINTENANCE';
  health: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'MAINTENANCE';
  deploymentTarget: string;
  deploymentConfig: Record<string, any>;
  resourcesMemoryLimit?: number;
  resourcesCpuLimit?: string;
  resourcesStorageLimit?: number;
  resourcesNetworkPolicy?: Record<string, any>;
  resourcesSecurityPolicy?: Record<string, any>;
  metadata: Record<string, any>;
}

export interface EnvironmentCreateFixture {
  name: string;
  version: string;
  description: string;
  provider: string;
  region?: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'MAINTENANCE';
  health: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'MAINTENANCE';
  deploymentTarget: string;
  deploymentConfig: Record<string, any>;
  resourcesMemoryLimit?: number;
  resourcesCpuLimit?: string;
  resourcesStorageLimit?: number;
  resourcesNetworkPolicy?: Record<string, any>;
  resourcesSecurityPolicy?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface EnvironmentUpdateFixture {
  description?: string;
  provider?: string;
  region?: string;
  status?: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'MAINTENANCE';
  health?: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'MAINTENANCE';
  deploymentTarget?: string;
  deploymentConfig?: Record<string, any>;
  resourcesMemoryLimit?: number;
  resourcesCpuLimit?: string;
  resourcesStorageLimit?: number;
  metadata?: Record<string, any>;
}

/**
 * Predefined environment fixtures for consistent testing
 */
export const environmentFixtures: Record<string, EnvironmentFixture> = {
  production: {
    name: 'ProductionEnvironment',
    version: '1.0.0',
    description: 'Production environment for stable component deployment',
    provider: 'aws',
    region: 'us-east-1',
    status: 'HEALTHY',
    health: 'HEALTHY',
    deploymentTarget: 'production',
    deploymentConfig: {
      strategy: 'rolling',
      autoScale: true,
      minInstances: 3,
      maxInstances: 20,
      healthCheckPath: '/health',
      healthCheckInterval: 30,
      loadBalancer: {
        type: 'application',
        protocol: 'HTTPS',
        port: 443,
      },
      ssl: {
        enabled: true,
        certificate: 'arn:aws:acm:us-east-1:123456789:certificate/abcd-1234',
      },
    },
    resourcesMemoryLimit: 16384, // 16GB
    resourcesCpuLimit: '8 cores',
    resourcesStorageLimit: 500, // 500GB
    resourcesNetworkPolicy: {
      ingress: [
        {
          from: ['0.0.0.0/0'],
          ports: [80, 443],
        },
      ],
      egress: [
        {
          to: ['10.0.0.0/8'],
          ports: [3306, 5432],
        },
      ],
    },
    resourcesSecurityPolicy: {
      encryption: {
        atRest: true,
        inTransit: true,
      },
      access: {
        mfa: true,
        vpn: false,
      },
      monitoring: {
        logging: true,
        alerting: true,
      },
    },
    metadata: {
      environment: 'production',
      tier: 'critical',
      backup: true,
      monitoring: 'enhanced',
      compliance: ['SOC2', 'PCI-DSS'],
    },
  },

  staging: {
    name: 'StagingEnvironment',
    version: '1.0.0',
    description: 'Staging environment for pre-production testing',
    provider: 'aws',
    region: 'us-west-2',
    status: 'HEALTHY',
    health: 'HEALTHY',
    deploymentTarget: 'staging',
    deploymentConfig: {
      strategy: 'blue-green',
      autoScale: true,
      minInstances: 2,
      maxInstances: 8,
      healthCheckPath: '/health',
      healthCheckInterval: 60,
      loadBalancer: {
        type: 'application',
        protocol: 'HTTPS',
        port: 443,
      },
    },
    resourcesMemoryLimit: 8192, // 8GB
    resourcesCpuLimit: '4 cores',
    resourcesStorageLimit: 200, // 200GB
    resourcesNetworkPolicy: {
      ingress: [
        {
          from: ['10.0.0.0/8'],
          ports: [80, 443],
        },
      ],
    },
    resourcesSecurityPolicy: {
      encryption: {
        atRest: true,
        inTransit: true,
      },
      access: {
        mfa: false,
        vpn: true,
      },
    },
    metadata: {
      environment: 'staging',
      tier: 'standard',
      backup: false,
      monitoring: 'basic',
    },
  },

  development: {
    name: 'DevelopmentEnvironment',
    version: '1.0.0',
    description: 'Development environment for component development and testing',
    provider: 'aws',
    region: 'us-west-1',
    status: 'HEALTHY',
    health: 'HEALTHY',
    deploymentTarget: 'development',
    deploymentConfig: {
      strategy: 'recreate',
      autoScale: false,
      minInstances: 1,
      maxInstances: 3,
      healthCheckPath: '/health',
      healthCheckInterval: 120,
    },
    resourcesMemoryLimit: 4096, // 4GB
    resourcesCpuLimit: '2 cores',
    resourcesStorageLimit: 100, // 100GB
    resourcesNetworkPolicy: {
      ingress: [
        {
          from: ['192.168.0.0/16'],
          ports: [80, 443, 3000, 8080],
        },
      ],
    },
    resourcesSecurityPolicy: {
      encryption: {
        atRest: false,
        inTransit: false,
      },
      access: {
        mfa: false,
        vpn: false,
      },
    },
    metadata: {
      environment: 'development',
      tier: 'basic',
      backup: false,
      monitoring: 'minimal',
    },
  },

  testing: {
    name: 'TestingEnvironment',
    version: '1.0.0',
    description: 'Dedicated testing environment for automated test execution',
    provider: 'gcp',
    region: 'us-central1',
    status: 'HEALTHY',
    health: 'HEALTHY',
    deploymentTarget: 'testing',
    deploymentConfig: {
      strategy: 'recreate',
      autoScale: false,
      minInstances: 1,
      maxInstances: 2,
      healthCheckPath: '/health',
      healthCheckInterval: 30,
    },
    resourcesMemoryLimit: 2048, // 2GB
    resourcesCpuLimit: '1 core',
    resourcesStorageLimit: 50, // 50GB
    resourcesNetworkPolicy: {
      ingress: [
        {
          from: ['10.0.0.0/8'],
          ports: [80, 443],
        },
      ],
    },
    resourcesSecurityPolicy: {
      encryption: {
        atRest: false,
        inTransit: true,
      },
    },
    metadata: {
      environment: 'testing',
      tier: 'ephemeral',
      backup: false,
      monitoring: 'basic',
      testRunner: 'jest',
    },
  },

  maintenance: {
    name: 'MaintenanceEnvironment',
    version: '1.0.0',
    description: 'Environment currently under maintenance',
    provider: 'aws',
    region: 'eu-west-1',
    status: 'MAINTENANCE',
    health: 'MAINTENANCE',
    deploymentTarget: 'production',
    deploymentConfig: {
      strategy: 'rolling',
      autoScale: false,
      minInstances: 0,
      maxInstances: 0,
    },
    resourcesMemoryLimit: 8192,
    resourcesCpuLimit: '4 cores',
    resourcesStorageLimit: 200,
    metadata: {
      environment: 'production',
      maintenanceReason: 'Security patch deployment',
      maintenanceWindow: '2024-01-15T02:00:00Z - 2024-01-15T04:00:00Z',
    },
  },

  degraded: {
    name: 'DegradedEnvironment',
    version: '1.0.0',
    description: 'Environment experiencing performance issues',
    provider: 'azure',
    region: 'eastus',
    status: 'DEGRADED',
    health: 'DEGRADED',
    deploymentTarget: 'production',
    deploymentConfig: {
      strategy: 'rolling',
      autoScale: true,
      minInstances: 2,
      maxInstances: 10,
    },
    resourcesMemoryLimit: 8192,
    resourcesCpuLimit: '4 cores',
    resourcesStorageLimit: 300,
    metadata: {
      environment: 'production',
      issues: ['High CPU usage', 'Slow response times'],
      alertsActive: true,
    },
  },
};

/**
 * Environment creation fixtures for API testing
 */
export const environmentCreateFixtures: Record<string, EnvironmentCreateFixture> = {
  validProduction: {
    name: 'NewProductionEnv',
    version: '1.0.0',
    description: 'New production environment',
    provider: 'aws',
    region: 'us-east-1',
    status: 'HEALTHY',
    health: 'HEALTHY',
    deploymentTarget: 'production',
    deploymentConfig: {
      strategy: 'rolling',
      autoScale: true,
    },
    resourcesMemoryLimit: 8192,
    resourcesCpuLimit: '4 cores',
    resourcesStorageLimit: 200,
    metadata: {},
  },

  validStaging: {
    name: 'NewStagingEnv',
    version: '1.0.0',
    description: 'New staging environment',
    provider: 'gcp',
    region: 'us-central1',
    status: 'HEALTHY',
    health: 'HEALTHY',
    deploymentTarget: 'staging',
    deploymentConfig: {
      strategy: 'blue-green',
    },
    metadata: {},
  },

  duplicateName: {
    name: 'ProductionEnvironment', // Already exists
    version: '2.0.0',
    description: 'Duplicate environment name',
    provider: 'aws',
    status: 'HEALTHY',
    health: 'HEALTHY',
    deploymentTarget: 'production',
    deploymentConfig: {},
    metadata: {},
  },

  invalidVersion: {
    name: 'InvalidVersionEnv',
    version: 'not-semver',
    description: 'Environment with invalid version',
    provider: 'aws',
    status: 'HEALTHY',
    health: 'HEALTHY',
    deploymentTarget: 'production',
    deploymentConfig: {},
    metadata: {},
  },

  invalidStatus: {
    name: 'InvalidStatusEnv',
    version: '1.0.0',
    description: 'Environment with invalid status',
    provider: 'aws',
    status: 'INVALID_STATUS' as any,
    health: 'HEALTHY',
    deploymentTarget: 'production',
    deploymentConfig: {},
    metadata: {},
  },

  missingProvider: {
    name: 'MissingProviderEnv',
    version: '1.0.0',
    description: 'Environment missing provider',
    provider: '',
    status: 'HEALTHY',
    health: 'HEALTHY',
    deploymentTarget: 'production',
    deploymentConfig: {},
    metadata: {},
  },
};

/**
 * Environment update fixtures for modification testing
 */
export const environmentUpdateFixtures: Record<string, EnvironmentUpdateFixture> = {
  validUpdate: {
    description: 'Updated environment description',
    status: 'HEALTHY',
  },

  statusUpdate: {
    status: 'MAINTENANCE',
    health: 'MAINTENANCE',
  },

  resourceUpdate: {
    resourcesMemoryLimit: 16384,
    resourcesCpuLimit: '8 cores',
    resourcesStorageLimit: 500,
  },

  configUpdate: {
    deploymentConfig: {
      strategy: 'canary',
      autoScale: true,
      minInstances: 5,
      maxInstances: 25,
    },
  },

  fullUpdate: {
    description: 'Completely updated environment',
    provider: 'azure',
    region: 'westus2',
    status: 'HEALTHY',
    deploymentTarget: 'staging',
    resourcesMemoryLimit: 12288,
    metadata: {
      updated: true,
      version: '2.0.0',
    },
  },

  emptyUpdate: {},

  invalidStatus: {
    status: 'INVALID_STATUS' as any,
  },
};

/**
 * Environment health check fixtures
 */
export const environmentHealthFixtures = {
  healthy: {
    status: 'HEALTHY',
    health: 'HEALTHY',
    message: 'All systems operational',
    metrics: {
      cpuUsage: 45,
      memoryUsage: 60,
      diskUsage: 30,
      networkLatency: 25,
      activeConnections: 150,
      requestsPerMinute: 1200,
    },
  },

  degraded: {
    status: 'DEGRADED',
    health: 'DEGRADED',
    message: 'Performance issues detected',
    metrics: {
      cpuUsage: 85,
      memoryUsage: 90,
      diskUsage: 75,
      networkLatency: 150,
      activeConnections: 500,
      requestsPerMinute: 800,
    },
  },

  unhealthy: {
    status: 'UNHEALTHY',
    health: 'UNHEALTHY',
    message: 'Critical issues detected',
    metrics: {
      cpuUsage: 98,
      memoryUsage: 99,
      diskUsage: 95,
      networkLatency: 500,
      activeConnections: 1000,
      requestsPerMinute: 200,
    },
  },

  maintenance: {
    status: 'MAINTENANCE',
    health: 'MAINTENANCE',
    message: 'Scheduled maintenance in progress',
    metrics: {},
  },
};

/**
 * Factory functions for generating dynamic environment test data
 */
export class EnvironmentFixtureFactory {
  /**
   * Generate a random valid environment
   */
  static generateEnvironment(overrides: Partial<EnvironmentFixture> = {}): EnvironmentFixture {
    const envName = faker.lorem.word().charAt(0).toUpperCase() + faker.lorem.word().slice(1);
    
    return {
      name: `${envName}Environment`,
      version: EnvironmentFixtureFactory.generateVersion(),
      description: faker.lorem.sentence(),
      provider: faker.helpers.arrayElement(['aws', 'gcp', 'azure', 'digital-ocean']),
      region: faker.helpers.arrayElement(['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1']),
      status: 'HEALTHY',
      health: 'HEALTHY',
      deploymentTarget: faker.helpers.arrayElement(['production', 'staging', 'development', 'testing']),
      deploymentConfig: EnvironmentFixtureFactory.generateDeploymentConfig(),
      resourcesMemoryLimit: faker.number.int({ min: 1024, max: 32768 }),
      resourcesCpuLimit: `${faker.number.int({ min: 1, max: 16 })} cores`,
      resourcesStorageLimit: faker.number.int({ min: 50, max: 1000 }),
      resourcesNetworkPolicy: EnvironmentFixtureFactory.generateNetworkPolicy(),
      resourcesSecurityPolicy: EnvironmentFixtureFactory.generateSecurityPolicy(),
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
   * Generate deployment configuration
   */
  static generateDeploymentConfig(): Record<string, any> {
    return {
      strategy: faker.helpers.arrayElement(['rolling', 'blue-green', 'canary', 'recreate']),
      autoScale: faker.datatype.boolean(),
      minInstances: faker.number.int({ min: 1, max: 5 }),
      maxInstances: faker.number.int({ min: 5, max: 50 }),
      healthCheckPath: '/health',
      healthCheckInterval: faker.number.int({ min: 30, max: 300 }),
    };
  }

  /**
   * Generate network policy
   */
  static generateNetworkPolicy(): Record<string, any> {
    return {
      ingress: [
        {
          from: ['0.0.0.0/0'],
          ports: [80, 443],
        },
      ],
      egress: [
        {
          to: ['10.0.0.0/8'],
          ports: [3306, 5432, 6379],
        },
      ],
    };
  }

  /**
   * Generate security policy
   */
  static generateSecurityPolicy(): Record<string, any> {
    return {
      encryption: {
        atRest: faker.datatype.boolean(),
        inTransit: faker.datatype.boolean(),
      },
      access: {
        mfa: faker.datatype.boolean(),
        vpn: faker.datatype.boolean(),
      },
      monitoring: {
        logging: faker.datatype.boolean(),
        alerting: faker.datatype.boolean(),
      },
    };
  }

  /**
   * Generate multiple environments
   */
  static generateEnvironments(count: number, baseOverrides: Partial<EnvironmentFixture> = {}): EnvironmentFixture[] {
    return Array.from({ length: count }, (_, index) => 
      EnvironmentFixtureFactory.generateEnvironment({
        ...baseOverrides,
        name: `TestEnvironment${index + 1}`,
      })
    );
  }

  /**
   * Generate environments with different providers
   */
  static generateEnvironmentsWithProviders(): EnvironmentFixture[] {
    const providers = ['aws', 'gcp', 'azure', 'digital-ocean'];
    
    return providers.map((provider, index) => 
      EnvironmentFixtureFactory.generateEnvironment({
        provider,
        name: `${provider.toUpperCase()}Environment${index + 1}`,
      })
    );
  }

  /**
   * Generate environments with different statuses
   */
  static generateEnvironmentsWithStatuses(): EnvironmentFixture[] {
    const statuses: EnvironmentFixture['status'][] = ['HEALTHY', 'DEGRADED', 'UNHEALTHY', 'MAINTENANCE'];
    
    return statuses.map((status, index) => 
      EnvironmentFixtureFactory.generateEnvironment({
        status,
        health: status,
        name: `${status.toLowerCase()}Environment${index + 1}`,
      })
    );
  }

  /**
   * Generate environments for different deployment targets
   */
  static generateEnvironmentsWithTargets(): EnvironmentFixture[] {
    const targets = ['production', 'staging', 'development', 'testing'];
    
    return targets.map((target, index) => 
      EnvironmentFixtureFactory.generateEnvironment({
        deploymentTarget: target,
        name: `${target.charAt(0).toUpperCase() + target.slice(1)}Environment${index + 1}`,
      })
    );
  }

  /**
   * Generate edge case environments
   */
  static generateEdgeCaseEnvironments(): EnvironmentFixture[] {
    return [
      // Minimal resources
      EnvironmentFixtureFactory.generateEnvironment({
        name: 'MinimalEnvironment',
        resourcesMemoryLimit: 512,
        resourcesCpuLimit: '0.5 cores',
        resourcesStorageLimit: 10,
      }),
      
      // Maximum resources
      EnvironmentFixtureFactory.generateEnvironment({
        name: 'MaximalEnvironment',
        resourcesMemoryLimit: 131072, // 128GB
        resourcesCpuLimit: '64 cores',
        resourcesStorageLimit: 10000, // 10TB
      }),
      
      // Complex deployment config
      EnvironmentFixtureFactory.generateEnvironment({
        name: 'ComplexEnvironment',
        deploymentConfig: {
          strategy: 'canary',
          autoScale: true,
          minInstances: 10,
          maxInstances: 100,
          healthCheckPath: '/api/health/detailed',
          healthCheckInterval: 15,
          canaryConfig: {
            percentage: 5,
            duration: 1800,
            successThreshold: 99.9,
          },
          loadBalancer: {
            type: 'network',
            protocol: 'TCP',
            port: 443,
            sslTermination: true,
          },
        },
      }),
    ];
  }
}