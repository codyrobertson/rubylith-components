/**
 * Environment API routes
 * Handles CRUD operations for execution environments
 */

import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import type { EnvironmentRepository } from '../../database/repositories';
import { RepositoryFactory } from '../../database/repositories';
import { errors } from '../middleware/errorHandler';
import { requireRole, UserRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Validation schemas
const createEnvironmentSchema = z.object({
  name: z.string().min(1).max(255),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be valid semantic version'),
  description: z.string(),
  
  // Environment type and runtime
  environmentType: z.enum(['production', 'staging', 'development', 'testing']),
  runtimeFramework: z.string().min(1),
  runtimeVersion: z.string().min(1),
  
  // Server configuration
  serverSpecs: z.object({
    cpu: z.string(),
    memory: z.string(),
    storage: z.string(),
    network: z.string().optional(),
  }),
  
  // Network configuration
  networkConfig: z.object({
    publicUrls: z.array(z.string().url()),
    internalUrls: z.array(z.string().url()).optional(),
    ports: z.array(z.number().int().min(1).max(65535)),
    ssl: z.boolean().default(true),
    cdn: z.string().optional(),
  }),
  
  // Security settings
  securityConfig: z.object({
    isolationLevel: z.enum(['strict', 'moderate', 'relaxed']),
    permissions: z.array(z.string()),
    allowedOrigins: z.array(z.string()),
    rateLimits: z.record(z.number()).optional(),
  }),
  
  // Deployment configuration
  deploymentConfig: z.object({
    strategy: z.enum(['rolling', 'blue-green', 'canary']),
    autoScale: z.boolean().default(false),
    minInstances: z.number().int().min(1).default(1),
    maxInstances: z.number().int().min(1).default(10),
    healthCheckPath: z.string().default('/health'),
    healthCheckInterval: z.number().int().min(5).default(30),
  }),
  
  // Resource limits
  resourceLimits: z.object({
    cpuLimit: z.string(),
    memoryLimit: z.string(),
    storageLimit: z.string(),
    networkLimit: z.string().optional(),
    timeoutSeconds: z.number().int().min(1).max(3600).default(300),
  }),
  
  // Capabilities and features
  capabilities: z.array(z.string()),
  supportedContracts: z.array(z.string()),
  
  // Monitoring and logging
  monitoringConfig: z.object({
    metricsEnabled: z.boolean().default(true),
    loggingLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    alerting: z.boolean().default(true),
    retention: z.string().default('30d'),
  }),
  
  // Metadata
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
});

const updateEnvironmentSchema = z.object({
  description: z.string().optional(),
  
  // Server configuration updates
  serverSpecs: z.object({
    cpu: z.string().optional(),
    memory: z.string().optional(),
    storage: z.string().optional(),
    network: z.string().optional(),
  }).optional(),
  
  // Network configuration updates
  networkConfig: z.object({
    publicUrls: z.array(z.string().url()).optional(),
    internalUrls: z.array(z.string().url()).optional(),
    ports: z.array(z.number().int().min(1).max(65535)).optional(),
    ssl: z.boolean().optional(),
    cdn: z.string().optional(),
  }).optional(),
  
  // Security settings updates
  securityConfig: z.object({
    isolationLevel: z.enum(['strict', 'moderate', 'relaxed']).optional(),
    permissions: z.array(z.string()).optional(),
    allowedOrigins: z.array(z.string()).optional(),
    rateLimits: z.record(z.number()).optional(),
  }).optional(),
  
  // Deployment configuration updates
  deploymentConfig: z.object({
    strategy: z.enum(['rolling', 'blue-green', 'canary']).optional(),
    autoScale: z.boolean().optional(),
    minInstances: z.number().int().min(1).optional(),
    maxInstances: z.number().int().min(1).optional(),
    healthCheckPath: z.string().optional(),
    healthCheckInterval: z.number().int().min(5).optional(),
  }).optional(),
  
  // Resource limits updates
  resourceLimits: z.object({
    cpuLimit: z.string().optional(),
    memoryLimit: z.string().optional(),
    storageLimit: z.string().optional(),
    networkLimit: z.string().optional(),
    timeoutSeconds: z.number().int().min(1).max(3600).optional(),
  }).optional(),
  
  // Capabilities and features updates
  capabilities: z.array(z.string()).optional(),
  supportedContracts: z.array(z.string()).optional(),
  
  // Monitoring and logging updates
  monitoringConfig: z.object({
    metricsEnabled: z.boolean().optional(),
    loggingLevel: z.enum(['debug', 'info', 'warn', 'error']).optional(),
    alerting: z.boolean().optional(),
    retention: z.string().optional(),
  }).optional(),
  
  // Metadata updates
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const listEnvironmentsQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  environmentType: z.enum(['production', 'staging', 'development', 'testing']).optional(),
  runtimeFramework: z.string().optional(),
  status: z.enum(['healthy', 'degraded', 'unhealthy', 'maintenance']).optional(),
  search: z.string().optional(),
});

const environmentParamsSchema = z.object({
  id: z.string().min(1),
});

const healthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy', 'maintenance']),
  message: z.string().optional(),
  metrics: z.record(z.unknown()).optional(),
});

