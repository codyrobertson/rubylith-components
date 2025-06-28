import { PrismaClient, Contract, Prisma } from '../../../generated/prisma';
import { errors } from '../middleware/errorHandler';

export class ContractService {
  constructor(private prisma: PrismaClient) {}

  async create(
    data: {
      name: string;
      version: string;
      type: string;
      status?: string;
      providerId: string;
      consumerIds?: string[];
      schema: any;
      metadata?: any;
    },
    userId: string
  ): Promise<Contract> {
    // Check if contract with same name, version, and provider already exists
    const existing = await this.prisma.contract.findFirst({
      where: {
        name: data.name,
        version: data.version,
        providerId: data.providerId,
      },
    });

    if (existing) {
      throw errors.conflict('Contract with this name, version, and provider already exists');
    }

    // Verify provider exists
    const provider = await this.prisma.component.findUnique({
      where: { id: data.providerId },
    });

    if (!provider) {
      throw errors.badRequest('Provider component not found');
    }

    // Verify consumers exist
    if (data.consumerIds && data.consumerIds.length > 0) {
      const consumers = await this.prisma.component.findMany({
        where: { id: { in: data.consumerIds } },
      });

      if (consumers.length !== data.consumerIds.length) {
        throw errors.badRequest('One or more consumer components not found');
      }
    }

    return this.prisma.contract.create({
      data: {
        name: data.name,
        version: data.version,
        type: data.type,
        status: data.status || 'DRAFT',
        schema: data.schema,
        metadata: data.metadata || {},
        provider: {
          connect: { id: data.providerId },
        },
        consumers: data.consumerIds
          ? {
              connect: data.consumerIds.map((id) => ({ id })),
            }
          : undefined,
        createdBy: {
          connect: { id: userId },
        },
      },
      include: {
        provider: true,
        consumers: true,
        createdBy: true,
      },
    });
  }

  async findById(id: string): Promise<Contract | null> {
    return this.prisma.contract.findUnique({
      where: { id },
      include: {
        provider: true,
        consumers: true,
        createdBy: true,
      },
    });
  }

  async findAll(options: {
    where?: Prisma.ContractWhereInput;
    orderBy?: Prisma.ContractOrderByWithRelationInput;
    skip?: number;
    take?: number;
    include?: Prisma.ContractInclude;
  }) {
    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({
        where: options.where,
        orderBy: options.orderBy || { createdAt: 'desc' },
        skip: options.skip,
        take: options.take,
        include: options.include || {
          provider: true,
          consumers: true,
          createdBy: true,
        },
      }),
      this.prisma.contract.count({ where: options.where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: {
      name?: string;
      version?: string;
      type?: string;
      status?: string;
      schema?: any;
      metadata?: any;
      consumerIds?: string[];
    }
  ): Promise<Contract> {
    const contract = await this.findById(id);
    if (!contract) {
      throw errors.notFound('Contract not found');
    }

    // If updating name or version, check for conflicts
    if (data.name || data.version) {
      const newName = data.name || contract.name;
      const newVersion = data.version || contract.version;

      const existing = await this.prisma.contract.findFirst({
        where: {
          AND: [
            { name: newName },
            { version: newVersion },
            { providerId: contract.providerId },
            { NOT: { id } },
          ],
        },
      });

      if (existing) {
        throw errors.conflict('Contract with this name, version, and provider already exists');
      }
    }

    // Verify new consumers exist
    if (data.consumerIds) {
      const consumers = await this.prisma.component.findMany({
        where: { id: { in: data.consumerIds } },
      });

      if (consumers.length !== data.consumerIds.length) {
        throw errors.badRequest('One or more consumer components not found');
      }
    }

    return this.prisma.contract.update({
      where: { id },
      data: {
        name: data.name,
        version: data.version,
        type: data.type,
        status: data.status,
        schema: data.schema,
        metadata: data.metadata,
        consumers: data.consumerIds
          ? {
              set: [],
              connect: data.consumerIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        provider: true,
        consumers: true,
        createdBy: true,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.contract.delete({
      where: { id },
    });
  }

  async validateImplementation(
    contractId: string,
    implementation: any
  ): Promise<{ valid: boolean; errors: string[] }> {
    const contract = await this.findById(contractId);
    if (!contract) {
      throw errors.notFound('Contract not found');
    }

    // Basic validation logic - in a real implementation this would be more sophisticated
    const errors: string[] = [];

    if (contract.type === 'REST') {
      const contractEndpoints = contract.schema.endpoints || [];
      const implEndpoints = implementation.endpoints || [];

      for (const contractEndpoint of contractEndpoints) {
        const matching = implEndpoints.find(
          (e: any) => e.path === contractEndpoint.path && e.method === contractEndpoint.method
        );

        if (!matching) {
          errors.push(`Missing endpoint: ${contractEndpoint.method} ${contractEndpoint.path}`);
        }
      }
    } else if (contract.type === 'GRAPHQL') {
      if (!implementation.typeDefs) {
        errors.push('Missing GraphQL type definitions');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async checkCompatibility(
    fromContractId: string,
    toContractId: string
  ): Promise<{
    compatible: boolean;
    breakingChanges: string[];
    warnings: string[];
  }> {
    const [fromContract, toContract] = await Promise.all([
      this.findById(fromContractId),
      this.findById(toContractId),
    ]);

    if (!fromContract || !toContract) {
      throw errors.notFound('One or both contracts not found');
    }

    // Basic compatibility check - in a real implementation this would be more sophisticated
    const breakingChanges: string[] = [];
    const warnings: string[] = [];

    if (fromContract.type !== toContract.type) {
      breakingChanges.push('Contract type changed');
    }

    // Check for removed endpoints in REST contracts
    if (fromContract.type === 'REST' && toContract.type === 'REST') {
      const fromEndpoints = fromContract.schema.endpoints || [];
      const toEndpoints = toContract.schema.endpoints || [];

      for (const fromEndpoint of fromEndpoints) {
        const exists = toEndpoints.find(
          (e: any) => e.path === fromEndpoint.path && e.method === fromEndpoint.method
        );

        if (!exists) {
          breakingChanges.push(`Removed endpoint: ${fromEndpoint.method} ${fromEndpoint.path}`);
        }
      }

      // Check for field type changes
      for (const toEndpoint of toEndpoints) {
        const fromEndpoint = fromEndpoints.find(
          (e: any) => e.path === toEndpoint.path && e.method === toEndpoint.method
        );

        if (fromEndpoint) {
          // Check response type changes
          const from200 = fromEndpoint.response?.['200'];
          const to200 = toEndpoint.response?.['200'];

          if (from200 && to200) {
            if (from200.type !== to200.type) {
              breakingChanges.push(
                `Response type changed for ${toEndpoint.method} ${toEndpoint.path}`
              );
            }

            // Check for renamed or removed fields
            if (from200.properties && to200.properties) {
              for (const prop in from200.properties) {
                if (!to200.properties[prop]) {
                  breakingChanges.push(
                    `Field removed or renamed: ${prop} in ${toEndpoint.method} ${toEndpoint.path}`
                  );
                } else if (from200.properties[prop].type !== to200.properties[prop].type) {
                  breakingChanges.push(
                    `Field type changed: ${prop} in ${toEndpoint.method} ${toEndpoint.path}`
                  );
                }
              }
            }
          }
        }
      }
    }

    return {
      compatible: breakingChanges.length === 0,
      breakingChanges,
      warnings,
    };
  }
}
