/**
 * Contract API routes
 * Handles CRUD operations for contracts
 */

import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import type { ContractRepository } from '../../database/repositories';
import { RepositoryFactory } from '../../database/repositories';
import { errors } from '../middleware/errorHandler';
import { requireRole, UserRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Validation schemas
const createContractSchema = z.object({
  name: z.string().min(1).max(255),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be valid semantic version'),
  schemaVersion: z.string().min(1),
  description: z.string(),
  author: z.string(),
  keywords: z.array(z.string()),
  
  // Schema definition
  schemaProps: z.record(z.unknown()),
  schemaEvents: z.record(z.unknown()),
  schemaMethods: z.record(z.unknown()),
  
  // Validation rules
  validationRequired: z.array(z.string()),
  validationOptional: z.array(z.string()),
  validationRules: z.record(z.unknown()),
  
  // Theme configuration
  themeTokens: z.array(z.record(z.unknown())),
  themeVariants: z.array(z.record(z.unknown())),
  themeNamespace: z.string(),
  
  // Layout system
  layoutType: z.string(),
  layoutGrid: z.record(z.unknown()).optional(),
  layoutBreakpoints: z.record(z.unknown()).optional(),
  layoutSpacing: z.record(z.unknown()).optional(),
  layoutContainerQuery: z.record(z.unknown()).optional(),
  
  // Style engine
  styleEngineType: z.string(),
  styleEngineConfig: z.record(z.unknown()),
  styleEngineOptimization: z.record(z.unknown()).optional(),
  
  // Runtime requirements
  runtimeFramework: z.string(),
  runtimeVersion: z.string(),
  runtimePolyfills: z.array(z.string()),
  runtimeBrowserSupport: z.record(z.unknown()),
  runtimeFeatures: z.record(z.unknown()).optional(),
  runtimePerformance: z.record(z.unknown()).optional(),
  
  // Compatibility
  compatibilityMinSchemaVersion: z.string(),
  compatibilityBreakingChanges: z.array(z.string()),
  compatibilityMigrationGuide: z.string().optional(),
  
  // Metadata
  metadata: z.record(z.unknown()).optional(),
});

const updateContractSchema = z.object({
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  
  // Schema definition updates
  schemaProps: z.record(z.unknown()).optional(),
  schemaEvents: z.record(z.unknown()).optional(),
  schemaMethods: z.record(z.unknown()).optional(),
  
  // Validation rules updates
  validationRequired: z.array(z.string()).optional(),
  validationOptional: z.array(z.string()).optional(),
  validationRules: z.record(z.unknown()).optional(),
  
  // Theme configuration updates
  themeTokens: z.array(z.record(z.unknown())).optional(),
  themeVariants: z.array(z.record(z.unknown())).optional(),
  
  // Layout system updates
  layoutGrid: z.record(z.unknown()).optional(),
  layoutBreakpoints: z.record(z.unknown()).optional(),
  layoutSpacing: z.record(z.unknown()).optional(),
  layoutContainerQuery: z.record(z.unknown()).optional(),
  
  // Style engine updates
  styleEngineConfig: z.record(z.unknown()).optional(),
  styleEngineOptimization: z.record(z.unknown()).optional(),
  
  // Runtime updates
  runtimePolyfills: z.array(z.string()).optional(),
  runtimeBrowserSupport: z.record(z.unknown()).optional(),
  runtimeFeatures: z.record(z.unknown()).optional(),
  runtimePerformance: z.record(z.unknown()).optional(),
  
  // Compatibility updates
  compatibilityBreakingChanges: z.array(z.string()).optional(),
  compatibilityMigrationGuide: z.string().optional(),
  
  // Metadata
  metadata: z.record(z.unknown()).optional(),
});

const listContractsQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  schemaVersion: z.string().optional(),
  runtimeFramework: z.string().optional(),
  styleEngineType: z.string().optional(),
  search: z.string().optional(),
});

const contractParamsSchema = z.object({
  id: z.string().min(1),
});

// Get contract repository
const getContractRepo = (): ContractRepository => {
  return RepositoryFactory.getContractRepository();
};

