/**
 * Component API routes
 * Handles CRUD operations for components
 */

import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import type { ComponentRepository} from '../../database/repositories';
import { RepositoryFactory } from '../../database/repositories';
import { errors } from '../middleware/errorHandler';
import { requireRole, UserRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { ComponentType, ComponentLifecycle } from '../../../generated/prisma';

const router = Router();

// Validation schemas
const createComponentSchema = z.object({
  name: z.string().min(1).max(255),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  type: z.nativeEnum(ComponentType),
  lifecycle: z.nativeEnum(ComponentLifecycle),
  description: z.string(),
  author: z.string(),
  license: z.string(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  keywords: z.array(z.string()),
  contractId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateComponentSchema = z.object({
  lifecycle: z.nativeEnum(ComponentLifecycle).optional(),
  description: z.string().optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  keywords: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const listComponentsQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  type: z.nativeEnum(ComponentType).optional(),
  lifecycle: z.nativeEnum(ComponentLifecycle).optional(),
  search: z.string().optional(),
});

const componentParamsSchema = z.object({
  id: z.string().min(1),
});

// Get component repository
const getComponentRepo = (): ComponentRepository => {
  return RepositoryFactory.getComponentRepository();
};

// Route handlers
const listComponents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = 20, offset = 0, type, lifecycle, search } = req.query;
    const repo = getComponentRepo();

    let components;
    if (search) {
      components = await repo.search(search as string);
    } else {
      components = await repo.findAll({
        limit: Number(limit),
        offset: Number(offset),
        type: type as string,
        lifecycle: lifecycle as string,
      });
    }

    res.json({
      data: components,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: components.length, // TODO: Add total count query
      },
    });
  } catch (error) {
    next(error);
  }
};

const getComponent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      throw errors.badRequest('Component ID is required');
    }
    
    const repo = getComponentRepo();

    // Try to parse as name:version format
    const [name, version] = id.includes(':') ? id.split(':') : [null, null];
    
    let component;
    if (name && version) {
      component = await repo.findByNameAndVersion(name, version);
    } else {
      // Assume it's an ID
      component = await repo.findById(id);
    }

    if (!component) {
      throw errors.notFound('Component');
    }

    res.json({ data: component });
  } catch (error) {
    next(error);
  }
};

const createComponent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = getComponentRepo();
    const body = req.body as { name: string; version: string; [key: string]: unknown };
    
    // Check if component already exists
    const existing = await repo.findByNameAndVersion(body.name, body.version);
    if (existing) {
      throw errors.conflict(`Component ${body.name}@${body.version} already exists`);
    }

    // Create component with user relationship
    const componentData = {
      ...body,
      createdBy: {
        connect: { id: req.user?.id }
      }
    };

    const component = await repo.create(componentData as Parameters<typeof repo.create>[0]);
    
    res.status(201).json({ data: component });
  } catch (error) {
    next(error);
  }
};

const updateComponent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      throw errors.badRequest('Component ID is required');
    }
    
    const repo = getComponentRepo();

    const component = await repo.update(id, req.body as Parameters<typeof repo.update>[1]);
    
    res.json({ data: component });
  } catch (error) {
    next(error);
  }
};

const deleteComponent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      throw errors.badRequest('Component ID is required');
    }
    
    const repo = getComponentRepo();

    await repo.delete(id);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Routes
router.get('/', validateRequest({ query: listComponentsQuerySchema }), listComponents);
router.get('/:id', validateRequest({ params: componentParamsSchema }), getComponent);
router.post('/', requireRole(UserRole.CONTRIBUTOR, UserRole.MAINTAINER, UserRole.OWNER), validateRequest({ body: createComponentSchema }), createComponent);
router.patch('/:id', requireRole(UserRole.CONTRIBUTOR, UserRole.MAINTAINER, UserRole.OWNER), validateRequest({ params: componentParamsSchema, body: updateComponentSchema }), updateComponent);
router.delete('/:id', requireRole(UserRole.MAINTAINER, UserRole.OWNER), validateRequest({ params: componentParamsSchema }), deleteComponent);

export const componentRoutes = router;