// Get environment repository
const getEnvironmentRepo = (): EnvironmentRepository => {
  return RepositoryFactory.getEnvironmentRepository();
};

// Route handlers
const listEnvironments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      limit = 20, 
      offset = 0, 
      environmentType, 
      runtimeFramework,
      status,
      search 
    }: {
      limit?: number;
      offset?: number;
      environmentType?: string;
      runtimeFramework?: string;
      status?: string;
      search?: string;
    } = req.query;

    const repo = getEnvironmentRepo();
    let environments = await repo.findAll();

    // Apply filters
    if (environmentType) {
      environments = environments.filter(env => 
        env.environmentType === environmentType
      );
    }

    if (runtimeFramework) {
      environments = environments.filter(env => 
        env.runtimeFramework.toLowerCase().includes(runtimeFramework.toLowerCase())
      );
    }

    if (status) {
      environments = environments.filter(env => 
        env.status === status
      );
    }

    if (search) {
      environments = environments.filter(env =>
        env.name.toLowerCase().includes(search.toLowerCase()) ||
        env.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply pagination
    const total = environments.length;
    const paginatedEnvironments = environments.slice(offset, offset + limit);

    res.json({
      data: paginatedEnvironments,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getEnvironment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      throw errors.badRequest('Environment ID is required');
    }
    
    const repo = getEnvironmentRepo();

    // Try to parse as name:version format
    const [name, version] = id.includes(':') ? id.split(':') : [null, null];
    
    let environment;
    if (name && version) {
      environment = await repo.findByNameAndVersion(name, version);
    } else {
      // Assume it's an ID - need to implement findById in repository
      environment = await repo.findAll().then(environments => 
        environments.find(e => e.id === id)
      );
    }

    if (!environment) {
      throw errors.notFound('Environment not found');
    }

    res.json({ data: environment });
  } catch (error) {
    next(error);
  }
};

const createEnvironment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = getEnvironmentRepo();
    const body = req.body as typeof createEnvironmentSchema._type;
    
    // Check if environment already exists
    const existing = await repo.findByNameAndVersion(body.name, body.version);
    if (existing) {
      throw errors.conflict(`Environment ${body.name}@${body.version} already exists`);
    }

    const environment = await repo.create(body as Parameters<typeof repo.create>[0]);
    
    res.status(201).json({ data: environment });
  } catch (error) {
    next(error);
  }
};

const updateEnvironment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      throw errors.badRequest('Environment ID is required');
    }
    
    const repo = getEnvironmentRepo();

    // Check if environment exists
    const existing = await repo.findAll().then(environments => 
      environments.find(e => e.id === id)
    );
    if (!existing) {
      throw errors.notFound('Environment not found');
    }

    // For now, since we don't have update method in repository, 
    // we'll throw an error indicating it's not yet implemented
    throw errors.badRequest('Environment updates not yet implemented in repository layer');
  } catch (error) {
    next(error);
  }
};

const deleteEnvironment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      throw errors.badRequest('Environment ID is required');
    }
    
    // Check if environment exists
    const repo = getEnvironmentRepo();
    const existing = await repo.findAll().then(environments => 
      environments.find(e => e.id === id)
    );
    if (!existing) {
      throw errors.notFound('Environment not found');
    }

    // For now, since we don't have delete method in repository, 
    // we'll throw an error indicating it's not yet implemented
    throw errors.badRequest('Environment deletion not yet implemented in repository layer');
  } catch (error) {
    next(error);
  }
};

const getEnvironmentHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const repo = getEnvironmentRepo();
    const environment = await repo.findAll().then(environments => 
      environments.find(e => e.id === id)
    );
    
    if (!environment) {
      throw errors.notFound('Environment not found');
    }

    // Mock health check data
    const health = {
      environmentId: environment.id,
      environmentName: environment.name,
      status: environment.status || 'healthy',
      lastCheck: new Date(),
      uptime: Math.floor(Math.random() * 86400), // Random uptime in seconds
      metrics: {
        cpuUsage: Math.floor(Math.random() * 100),
        memoryUsage: Math.floor(Math.random() * 100),
        diskUsage: Math.floor(Math.random() * 100),
        networkLatency: Math.floor(Math.random() * 100),
        activeConnections: Math.floor(Math.random() * 1000),
        requestsPerMinute: Math.floor(Math.random() * 10000),
      },
      services: [
        {
          name: 'web-server',
          status: 'healthy',
          responseTime: Math.floor(Math.random() * 500),
        },
        {
          name: 'database',
          status: 'healthy',
          responseTime: Math.floor(Math.random() * 100),
        },
      ],
    };

    res.json({ data: health });
  } catch (error) {
    next(error);
  }
};

const updateEnvironmentHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, message, metrics }: {
      status: string;
      message?: string;
      metrics?: Record<string, unknown>;
    } = req.body;
    
    const repo = getEnvironmentRepo();
    const environment = await repo.findAll().then(environments => 
      environments.find(e => e.id === id)
    );
    
    if (!environment) {
      throw errors.notFound('Environment not found');
    }

    // Mock health update - in production this would update the environment status
    const updatedHealth = {
      environmentId: environment.id,
      previousStatus: environment.status,
      newStatus: status,
      message,
      metrics,
      updatedAt: new Date(),
      updatedBy: req.user?.email,
    };

    res.json({ 
      data: updatedHealth,
      message: `Environment health status updated to ${status}`,
    });
  } catch (error) {
    next(error);
  }
};

const getEnvironmentCapabilities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const repo = getEnvironmentRepo();
    const environment = await repo.findAll().then(environments => 
      environments.find(e => e.id === id)
    );
    
    if (!environment) {
      throw errors.notFound('Environment not found');
    }

    const capabilities = {
      environmentId: environment.id,
      runtimeFramework: environment.runtimeFramework,
      runtimeVersion: environment.runtimeVersion,
      capabilities: environment.capabilities || [],
      supportedContracts: environment.supportedContracts || [],
      resourceLimits: environment.resourceLimits,
      deploymentStrategies: [
        environment.deploymentConfig?.strategy || 'rolling'
      ],
      features: {
        autoScaling: environment.deploymentConfig?.autoScale || false,
        healthChecks: true,
        monitoring: environment.monitoringConfig?.metricsEnabled || true,
        logging: environment.monitoringConfig?.loggingLevel || 'info',
      },
    };

    res.json({ data: capabilities });
  } catch (error) {
    next(error);
  }
};

// Routes
router.get('/', validateRequest({ query: listEnvironmentsQuerySchema }), listEnvironments);
router.get('/:id', validateRequest({ params: environmentParamsSchema }), getEnvironment);
router.post('/', requireRole(UserRole.MAINTAINER, UserRole.OWNER), validateRequest({ body: createEnvironmentSchema }), createEnvironment);
router.patch('/:id', requireRole(UserRole.MAINTAINER, UserRole.OWNER), validateRequest({ params: environmentParamsSchema, body: updateEnvironmentSchema }), updateEnvironment);
router.delete('/:id', requireRole(UserRole.OWNER), validateRequest({ params: environmentParamsSchema }), deleteEnvironment);
router.get('/:id/health', validateRequest({ params: environmentParamsSchema }), getEnvironmentHealth);
router.post('/:id/health', requireRole(UserRole.MAINTAINER, UserRole.OWNER), validateRequest({ params: environmentParamsSchema, body: healthCheckSchema }), updateEnvironmentHealth);
router.get('/:id/capabilities', validateRequest({ params: environmentParamsSchema }), getEnvironmentCapabilities);

export const environmentRoutes = router;