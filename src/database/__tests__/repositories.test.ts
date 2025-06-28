/**
 * Unit tests for repository classes
 * Tests database repository functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
  BaseRepository,
  UserRepository,
  ComponentRepository,
  ContractRepository,
  EnvironmentRepository,
  RepositoryFactory,
} from '../repositories';
import { PrismaClient } from '../../../generated/prisma';
import { testDb } from '../../../tests/utils/database';
import { userFixtures } from '../../../tests/fixtures/users';
import { componentFixtures } from '../../../tests/fixtures/components';
import { contractFixtures } from '../../../tests/fixtures/contracts';
import { environmentFixtures } from '../../../tests/fixtures/environments';
import { PasswordService } from '../../api/utils/auth';

// Mock console to suppress error logs during tests
const originalConsoleError = console.error;

describe('Repository Classes', () => {
  let prismaClient: PrismaClient;

  beforeAll(async () => {
    console.error = vi.fn();
    await testDb.setup();
    prismaClient = testDb.getClient();
  });

  afterAll(async () => {
    console.error = originalConsoleError;
    await testDb.teardown();
  });

  beforeEach(async () => {
    await testDb.cleanDatabase();
  });

  describe('BaseRepository', () => {
    class TestRepository extends BaseRepository {
      // Expose protected methods for testing
      public async testGetClient() {
        return this.getClient();
      }

      public testHandleError(error: any, operation: string) {
        return this.handleError(error, operation);
      }
    }

    it('should get Prisma client instance', async () => {
      const repo = new TestRepository();
      const client = await repo.testGetClient();

      expect(client).toBeInstanceOf(PrismaClient);
    });

    it('should handle Prisma known error codes', () => {
      const repo = new TestRepository();

      // Test unique constraint violation
      const p2002Error = {
        code: 'P2002',
        meta: { target: ['email'] },
      };

      expect(() => repo.testHandleError(p2002Error, 'create')).toThrow(
        'Unique constraint violation on email'
      );

      // Test record not found
      const p2025Error = {
        code: 'P2025',
      };

      expect(() => repo.testHandleError(p2025Error, 'update')).toThrow('Record not found');
    });

    it('should handle generic errors', () => {
      const repo = new TestRepository();
      const error = new Error('Generic error');

      expect(() => repo.testHandleError(error, 'operation')).toThrow(
        'Repository operation failed: Generic error'
      );
    });

    it('should handle unknown errors', () => {
      const repo = new TestRepository();
      const error = { unknown: 'error' };

      expect(() => repo.testHandleError(error, 'operation')).toThrow('Repository operation failed');
    });
  });

  describe('UserRepository', () => {
    let userRepo: UserRepository;

    beforeEach(() => {
      userRepo = new UserRepository();
    });

    describe('create', () => {
      it('should create a new user', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'hashed-password',
          firstName: 'Test',
          lastName: 'User',
          role: 'CONTRIBUTOR' as const,
        };

        const user = await userRepo.create(userData);

        expect(user).toMatchObject({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          status: 'ACTIVE',
        });
        expect(user.id).toBeDefined();
        expect(user.createdAt).toBeInstanceOf(Date);
      });

      it('should handle duplicate email error', async () => {
        const userData = {
          email: 'duplicate@example.com',
          password: 'password',
          firstName: 'Test',
          lastName: 'User',
          role: 'CONTRIBUTOR' as const,
        };

        await userRepo.create(userData);

        await expect(userRepo.create(userData)).rejects.toThrow('Unique constraint violation');
      });
    });

    describe('findById', () => {
      it('should find user by id', async () => {
        const created = await userRepo.create({
          email: 'findme@example.com',
          password: 'password',
          firstName: 'Find',
          lastName: 'Me',
          role: 'CONTRIBUTOR',
        });

        const found = await userRepo.findById(created.id);

        expect(found).toMatchObject({
          id: created.id,
          email: created.email,
        });
      });

      it('should return null for non-existent user', async () => {
        const found = await userRepo.findById('non-existent-id');

        expect(found).toBeNull();
      });
    });

    describe('findByEmail', () => {
      it('should find user by email (case insensitive)', async () => {
        await userRepo.create({
          email: 'test@example.com',
          password: 'password',
          firstName: 'Test',
          lastName: 'User',
          role: 'CONTRIBUTOR',
        });

        const found = await userRepo.findByEmail('TEST@EXAMPLE.COM');

        expect(found).toBeDefined();
        expect(found?.email).toBe('test@example.com');
      });

      it('should return null for non-existent email', async () => {
        const found = await userRepo.findByEmail('nonexistent@example.com');

        expect(found).toBeNull();
      });
    });

    describe('findAll', () => {
      beforeEach(async () => {
        // Create test users
        const users = [
          { ...userFixtures.owner, email: 'user1@test.com' },
          { ...userFixtures.maintainer, email: 'user2@test.com' },
          { ...userFixtures.contributor, email: 'user3@test.com' },
        ];

        for (const user of users) {
          await userRepo.create({
            email: user.email,
            password: await PasswordService.hashPassword(user.password),
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          });
        }
      });

      it('should return all users with pagination', async () => {
        const result = await userRepo.findAll({ limit: 2, offset: 0 });

        expect(result.data).toHaveLength(2);
        expect(result.total).toBe(3);
      });

      it('should filter by role', async () => {
        const result = await userRepo.findAll({
          where: { role: 'OWNER' },
        });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].role).toBe('OWNER');
      });

      it('should filter by status', async () => {
        const result = await userRepo.findAll({
          where: { status: 'ACTIVE' },
        });

        expect(result.total).toBe(3);
      });

      it('should order by createdAt desc', async () => {
        const result = await userRepo.findAll({
          orderBy: { createdAt: 'desc' },
        });

        const dates = result.data.map((u) => u.createdAt.getTime());
        expect(dates).toEqual([...dates].sort((a, b) => b - a));
      });
    });

    describe('update', () => {
      it('should update user fields', async () => {
        const user = await userRepo.create({
          email: 'update@example.com',
          password: 'password',
          firstName: 'Old',
          lastName: 'Name',
          role: 'CONTRIBUTOR',
        });

        const updated = await userRepo.update(user.id, {
          firstName: 'New',
          lastName: 'Name',
          role: 'MAINTAINER',
        });

        expect(updated.firstName).toBe('New');
        expect(updated.lastName).toBe('Name');
        expect(updated.role).toBe('MAINTAINER');
        expect(updated.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
      });

      it('should throw error for non-existent user', async () => {
        await expect(userRepo.update('non-existent-id', { firstName: 'New' })).rejects.toThrow();
      });
    });

    describe('delete', () => {
      it('should soft delete user', async () => {
        const user = await userRepo.create({
          email: 'delete@example.com',
          password: 'password',
          firstName: 'Delete',
          lastName: 'Me',
          role: 'CONTRIBUTOR',
        });

        const deleted = await userRepo.delete(user.id);

        expect(deleted.status).toBe('DELETED');
        expect(deleted.deletedAt).toBeInstanceOf(Date);

        // Should still exist in database
        const found = await userRepo.findById(user.id);
        expect(found).toBeDefined();
        expect(found?.status).toBe('DELETED');
      });
    });

    describe('validatePassword', () => {
      it('should validate correct password', async () => {
        const plainPassword = 'SecurePassword123!';
        const hashedPassword = await PasswordService.hashPassword(plainPassword);

        const user = await userRepo.create({
          email: 'validate@example.com',
          password: hashedPassword,
          firstName: 'Test',
          lastName: 'User',
          role: 'CONTRIBUTOR',
        });

        const isValid = await userRepo.validatePassword(user.id, plainPassword);

        expect(isValid).toBe(true);
      });

      it('should reject incorrect password', async () => {
        const user = await userRepo.create({
          email: 'validate2@example.com',
          password: await PasswordService.hashPassword('correct-password'),
          firstName: 'Test',
          lastName: 'User',
          role: 'CONTRIBUTOR',
        });

        const isValid = await userRepo.validatePassword(user.id, 'wrong-password');

        expect(isValid).toBe(false);
      });

      it('should return false for non-existent user', async () => {
        const isValid = await userRepo.validatePassword('non-existent', 'password');

        expect(isValid).toBe(false);
      });
    });
  });

  describe('ComponentRepository', () => {
    let componentRepo: ComponentRepository;
    let testUser: any;

    beforeEach(async () => {
      componentRepo = new ComponentRepository();

      // Create test user
      const userRepo = new UserRepository();
      testUser = await userRepo.create({
        email: 'component-test@example.com',
        password: 'password',
        firstName: 'Component',
        lastName: 'Tester',
        role: 'DEVELOPER',
      });
    });

    describe('create', () => {
      it('should create a new component', async () => {
        const componentData = {
          ...componentFixtures.apiGateway,
          createdById: testUser.id,
        };

        const component = await componentRepo.create(componentData);

        expect(component).toMatchObject({
          name: componentData.name,
          version: componentData.version,
          type: componentData.type,
          status: 'DRAFT',
          createdById: testUser.id,
        });
        expect(component.id).toBeDefined();
      });

      it('should enforce unique name:version constraint', async () => {
        const componentData = {
          ...componentFixtures.apiGateway,
          createdById: testUser.id,
        };

        await componentRepo.create(componentData);

        await expect(componentRepo.create(componentData)).rejects.toThrow(
          'Unique constraint violation'
        );
      });
    });

    describe('findByNameAndVersion', () => {
      it('should find component by name and version', async () => {
        const created = await componentRepo.create({
          ...componentFixtures.authService,
          createdById: testUser.id,
        });

        const found = await componentRepo.findByNameAndVersion(created.name, created.version);

        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);
      });

      it('should return null for non-existent component', async () => {
        const found = await componentRepo.findByNameAndVersion('non-existent', '1.0.0');

        expect(found).toBeNull();
      });
    });

    describe('findAll', () => {
      beforeEach(async () => {
        // Create test components
        await componentRepo.create({
          ...componentFixtures.apiGateway,
          createdById: testUser.id,
        });
        await componentRepo.create({
          ...componentFixtures.authService,
          createdById: testUser.id,
        });
        await componentRepo.create({
          ...componentFixtures.database,
          createdById: testUser.id,
        });
      });

      it('should return all components', async () => {
        const result = await componentRepo.findAll({});

        expect(result.data).toHaveLength(3);
        expect(result.total).toBe(3);
      });

      it('should filter by type', async () => {
        const result = await componentRepo.findAll({
          where: { type: 'SERVICE' },
        });

        expect(result.data).toHaveLength(2);
        result.data.forEach((comp) => {
          expect(comp.type).toBe('SERVICE');
        });
      });

      it('should include creator relation', async () => {
        const result = await componentRepo.findAll({
          include: { createdBy: true },
        });

        expect(result.data[0].createdBy).toBeDefined();
        expect(result.data[0].createdBy.email).toBe(testUser.email);
      });
    });
  });

  describe('RepositoryFactory', () => {
    it('should create user repository', () => {
      const repo = RepositoryFactory.createUserRepository();

      expect(repo).toBeInstanceOf(UserRepository);
    });

    it('should create component repository', () => {
      const repo = RepositoryFactory.createComponentRepository();

      expect(repo).toBeInstanceOf(ComponentRepository);
    });

    it('should create contract repository', () => {
      const repo = RepositoryFactory.createContractRepository();

      expect(repo).toBeInstanceOf(ContractRepository);
    });

    it('should create environment repository', () => {
      const repo = RepositoryFactory.createEnvironmentRepository();

      expect(repo).toBeInstanceOf(EnvironmentRepository);
    });

    it('should return singleton instances', () => {
      const repo1 = RepositoryFactory.createUserRepository();
      const repo2 = RepositoryFactory.createUserRepository();

      expect(repo1).toBe(repo2);
    });
  });
});
