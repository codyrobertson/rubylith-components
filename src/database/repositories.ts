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
  User,
  Prisma,
} from '../../generated/prisma';

// =============================================================================
// Base Repository
// =============================================================================

export abstract class BaseRepository {
  protected client: PrismaClient | null = null;
  private instanceClient: PrismaClient | null;

  constructor(client?: PrismaClient) {
    this.instanceClient = client || null;
  }

  protected async getClient(): Promise<PrismaClient> {
    if (this.instanceClient) {
      return this.instanceClient;
    }
    if (!this.client) {
      this.client = getPrismaClient();
      if (process.env.NODE_ENV === 'test') {
        console.log('Repository using database URL:', process.env.DATABASE_URL);
      }
    }
    return this.client;
  }

  protected handleError(error: unknown, operation: string): never {
    // Log the error for debugging, but then re-throw the original error.
    console.error(`Error in repository operation '${operation}':`, error);
    if (error instanceof Error) {
      // Enhance the original error message with more context
      error.message = `Repository operation '${operation}' failed: ${error.message}`;
      throw error;
    }
    // If for some reason a non-Error was thrown, wrap it.
    throw new Error(`Repository operation '${operation}' failed with a non-error value.`);
  }
}

// =============================================================================
// User Repository
// =============================================================================

