import { PrismaClient, Component, Prisma } from '../../../generated/prisma';
import { errors } from '../middleware/errorHandler';

export class ComponentService {
  constructor(private prisma: PrismaClient) {}

  async create(
    data: Omit<Prisma.ComponentCreateInput, 'createdBy'>,
    userId: string
  ): Promise<Component> {
    // Check if component with same name and version already exists
    const existing = await this.prisma.component.findUnique({
      where: {
        name_version: {
          name: data.name,
          version: data.version,
        },
      },
    });

    if (existing) {
      throw errors.conflict('Component with this name and version already exists');
    }

    return this.prisma.component.create({
      data: {
        ...data,
        createdBy: {
          connect: { id: userId },
        },
      },
      include: {
        createdBy: true,
      },
    });
  }

  async findById(id: string): Promise<Component | null> {
    return this.prisma.component.findUnique({
      where: { id },
      include: {
        createdBy: true,
      },
    });
  }

  async findByNameAndVersion(
    name: string,
    version: string
  ): Promise<Component | null> {
    return this.prisma.component.findUnique({
      where: {
        name_version: { name, version },
      },
      include: {
        createdBy: true,
      },
    });
  }

  async findAll(options: {
    where?: Prisma.ComponentWhereInput;
    orderBy?: Prisma.ComponentOrderByWithRelationInput;
    skip?: number;
    take?: number;
    include?: Prisma.ComponentInclude;
  }) {
    const [data, total] = await Promise.all([
      this.prisma.component.findMany({
        where: options.where,
        orderBy: options.orderBy || { createdAt: 'desc' },
        skip: options.skip,
        take: options.take,
        include: options.include || {
          createdBy: true,
        },
      }),
      this.prisma.component.count({ where: options.where }),
    ]);

    return { data, total };
  }

  async update(
    id: string,
    data: Prisma.ComponentUpdateInput
  ): Promise<Component> {
    // If updating name or version, check for conflicts
    if (data.name || data.version) {
      const component = await this.findById(id);
      if (!component) {
        throw errors.notFound('Component not found');
      }

      const newName = (data.name as string) || component.name;
      const newVersion = (data.version as string) || component.version;

      const existing = await this.prisma.component.findFirst({
        where: {
          AND: [
            { name: newName },
            { version: newVersion },
            { NOT: { id } },
          ],
        },
      });

      if (existing) {
        throw errors.conflict('Component with this name and version already exists');
      }
    }

    return this.prisma.component.update({
      where: { id },
      data,
      include: {
        createdBy: true,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.component.delete({
      where: { id },
    });
  }
}