// Route handlers
const listContracts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      limit = 20, 
      offset = 0, 
      schemaVersion, 
      runtimeFramework,
      styleEngineType,
      search 
    }: {
      limit?: number;
      offset?: number;
      schemaVersion?: string;
      runtimeFramework?: string;
      styleEngineType?: string;
      search?: string;
    } = req.query;

    const repo = getContractRepo();
    let contracts;

    if (schemaVersion) {
      contracts = await repo.findBySchemaVersion(schemaVersion);
    } else {
      contracts = await repo.findAll();
    }

    // Apply additional filters
    if (runtimeFramework) {
      contracts = contracts.filter(contract => 
        contract.runtimeFramework.toLowerCase().includes(runtimeFramework.toLowerCase())
      );
    }

    if (styleEngineType) {
      contracts = contracts.filter(contract => 
        contract.styleEngineType.toLowerCase().includes(styleEngineType.toLowerCase())
      );
    }

    if (search) {
      contracts = contracts.filter(contract =>
        contract.name.toLowerCase().includes(search.toLowerCase()) ||
        contract.description.toLowerCase().includes(search.toLowerCase()) ||
        contract.author.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply pagination
    const total = contracts.length;
    const paginatedContracts = contracts.slice(offset, offset + limit);

    res.json({
      data: paginatedContracts,
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

const getContract = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id }: { id: string } = req.params;
    
    if (!id) {
      throw errors.badRequest('Contract ID is required');
    }
    
    const repo = getContractRepo();

    // Try to parse as name:version format
    const [name, version] = id.includes(':') ? id.split(':') : [null, null];
    
    let contract;
    if (name && version) {
      contract = await repo.findByNameAndVersion(name, version);
    } else {
      // Assume it's an ID - need to implement findById in repository
      contract = await repo.findAll().then(contracts => 
        contracts.find(c => c.id === id)
      );
    }

    if (!contract) {
      throw errors.notFound('Contract not found');
    }

    res.json({ data: contract });
  } catch (error) {
    next(error);
  }
};

const createContract = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = getContractRepo();
    const body = req.body as typeof createContractSchema._type;
    
    // Check if contract already exists
    const existing = await repo.findByNameAndVersion(body.name, body.version);
    if (existing) {
      throw errors.conflict(`Contract ${body.name}@${body.version} already exists`);
    }

    const contract = await repo.create(body as Parameters<typeof repo.create>[0]);
    
    res.status(201).json({ data: contract });
  } catch (error) {
    next(error);
  }
};

const updateContract = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id }: { id: string } = req.params;
    
    if (!id) {
      throw errors.badRequest('Contract ID is required');
    }
    
    const repo = getContractRepo();

    // Check if contract exists
    const existing = await repo.findAll().then(contracts => 
      contracts.find(c => c.id === id)
    );
    if (!existing) {
      throw errors.notFound('Contract not found');
    }

    // For now, since we don't have update method in repository, 
    // we'll throw an error indicating it's not yet implemented
    throw errors.badRequest('Contract updates not yet implemented in repository layer');
  } catch (error) {
    next(error);
  }
};

const deleteContract = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id }: { id: string } = req.params;
    
    if (!id) {
      throw errors.badRequest('Contract ID is required');
    }
    
    // Check if contract exists
    const repo = getContractRepo();
    const existing = await repo.findAll().then(contracts => 
      contracts.find(c => c.id === id)
    );
    if (!existing) {
      throw errors.notFound('Contract not found');
    }

    // For now, since we don't have delete method in repository, 
    // we'll throw an error indicating it's not yet implemented
    throw errors.badRequest('Contract deletion not yet implemented in repository layer');
  } catch (error) {
    next(error);
  }
};

const getContractCompatibility = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id }: { id: string } = req.params;
    const { targetVersion }: { targetVersion?: string } = req.query;
    
    const repo = getContractRepo();
    const contract = await repo.findAll().then(contracts => 
      contracts.find(c => c.id === id)
    );
    
    if (!contract) {
      throw errors.notFound('Contract not found');
    }

    // Implement compatibility checking logic
    const compatibility = {
      contractId: contract.id,
      contractVersion: contract.version,
      minSchemaVersion: contract.compatibilityMinSchemaVersion,
      breakingChanges: contract.compatibilityBreakingChanges,
      migrationGuide: contract.compatibilityMigrationGuide,
      compatible: true, // Simplified for now
      targetVersion: targetVersion || 'latest',
    };

    res.json({ data: compatibility });
  } catch (error) {
    next(error);
  }
};

// Routes
router.get('/', validateRequest({ query: listContractsQuerySchema }), listContracts);
router.get('/:id', validateRequest({ params: contractParamsSchema }), getContract);
router.post('/', requireRole(UserRole.MAINTAINER, UserRole.OWNER), validateRequest({ body: createContractSchema }), createContract);
router.patch('/:id', requireRole(UserRole.MAINTAINER, UserRole.OWNER), validateRequest({ params: contractParamsSchema, body: updateContractSchema }), updateContract);
router.delete('/:id', requireRole(UserRole.OWNER), validateRequest({ params: contractParamsSchema }), deleteContract);
router.get('/:id/compatibility', validateRequest({ params: contractParamsSchema }), getContractCompatibility);

export const contractRoutes = router;