export class UserRepository extends BaseRepository {
  async findAll(options?: {
    where?: Prisma.UserWhereInput;
    limit?: number;
    offset?: number;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<{ data: User[]; total: number }> {
    try {
      const client = await this.getClient();

      const [data, total] = await Promise.all([
        client.user.findMany({
          where: options?.where,
          take: options?.limit,
          skip: options?.offset,
          orderBy: options?.orderBy || { createdAt: 'desc' },
        }),
        client.user.count({ where: options?.where }),
      ]);

      return { data, total };
    } catch (error) {
      this.handleError(error, 'user findAll');
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const client = await this.getClient();
      return await client.user.findUnique({
        where: { id },
      });
    } catch (error) {
      this.handleError(error, 'user findById');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const client = await this.getClient();
      return await client.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    } catch (error) {
      this.handleError(error, 'user findByEmail');
    }
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    try {
      const client = await this.getClient();
      return await client.user.create({
        data: {
          ...data,
          email: data.email.toLowerCase(),
        },
      });
    } catch (error) {
      this.handleError(error, 'user create');
    }
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    try {
      const client = await this.getClient();
      return await client.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.handleError(error, 'user update');
    }
  }

  async updateLastLogin(id: string): Promise<User> {
    try {
      const client = await this.getClient();
      return await client.user.update({
        where: { id },
        data: { lastLoginAt: new Date() },
      });
    } catch (error) {
      this.handleError(error, 'user updateLastLogin');
    }
  }

  async findByRole(role: string): Promise<User[]> {
    try {
      const client = await this.getClient();
      return await client.user.findMany({
        where: { role: role as Prisma.EnumUserRoleFilter<'User'> },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.handleError(error, 'user findByRole');
    }
  }

  async delete(id: string): Promise<User> {
    try {
      const client = await this.getClient();
      return await client.user.update({
        where: { id },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      this.handleError(error, 'user delete');
    }
  }

  async validatePassword(id: string, password: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const user = await client.user.findUnique({
        where: { id },
        select: { password: true },
      });

      if (!user) {
        return false;
      }

      const PasswordService = await import('../api/utils/auth').then((m) => m.PasswordService);
      return await PasswordService.verifyPassword(password, user.password);
    } catch (error) {
      return false;
    }
  }
}

// =============================================================================
// Component Repository
// =============================================================================

export class ComponentRepository extends BaseRepository {
  async findAll(options?: {
    where?: Prisma.ComponentWhereInput;
    limit?: number;
    offset?: number;
    include?: Prisma.ComponentInclude;
    type?: string;
    lifecycle?: string;
  }): Promise<{ data: Component[]; total: number }> {
    try {
      const client = await this.getClient();

      let where: Prisma.ComponentWhereInput = options?.where || {};
      if (options?.type) {
        where.type = options.type as Prisma.EnumComponentTypeFilter<'Component'>;
      }
      if (options?.lifecycle) {
        where.lifecycle = options.lifecycle as Prisma.EnumComponentLifecycleFilter<'Component'>;
      }

      const include = options?.include || {
        contract: true,
        dependencies: true,
        provides: true,
        requires: true,
      };

      const [data, total] = await Promise.all([
        client.component.findMany({
          where,
          take: options?.limit,
          skip: options?.offset,
          include,
          orderBy: { createdAt: 'desc' },
        }),
        client.component.count({ where }),
      ]);

      return { data, total };
    } catch (error) {
      this.handleError(error, 'component findAll');
    }
  }

  async findById(id: string): Promise<Component | null> {
    try {
      const client = await this.getClient();

      return await client.component.findUnique({
        where: { id },
        include: {
          contract: true,
          dependencies: true,
          provides: true,
          requires: true,
        },
      });
    } catch (error) {
      this.handleError(error, 'component findById');
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
  private static userRepo: UserRepository | null = null;
  private static componentRepo: ComponentRepository | null = null;
  private static contractRepo: ContractRepository | null = null;
  private static environmentRepo: EnvironmentRepository | null = null;
  private static capabilityRepo: CapabilityRepository | null = null;
  private static mountPlanRepo: MountPlanRepository | null = null;

  static getUserRepository(client?: PrismaClient): UserRepository {
    if (client) {
      return new UserRepository(client);
    }
    if (!this.userRepo) {
      this.userRepo = new UserRepository();
    }
    return this.userRepo;
  }

  static getComponentRepository(client?: PrismaClient): ComponentRepository {
    if (client) {
      return new ComponentRepository(client);
    }
    if (!this.componentRepo) {
      this.componentRepo = new ComponentRepository();
    }
    return this.componentRepo;
  }

  static getContractRepository(client?: PrismaClient): ContractRepository {
    if (client) {
      return new ContractRepository(client);
    }
    if (!this.contractRepo) {
      this.contractRepo = new ContractRepository();
    }
    return this.contractRepo;
  }

  static getEnvironmentRepository(client?: PrismaClient): EnvironmentRepository {
    if (client) {
      return new EnvironmentRepository(client);
    }
    if (!this.environmentRepo) {
      this.environmentRepo = new EnvironmentRepository();
    }
    return this.environmentRepo;
  }

  static getCapabilityRepository(client?: PrismaClient): CapabilityRepository {
    if (client) {
      return new CapabilityRepository(client);
    }
    if (!this.capabilityRepo) {
      this.capabilityRepo = new CapabilityRepository();
    }
    return this.capabilityRepo;
  }

  static getMountPlanRepository(client?: PrismaClient): MountPlanRepository {
    if (client) {
      return new MountPlanRepository(client);
    }
    if (!this.mountPlanRepo) {
      this.mountPlanRepo = new MountPlanRepository();
    }
    return this.mountPlanRepo;
  }

  // Aliases for test compatibility
  static createUserRepository(client?: PrismaClient): UserRepository {
    return this.getUserRepository(client);
  }

  static createComponentRepository(client?: PrismaClient): ComponentRepository {
    return this.getComponentRepository(client);
  }

  static createContractRepository(client?: PrismaClient): ContractRepository {
    return this.getContractRepository(client);
  }

  static createEnvironmentRepository(client?: PrismaClient): EnvironmentRepository {
    return this.getEnvironmentRepository(client);
  }

  static createCapabilityRepository(client?: PrismaClient): CapabilityRepository {
    return this.getCapabilityRepository(client);
  }

  static createMountPlanRepository(client?: PrismaClient): MountPlanRepository {
    return this.getMountPlanRepository(client);
  }
}
