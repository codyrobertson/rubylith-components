import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Application } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { setupIntegrationTest, teardownIntegrationTest, cleanTestDatabase } from './testSetup';
import { ApiTestHelper } from '../utils/helpers';
import { userFixtures, createUserFixture } from '../fixtures/users';
import { componentFixtures, createComponentFixture } from '../fixtures/components';
import { ComponentService } from '../../src/api/services/ComponentService';

describe('Component API Integration Tests', () => {
  let app: Application;
  let testDb: any;
  let apiHelper: ApiTestHelper;
  let prisma: PrismaClient;
  let componentService: ComponentService;

  beforeAll(async () => {
    const setup = await setupIntegrationTest('components');
    app = setup.app;
    testDb = setup.testDb;
    prisma = setup.testClient;
    
    apiHelper = new ApiTestHelper(app);
    componentService = new ComponentService(prisma);
  }, 30000);

  afterAll(async () => {
    await teardownIntegrationTest();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
    // Create test users and login to get tokens
    await apiHelper.createUser(userFixtures.owner, testDb);
    await apiHelper.createUser(userFixtures.contributor, testDb);
    await apiHelper.createUser(userFixtures.consumer, testDb);
    
    // Login users to get auth tokens
    try {
      await apiHelper.loginUser(userFixtures.owner.email, userFixtures.owner.password);
      await apiHelper.loginUser(userFixtures.contributor.email, userFixtures.contributor.password);
      await apiHelper.loginUser(userFixtures.consumer.email, userFixtures.consumer.password);
    } catch (error) {
      console.error('Failed to login test users:', error);
    }
  });

  describe('POST /api/v1/components', () => {
    it('should create a new component with valid data', async () => {
      const componentData = createComponentFixture();

      const response = await apiHelper
        .authenticatedRequest('post', '/api/v1/components', userFixtures.contributor.email)
        .send(componentData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: componentData.name,
        version: componentData.version,
        type: componentData.type,
        status: 'DRAFT',
        metadata: componentData.metadata,
        createdBy: {
          email: userFixtures.contributor.email,
        },
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should reject component creation without authentication', async () => {
      const componentData = createComponentFixture();

      await request(app).post('/api/v1/components').send(componentData).expect(401);
    });

    it('should reject component creation with viewer role', async () => {
      const componentData = createComponentFixture();

      await apiHelper
        .authenticatedRequest('post', '/api/v1/components', userFixtures.consumer.email)
        .send(componentData)
        .expect(403);
    });

    it('should reject duplicate name:version combination', async () => {
      const componentData = componentFixtures.apiGateway;

      // Create first component
      await apiHelper
        .authenticatedRequest('post', '/api/v1/components', userFixtures.contributor.email)
        .send(componentData)
        .expect(201);

      // Try to create duplicate
      const response = await apiHelper
        .authenticatedRequest('post', '/api/v1/components', userFixtures.contributor.email)
        .send(componentData)
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });

    it('should validate component data', async () => {
      const invalidData = {
        name: 'a', // Too short
        version: 'invalid-version', // Invalid semantic version
        type: 'INVALID_TYPE',
        metadata: 'not-an-object',
      };

      const response = await apiHelper
        .authenticatedRequest('post', '/api/v1/components', userFixtures.contributor.email)
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toHaveLength(4);
    });

    it('should handle components with complex metadata', async () => {
      const componentData = {
        ...createComponentFixture(),
        metadata: {
          description: 'Complex component',
          tags: ['api', 'gateway', 'routing'],
          configuration: {
            ports: [8080, 8443],
            environment: {
              NODE_ENV: 'production',
              LOG_LEVEL: 'info',
            },
          },
          dependencies: {
            runtime: ['node:18', 'nginx:latest'],
            development: ['jest', 'typescript'],
          },
        },
      };

      const response = await apiHelper
        .authenticatedRequest('post', '/api/v1/components', userFixtures.contributor.email)
        .send(componentData)
        .expect(201);

      expect(response.body.metadata).toEqual(componentData.metadata);
    });
  });

  describe('GET /api/v1/components', () => {
    beforeEach(async () => {
      // Create multiple components
      const components = [
        componentFixtures.apiGateway,
        componentFixtures.authService,
        componentFixtures.database,
        createComponentFixture({ type: 'BACKEND', status: 'ACTIVE' }),
        createComponentFixture({ type: 'FRONTEND', status: 'DEPRECATED' }),
      ];

      for (const component of components) {
        await componentService.create(component, userFixtures.contributor.id);
      }
    });

    it('should list all components with pagination', async () => {
      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/components', userFixtures.consumer.email)
        .query({ page: 1, limit: 3 })
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 3,
        total: 5,
        totalPages: 2,
      });
    });

    it('should filter components by type', async () => {
      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/components', userFixtures.consumer.email)
        .query({ type: 'SERVICE' })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach((component: any) => {
        expect(component.type).toBe('SERVICE');
      });
    });

    it('should filter components by status', async () => {
      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/components', userFixtures.consumer.email)
        .query({ status: 'ACTIVE' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('ACTIVE');
    });

    it('should search components by name', async () => {
      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/components', userFixtures.consumer.email)
        .query({ search: 'auth' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toContain('auth');
    });

    it('should include creator information', async () => {
      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/components', userFixtures.consumer.email)
        .query({ includeCreator: true })
        .expect(200);

      response.body.data.forEach((component: any) => {
        expect(component.createdBy).toBeDefined();
        expect(component.createdBy.email).toBeDefined();
        expect(component.createdBy.password).toBeUndefined();
      });
    });

    it('should sort components', async () => {
      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/components', userFixtures.consumer.email)
        .query({ sortBy: 'name', sortOrder: 'asc' })
        .expect(200);

      const names = response.body.data.map((c: any) => c.name);
      expect(names).toEqual([...names].sort());
    });

    it('should work without authentication for public access', async () => {
      const response = await request(app).get('/api/v1/components').expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/components/:id', () => {
    let testComponent: any;

    beforeEach(async () => {
      testComponent = await componentService.create(
        componentFixtures.apiGateway,
        userFixtures.contributor.id
      );
    });

    it('should retrieve component by ID', async () => {
      const response = await apiHelper
        .authenticatedRequest(
          'get',
          `/api/v1/components/${testComponent.id}`,
          userFixtures.consumer.email
        )
        .expect(200);

      expect(response.body).toMatchObject({
        id: testComponent.id,
        name: testComponent.name,
        version: testComponent.version,
        type: testComponent.type,
      });
    });

    it('should retrieve component by name:version', async () => {
      const nameVersion = `${testComponent.name}:${testComponent.version}`;
      const response = await apiHelper
        .authenticatedRequest('get', `/api/v1/components/${nameVersion}`, userFixtures.consumer.email)
        .expect(200);

      expect(response.body.id).toBe(testComponent.id);
    });

    it('should return 404 for non-existent component', async () => {
      const response = await apiHelper
        .authenticatedRequest(
          'get',
          '/api/v1/components/non-existent-id',
          userFixtures.consumer.email
        )
        .expect(404);

      expect(response.body.error).toContain('Component not found');
    });

    it('should include related data when requested', async () => {
      const response = await apiHelper
        .authenticatedRequest(
          'get',
          `/api/v1/components/${testComponent.id}`,
          userFixtures.consumer.email
        )
        .query({ includeCreator: true, includeContracts: true })
        .expect(200);

      expect(response.body.createdBy).toBeDefined();
      expect(response.body.providedContracts).toBeDefined();
      expect(response.body.consumedContracts).toBeDefined();
    });

    it('should work without authentication for public access', async () => {
      await request(app).get(`/api/v1/components/${testComponent.id}`).expect(200);
    });
  });

  describe('PATCH /api/v1/components/:id', () => {
    let testComponent: any;

    beforeEach(async () => {
      testComponent = await componentService.create(
        componentFixtures.apiGateway,
        userFixtures.contributor.id
      );
    });

    it('should update component properties', async () => {
      const updates = {
        status: 'ACTIVE',
        metadata: {
          ...testComponent.metadata,
          updated: true,
          description: 'Updated description',
        },
      };

      const response = await apiHelper
        .authenticatedRequest(
          'patch',
          `/api/v1/components/${testComponent.id}`,
          userFixtures.contributor.email
        )
        .send(updates)
        .expect(200);

      expect(response.body.status).toBe('ACTIVE');
      expect(response.body.metadata.updated).toBe(true);
      expect(response.body.metadata.description).toBe('Updated description');
      expect(response.body.updatedAt).not.toBe(testComponent.updatedAt);
    });

    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/v1/components/${testComponent.id}`)
        .send({ status: 'ACTIVE' })
        .expect(401);
    });

    it('should require developer or owner role', async () => {
      await apiHelper
        .authenticatedRequest(
          'patch',
          `/api/v1/components/${testComponent.id}`,
          userFixtures.consumer.email
        )
        .send({ status: 'ACTIVE' })
        .expect(403);
    });

    it('should validate update data', async () => {
      const invalidUpdates = {
        status: 'INVALID_STATUS',
        version: 'not-a-version',
      };

      const response = await apiHelper
        .authenticatedRequest(
          'patch',
          `/api/v1/components/${testComponent.id}`,
          userFixtures.contributor.email
        )
        .send(invalidUpdates)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should prevent updating to duplicate name:version', async () => {
      // Create another component
      const anotherComponent = await componentService.create(
        createComponentFixture(),
        userFixtures.contributor.id
      );

      // Try to update to existing name:version
      const response = await apiHelper
        .authenticatedRequest(
          'patch',
          `/api/v1/components/${anotherComponent.id}`,
          userFixtures.contributor.email
        )
        .send({
          name: testComponent.name,
          version: testComponent.version,
        })
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });

    it('should handle partial updates', async () => {
      const response = await apiHelper
        .authenticatedRequest(
          'patch',
          `/api/v1/components/${testComponent.id}`,
          userFixtures.contributor.email
        )
        .send({ status: 'DEPRECATED' })
        .expect(200);

      expect(response.body.status).toBe('DEPRECATED');
      expect(response.body.name).toBe(testComponent.name);
      expect(response.body.version).toBe(testComponent.version);
    });
  });

  describe('DELETE /api/v1/components/:id', () => {
    let testComponent: any;

    beforeEach(async () => {
      testComponent = await componentService.create(
        componentFixtures.apiGateway,
        userFixtures.contributor.id
      );
    });

    it('should delete component with owner role', async () => {
      await apiHelper
        .authenticatedRequest(
          'delete',
          `/api/v1/components/${testComponent.id}`,
          userFixtures.owner.email
        )
        .expect(204);

      // Verify deletion
      await apiHelper
        .authenticatedRequest(
          'get',
          `/api/v1/components/${testComponent.id}`,
          userFixtures.consumer.email
        )
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).delete(`/api/v1/components/${testComponent.id}`).expect(401);
    });

    it('should require owner role', async () => {
      await apiHelper
        .authenticatedRequest(
          'delete',
          `/api/v1/components/${testComponent.id}`,
          userFixtures.contributor.email
        )
        .expect(403);

      await apiHelper
        .authenticatedRequest(
          'delete',
          `/api/v1/components/${testComponent.id}`,
          userFixtures.consumer.email
        )
        .expect(403);
    });

    it('should return 404 for non-existent component', async () => {
      await apiHelper
        .authenticatedRequest(
          'delete',
          '/api/v1/components/non-existent-id',
          userFixtures.owner.email
        )
        .expect(404);
    });

    it('should handle cascade deletion with contracts', async () => {
      // This would be tested if we had contract relationships set up
      // For now, just verify the component can be deleted
      await apiHelper
        .authenticatedRequest(
          'delete',
          `/api/v1/components/${testComponent.id}`,
          userFixtures.owner.email
        )
        .expect(204);
    });
  });

  describe('Component Versioning', () => {
    it('should allow multiple versions of the same component', async () => {
      const baseComponent = {
        name: 'versioned-component',
        type: 'SERVICE' as const,
        metadata: {},
      };

      // Create multiple versions
      const v1 = await apiHelper
        .authenticatedRequest('post', '/api/v1/components', userFixtures.contributor.email)
        .send({ ...baseComponent, version: '1.0.0' })
        .expect(201);

      const v2 = await apiHelper
        .authenticatedRequest('post', '/api/v1/components', userFixtures.contributor.email)
        .send({ ...baseComponent, version: '2.0.0' })
        .expect(201);

      const v3 = await apiHelper
        .authenticatedRequest('post', '/api/v1/components', userFixtures.contributor.email)
        .send({ ...baseComponent, version: '3.0.0-beta' })
        .expect(201);

      // Verify all versions exist
      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/components', userFixtures.consumer.email)
        .query({ search: 'versioned-component' })
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      const versions = response.body.data.map((c: any) => c.version).sort();
      expect(versions).toEqual(['1.0.0', '2.0.0', '3.0.0-beta']);
    });

    it('should retrieve specific version by name:version', async () => {
      const component = await componentService.create(
        { ...componentFixtures.apiGateway, version: '2.1.0' },
        userFixtures.contributor.id
      );

      const response = await apiHelper
        .authenticatedRequest(
          'get',
          `/api/v1/components/${component.name}:2.1.0`,
          userFixtures.consumer.email
        )
        .expect(200);

      expect(response.body.version).toBe('2.1.0');
    });
  });

  describe('Component Status Transitions', () => {
    let draftComponent: any;
    let activeComponent: any;

    beforeEach(async () => {
      draftComponent = await componentService.create(
        { ...componentFixtures.apiGateway, status: 'DRAFT' },
        userFixtures.contributor.id
      );

      activeComponent = await componentService.create(
        { ...componentFixtures.authService, status: 'ACTIVE' },
        userFixtures.contributor.id
      );
    });

    it('should transition from DRAFT to ACTIVE', async () => {
      const response = await apiHelper
        .authenticatedRequest(
          'patch',
          `/api/v1/components/${draftComponent.id}`,
          userFixtures.contributor.email
        )
        .send({ status: 'ACTIVE' })
        .expect(200);

      expect(response.body.status).toBe('ACTIVE');
    });

    it('should transition from ACTIVE to DEPRECATED', async () => {
      const response = await apiHelper
        .authenticatedRequest(
          'patch',
          `/api/v1/components/${activeComponent.id}`,
          userFixtures.contributor.email
        )
        .send({ status: 'DEPRECATED' })
        .expect(200);

      expect(response.body.status).toBe('DEPRECATED');
    });

    it('should allow any valid status transition', async () => {
      // Test various transitions
      const transitions = [
        { from: 'DRAFT', to: 'DEPRECATED' },
        { from: 'ACTIVE', to: 'DRAFT' },
        { from: 'DEPRECATED', to: 'ACTIVE' },
      ];

      for (const transition of transitions) {
        const component = await componentService.create(
          { ...createComponentFixture(), status: transition.from as any },
          userFixtures.contributor.id
        );

        await apiHelper
          .authenticatedRequest(
            'patch',
            `/api/v1/components/${component.id}`,
            userFixtures.contributor.email
          )
          .send({ status: transition.to })
          .expect(200);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily close the database connection
      await prisma.$disconnect();

      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/components', userFixtures.consumer.email)
        .expect(500);

      expect(response.body.error).toBeDefined();

      // Reconnect for cleanup
      await prisma.$connect();
    });

    it('should handle malformed JSON', async () => {
      const response = await apiHelper
        .authenticatedRequest('post', '/api/v1/components', userFixtures.contributor.email)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.error).toContain('Invalid JSON');
    });

    it('should handle large payloads', async () => {
      const largeMetadata = {
        data: 'x'.repeat(1000000), // 1MB of data
      };

      const response = await apiHelper
        .authenticatedRequest('post', '/api/v1/components', userFixtures.contributor.email)
        .send({
          ...createComponentFixture(),
          metadata: largeMetadata,
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
