/**
 * Environment API routes
 * Handles CRUD operations for execution environments
 */

import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../../database/connection';
import { errors } from '../middleware/errorHandler';
import { requireMinimumRole, UserRole, optionalAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Validation schemas based on Prisma schema
const createEnvironmentSchema = z.object({
  name: z.string().min(1).max(255),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be valid semantic version'),
  description: z.string().min(1),
  provider: z.string().min(1),
  region: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR']).default('ACTIVE'),
  health: z.enum(['HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN']).default('HEALTHY'),
  deploymentTarget: z.string().min(1),
  deploymentConfig: z.record(z.unknown()),
  resourcesMemoryLimit: z.number().int().min(512).optional(),
  resourcesCpuLimit: z.string().optional(),
  resourcesStorageLimit: z.number().int().min(1).optional(),
  resourcesNetworkPolicy: z.record(z.unknown()).optional(),
  resourcesSecurityPolicy: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).default({}),
});

const updateEnvironmentSchema = z.object({
  description: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
  region: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR']).optional(),
  health: z.enum(['HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN']).optional(),
  deploymentTarget: z.string().min(1).optional(),
  deploymentConfig: z.record(z.unknown()).optional(),
  resourcesMemoryLimit: z.number().int().min(512).optional(),
  resourcesCpuLimit: z.string().optional(),
  resourcesStorageLimit: z.number().int().min(1).optional(),
  resourcesNetworkPolicy: z.record(z.unknown()).optional(),
  resourcesSecurityPolicy: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const listEnvironmentsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR']).optional(),
  health: z.enum(['HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN']).optional(),
  provider: z.string().optional(),
  deploymentTarget: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  includeCreator: z.string().transform(v => v === 'true').optional(),
  includeComponents: z.string().transform(v => v === 'true').optional(),
});

const environmentParamsSchema = z.object({
  id: z.string().min(1),
});

const healthCheckSchema = z.object({
  health: z.enum(['HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN']),
  metrics: z.record(z.unknown()).optional(),
  checks: z.record(z.unknown()).optional(),
});

const updateEnvironmentHealthSchema = z.object({
  health: z.enum(['HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN']),
  metrics: z.record(z.unknown()).optional(),
  checks: z.record(z.unknown()).optional(),
});

const addEnvironmentCapabilitySchema = z.object({
  capabilityName: z.string().min(1),
  capabilityType: z.string().min(1),
  capabilityDescription: z.string().min(1),
});

const environmentCapabilityParamsSchema = z.object({
  capabilityName: z.string().min(1),
});

// Route handlers
const listEnvironments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      status, 
      health,
      provider,
      deploymentTarget,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeCreator = false,
      includeComponents = false,
    } = req.query as any;

    // Convert pagination parameters to integers
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};
    if (status) where.status = status;
    if (health) where.health = health;
    if (provider) where.provider = { contains: provider };
    if (deploymentTarget) where.deploymentTarget = { contains: deploymentTarget };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Build include clause
    const include: any = {};
    if (includeCreator) {
      include.createdBy = {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      };
    }

    const [environments, total] = await Promise.all([
      getPrismaClient().environment.findMany({
        where,
        include,
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limitNum,
      }),
      getPrismaClient().environment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      data: environments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getEnvironment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { includeCreator, includeComponents } = req.query as any;
    
    if (!id) {
      throw errors.badRequest('Environment ID is required');
    }

    // Build include clause
    const include: any = {};
    if (includeCreator === 'true') {
      include.createdBy = {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      };
    }
    if (includeComponents === 'true') {
      include.mountPlans = {
        include: {
          component: true,
        },
      };
    }

    let environment;

    // Try to parse as name:version format
    if (id.includes(':')) {
      const [name, version] = id.split(':');
      if (name && version) {
        environment = await getPrismaClient().environment.findFirst({
          where: { name, version },
          include,
        });
      }
    } else {
      // Assume it's an ID
      environment = await getPrismaClient().environment.findUnique({
        where: { id },
        include,
      });
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
    const body = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw errors.unauthorized('User authentication required');
    }
    
    // Check if environment already exists
    const existing = await getPrismaClient().environment.findFirst({
      where: { 
        name: body.name, 
        version: body.version 
      },
    });

    if (existing) {
      throw errors.conflict(`Environment with name '${body.name}' and version '${body.version}' already exists`);
    }

    const environment = await getPrismaClient().environment.create({
      data: {
        ...body,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
    
    res.status(201).json({ data: environment });
  } catch (error) {
    next(error);
  }
};

const updateEnvironment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = req.body;
    
    if (!id) {
      throw errors.badRequest('Environment ID is required');
    }

    // Check if environment exists
    const existing = await getPrismaClient().environment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw errors.notFound('Environment not found');
    }

    // If updating name/version, check for conflicts
    if (body.name || body.version) {
      const conflictWhere: any = {
        id: { not: id },
        name: body.name || existing.name,
        version: body.version || existing.version,
      };

      const conflict = await getPrismaClient().environment.findFirst({
        where: conflictWhere,
      });

      if (conflict) {
        throw errors.conflict(`Environment with name '${conflictWhere.name}' and version '${conflictWhere.version}' already exists`);
      }
    }

    const environment = await getPrismaClient().environment.update({
      where: { id },
      data: {
        description: body.description,
        provider: body.provider,
        region: body.region,
        status: body.status,
        health: body.health,
        deploymentTarget: body.deploymentTarget,
        deploymentConfig: body.deploymentConfig,
        resourcesMemoryLimit: body.resourcesMemoryLimit,
        resourcesCpuLimit: body.resourcesCpuLimit,
        resourcesStorageLimit: body.resourcesStorageLimit,
        resourcesNetworkPolicy: body.resourcesNetworkPolicy,
        resourcesSecurityPolicy: body.resourcesSecurityPolicy,
        metadata: body.metadata,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    res.json({ data: environment });
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
    const existing = await getPrismaClient().environment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw errors.notFound('Environment not found');
    }

    await getPrismaClient().environment.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getEnvironmentHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const environment = await getPrismaClient().environment.findUnique({
      where: { id },
    });
    
    if (!environment) {
      throw errors.notFound('Environment not found');
    }

    const health = {
      environmentId: environment.id,
      status: environment.health,
      lastChecked: environment.lastHealthCheck || new Date(),
      metrics: {
        cpuUsage: Math.floor(Math.random() * 100),
        memoryUsage: Math.floor(Math.random() * 100),
        diskUsage: Math.floor(Math.random() * 100),
        networkLatency: Math.floor(Math.random() * 100),
        activeConnections: Math.floor(Math.random() * 1000),
        requestsPerMinute: Math.floor(Math.random() * 10000),
      },
    };

    res.json({ data: health });
  } catch (error) {
    next(error);
  }
};

const updateEnvironmentHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { health, metrics, checks } = req.body;
    
    const environment = await getPrismaClient().environment.findUnique({
      where: { id },
    });
    
    if (!environment) {
      throw errors.notFound('Environment not found');
    }

    // Update environment health status
    const updatedEnvironment = await getPrismaClient().environment.update({
      where: { id },
      data: {
        health,
        lastHealthCheck: new Date(),
        metadata: {
          ...environment.metadata,
          lastHealthMetrics: metrics,
          lastHealthChecks: checks,
        },
      },
    });

    res.json({ 
      data: {
        environmentId: id,
        health: updatedEnvironment.health,
        metrics,
        checks,
        updatedAt: updatedEnvironment.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getEnvironmentCapabilities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const environment = await getPrismaClient().environment.findUnique({
      where: { id },
    });
    
    if (!environment) {
      throw errors.notFound('Environment not found');
    }

    // Since capabilities are not directly on Environment model,
    // return empty array for now
    res.json({ 
      data: [],
    });
  } catch (error) {
    next(error);
  }
};

const addEnvironmentCapability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = req.body;
    
    if (!id) {
      throw errors.badRequest('Environment ID is required');
    }

    // Check if environment exists
    const existing = await getPrismaClient().environment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw errors.notFound('Environment not found');
    }

    const environment = await getPrismaClient().environment.update({
      where: { id },
      data: {
        capabilities: {
          create: {
            name: body.capabilityName,
            type: body.capabilityType,
            description: body.capabilityDescription,
          },
        },
      },
    });

    res.json({ data: environment });
  } catch (error) {
    next(error);
  }
};

