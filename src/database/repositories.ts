/**
 * Repository pattern implementations for database access
 * Provides type-safe CRUD operations with error handling
 */

import type { PrismaClient } from '../../generated/prisma';
import { getPrismaClient } from './connection';
import type {
  Component,
  Contract,
  Environment,
  Capability,
  MountPlan,
  Prisma,
} from '../../generated/prisma';

// =============================================================================
// Base Repository
// =============================================================================

abstract class BaseRepository {
  protected client: PrismaClient | null = null;

  protected async getClient(): Promise<PrismaClient> {
    if (!this.client) {
      this.client = await getPrismaClient();
    }
    return this.client;
  }

  protected handleError(error: unknown, operation: string): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Database ${operation} failed: ${message}`);
  }
}

// =============================================================================
// Component Repository
// =============================================================================

export class ComponentRepository extends BaseRepository {
  async findAll(options?: {
    limit?: number;
    offset?: number;
    type?: string;
    lifecycle?: string;
  }): Promise<Component[]> {
    try {
      const client = await this.getClient();

      const where: Prisma.ComponentWhereInput = {};
      if (options?.type) {
        where.type = options.type as Prisma.EnumComponentTypeFilter<'Component'>;
      }
      if (options?.lifecycle) {
        where.lifecycle = options.lifecycle as Prisma.EnumComponentLifecycleFilter<'Component'>;
      }

      return await client.component.findMany({
        where,
        ...(options?.limit !== undefined && { take: options.limit }),
        ...(options?.offset !== undefined && { skip: options.offset }),
        include: {
          contract: true,
          dependencies: true,
          provides: true,
          requires: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.handleError(error, 'component findAll');
    }
  }

  async findByNameAndVersion(name: string, version: string): Promise<Component | null> {
    try {
      const client = await this.getClient();

      return await client.component.findUnique({
        where: { name_version: { name, version } },
        include: {
          contract: true,
          dependencies: true,
          provides: true,
          requires: true,
        },
      });
    } catch (error) {
      this.handleError(error, 'component findByNameAndVersion');
    }
  }

  async create(data: Prisma.ComponentCreateInput): Promise<Component> {
    try {
      const client = await this.getClient();

      return await client.component.create({
        data,
        include: {
          contract: true,
          dependencies: true,
          provides: true,
          requires: true,
        },
      });
    } catch (error) {
      this.handleError(error, 'component create');
    }
  }

  async update(id: string, data: Prisma.ComponentUpdateInput): Promise<Component> {
    try {
      const client = await this.getClient();

      return await client.component.update({
        where: { id },
        data,
        include: {
          contract: true,
          dependencies: true,
          provides: true,
          requires: true,
        },
      });
    } catch (error) {
      this.handleError(error, 'component update');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const client = await this.getClient();
      await client.component.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'component delete');
    }
  }

  async search(query: string): Promise<Component[]> {
    try {
      const client = await this.getClient();

      return await client.component.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
            { author: { contains: query } },
          ],
        },
        include: {
          contract: true,
          dependencies: true,
          provides: true,
          requires: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.handleError(error, 'component search');
    }
  }
}

// =============================================================================
// Contract Repository
// =============================================================================

export class ContractRepository extends BaseRepository {
  async findAll(): Promise<Contract[]> {
    try {
      const client = await this.getClient();

      return await client.contract.findMany({
        include: {
          components: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.handleError(error, 'contract findAll');
    }
  }

  async findByNameAndVersion(name: string, version: string): Promise<Contract | null> {
    try {
      const client = await this.getClient();

      return await client.contract.findUnique({
        where: { name_version: { name, version } },
        include: {
          components: true,
        },
      });
    } catch (error) {
      this.handleError(error, 'contract findByNameAndVersion');
    }
  }

  async create(data: Prisma.ContractCreateInput): Promise<Contract> {
    try {
      const client = await this.getClient();

      return await client.contract.create({
        data,
        include: {
          components: true,
        },
      });
    } catch (error) {
      this.handleError(error, 'contract create');
    }
  }

  async findBySchemaVersion(schemaVersion: string): Promise<Contract[]> {
    try {
      const client = await this.getClient();

      return await client.contract.findMany({
        where: { schemaVersion },
        include: {
          components: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.handleError(error, 'contract findBySchemaVersion');
    }
  }
}

// =============================================================================
// Environment Repository
// =============================================================================

export class EnvironmentRepository extends BaseRepository {
  async findAll(): Promise<Environment[]> {
    try {
      const client = await this.getClient();

      return await client.environment.findMany({
        include: {
          capabilities: true,
          mountPlans: true,
          profiles: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.handleError(error, 'environment findAll');
    }
  }

  async findByStatus(status: string): Promise<Environment[]> {
    try {
      const client = await this.getClient();

      return await client.environment.findMany({
        where: { status: status as Prisma.EnumEnvironmentStatusFilter<'Environment'> },
        include: {
          capabilities: true,
          mountPlans: true,
          profiles: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.handleError(error, 'environment findByStatus');
    }
  }

  async findByNameAndVersion(name: string, version: string): Promise<Environment | null> {
    try {
      const client = await this.getClient();

      return await client.environment.findUnique({
        where: { name_version: { name, version } },
        include: {
          capabilities: true,
          mountPlans: true,
          profiles: true,
        },
      });
    } catch (error) {
      this.handleError(error, 'environment findByNameAndVersion');
    }
  }

  async create(data: Prisma.EnvironmentCreateInput): Promise<Environment> {
    try {
      const client = await this.getClient();

      return await client.environment.create({
        data,
        include: {
          capabilities: true,
          mountPlans: true,
          profiles: true,
        },
      });
    } catch (error) {
      this.handleError(error, 'environment create');
    }
  }

  async updateHealth(id: string, health: string): Promise<Environment> {
    try {
      const client = await this.getClient();

      return await client.environment.update({
        where: { id },
        data: {
          health: health as Prisma.EnumEnvironmentHealthFieldUpdateOperationsInput,
          lastHealthCheck: new Date(),
        },
        include: {
          capabilities: true,
          mountPlans: true,
          profiles: true,
        },
      });
    } catch (error) {
      this.handleError(error, 'environment updateHealth');
    }
  }
}

// =============================================================================
// Capability Repository
// =============================================================================

export class CapabilityRepository extends BaseRepository {
  async findByEnvironment(environmentId: string): Promise<Capability[]> {
    try {
      const client = await this.getClient();

      return await client.capability.findMany({
        where: { environmentId },
        include: {
          environment: true,
          dependencies: true,
          providedBy: true,
          requiredBy: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.handleError(error, 'capability findByEnvironment');
    }
  }

  async findByType(type: string): Promise<Capability[]> {
    try {
      const client = await this.getClient();

      return await client.capability.findMany({
        where: { type: type as Prisma.EnumCapabilityTypeFilter<'Capability'> },
        include: {
          environment: true,
          dependencies: true,
          providedBy: true,
          requiredBy: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.handleError(error, 'capability findByType');
    }
  }

  async create(data: Prisma.CapabilityCreateInput): Promise<Capability> {
    try {
      const client = await this.getClient();

      return await client.capability.create({
        data,
        include: {
          environment: true,
          dependencies: true,
          providedBy: true,
          requiredBy: true,
        },
      });
    } catch (error) {
      this.handleError(error, 'capability create');
    }
  }
}

// =============================================================================
// Mount Plan Repository
// =============================================================================

export class MountPlanRepository extends BaseRepository {
  async findByComponent(componentId: string): Promise<MountPlan[]> {
    try {
      const client = await this.getClient();

      return await client.mountPlan.findMany({
        where: { componentId },
        include: {
          component: true,
          environment: true,
          profile: true,
        },
        orderBy: { priority: 'desc' },
      });
    } catch (error) {
      this.handleError(error, 'mountPlan findByComponent');
    }
  }

  async findByStatus(status: string): Promise<MountPlan[]> {
    try {
      const client = await this.getClient();

      return await client.mountPlan.findMany({
        where: { status: status as Prisma.EnumMountPlanStatusFilter<'MountPlan'> },
        include: {
          component: true,
          environment: true,
          profile: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.handleError(error, 'mountPlan findByStatus');
    }
  }

  async updateStatus(id: string, status: string, errorMessage?: string): Promise<MountPlan> {
    try {
      const client = await this.getClient();

      const updateData: Prisma.MountPlanUpdateInput = {
        status: status as Prisma.EnumMountPlanStatusFieldUpdateOperationsInput,
      };

      if (status === 'RUNNING') {
        updateData.executionStartTime = new Date();
      } else if (status === 'COMPLETED' || status === 'FAILED') {
        updateData.executionEndTime = new Date();
      }

      if (errorMessage) {
        updateData.executionErrorMessage = errorMessage;
      }

      return await client.mountPlan.update({
        where: { id },
        data: updateData,
        include: {
          component: true,
          environment: true,
          profile: true,
        },
      });
    } catch (error) {
      this.handleError(error, 'mountPlan updateStatus');
    }
  }
}

// =============================================================================
// Repository Factory
// =============================================================================

export class RepositoryFactory {
  private static componentRepo: ComponentRepository | null = null;
  private static contractRepo: ContractRepository | null = null;
  private static environmentRepo: EnvironmentRepository | null = null;
  private static capabilityRepo: CapabilityRepository | null = null;
  private static mountPlanRepo: MountPlanRepository | null = null;

  static getComponentRepository(): ComponentRepository {
    if (!this.componentRepo) {
      this.componentRepo = new ComponentRepository();
    }
    return this.componentRepo;
  }

  static getContractRepository(): ContractRepository {
    if (!this.contractRepo) {
      this.contractRepo = new ContractRepository();
    }
    return this.contractRepo;
  }

  static getEnvironmentRepository(): EnvironmentRepository {
    if (!this.environmentRepo) {
      this.environmentRepo = new EnvironmentRepository();
    }
    return this.environmentRepo;
  }

  static getCapabilityRepository(): CapabilityRepository {
    if (!this.capabilityRepo) {
      this.capabilityRepo = new CapabilityRepository();
    }
    return this.capabilityRepo;
  }

  static getMountPlanRepository(): MountPlanRepository {
    if (!this.mountPlanRepo) {
      this.mountPlanRepo = new MountPlanRepository();
    }
    return this.mountPlanRepo;
  }
}