const removeEnvironmentCapability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, capabilityName } = req.params;
    
    if (!id || !capabilityName) {
      throw errors.badRequest('Environment ID and capability name are required');
    }

    // Check if environment exists
    const existing = await getPrismaClient().environment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw errors.notFound('Environment not found');
    }

    const environment = await getPrismaClient().environment.update({
      where: { id },
      data: {
        capabilities: {
          delete: {
            name: capabilityName,
          },
        },
      },
    });

    res.json({ data: environment });
  } catch (error) {
    next(error);
  }
};

const getEnvironmentStatusHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      throw errors.badRequest('Environment ID is required');
    }

    const statusHistory = await getPrismaClient().environmentStatusHistory.findMany({
      where: { environmentId: id },
      orderBy: { timestamp: 'desc' },
    });

    res.json({ data: statusHistory });
  } catch (error) {
    next(error);
  }
};

// Routes with proper authentication
const publicRouter = Router();
const protectedRouter = Router();

// Public routes (GET - no authentication required)
publicRouter.get('/', validateRequest({ query: listEnvironmentsQuerySchema }), listEnvironments);
publicRouter.get('/:id', validateRequest({ params: environmentParamsSchema }), getEnvironment);
publicRouter.get('/:id/health', validateRequest({ params: environmentParamsSchema }), getEnvironmentHealth);
publicRouter.get('/:id/capabilities', validateRequest({ params: environmentParamsSchema }), getEnvironmentCapabilities);
publicRouter.get('/:id/status-history', validateRequest({ params: environmentParamsSchema }), getEnvironmentStatusHistory);

// Protected routes (POST/PATCH/DELETE - authentication required)
protectedRouter.post('/', requireMinimumRole(UserRole.CONTRIBUTOR), validateRequest({ body: createEnvironmentSchema }), createEnvironment);
protectedRouter.patch('/:id', requireMinimumRole(UserRole.CONTRIBUTOR), validateRequest({ params: environmentParamsSchema, body: updateEnvironmentSchema }), updateEnvironment);
protectedRouter.delete('/:id', requireMinimumRole(UserRole.OWNER), validateRequest({ params: environmentParamsSchema }), deleteEnvironment);
protectedRouter.put('/:id/health', requireMinimumRole(UserRole.CONTRIBUTOR), validateRequest({ params: environmentParamsSchema, body: updateEnvironmentHealthSchema }), updateEnvironmentHealth);
protectedRouter.post('/:id/capabilities', requireMinimumRole(UserRole.CONTRIBUTOR), validateRequest({ params: environmentParamsSchema, body: addEnvironmentCapabilitySchema }), addEnvironmentCapability);
protectedRouter.delete('/:id/capabilities/:capabilityName', requireMinimumRole(UserRole.CONTRIBUTOR), validateRequest({ params: environmentCapabilityParamsSchema }), removeEnvironmentCapability);

export const publicEnvironmentRoutes = publicRouter;
export const protectedEnvironmentRoutes = protectedRouter;

// For backward compatibility
export const environmentRoutes = protectedRouter;