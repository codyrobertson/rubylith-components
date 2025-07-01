import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Application } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { setupIntegrationTest, teardownIntegrationTest, cleanTestDatabase } from './testSetup';
import { ApiTestHelper } from '../utils/helpers';
import { userFixtures } from '../fixtures/users';
import { componentFixtures, createComponentFixture } from '../fixtures/components';
import { contractFixtures, createContractFixture } from '../fixtures/contracts';
import { ComponentService } from '../../src/api/services/ComponentService';
import { ContractService } from '../../src/api/services/ContractService';

describe('Contract API Integration Tests', () => {
  let app: Application;
  let testDb: any;
  let apiHelper: ApiTestHelper;
  let prisma: PrismaClient;
  let componentService: ComponentService;
  let contractService: ContractService;
  let testComponents: any = {};

  beforeAll(async () => {
    const setup = await setupIntegrationTest('contracts');
    app = setup.app;
    testDb = setup.testDb;
    prisma = setup.testClient;

    apiHelper = new ApiTestHelper(app);
    componentService = new ComponentService(prisma);
    contractService = new ContractService(prisma);
  }, 30000);

  afterAll(async () => {
    await teardownIntegrationTest();
  });

  beforeEach(async () => {
    await cleanTestDatabase();

    // Create test users directly and store their data
    const ownerUser = await testDb.createUser({
      email: 'owner@test.com',
      password: await require('../../src/api/utils/auth').PasswordService.hashPassword('SecurePassword123!'),
      firstName: 'Test',
      lastName: 'Owner',
      role: 'OWNER',
      status: 'ACTIVE',
    });

    const contributorUser = await testDb.createUser({
      email: 'contributor@test.com', 
      password: await require('../../src/api/utils/auth').PasswordService.hashPassword('SecurePassword123!'),
      firstName: 'Test',
      lastName: 'Contributor',
      role: 'CONTRIBUTOR',
      status: 'ACTIVE',
    });

    const consumerUser = await testDb.createUser({
      email: 'consumer@test.com',
      password: await require('../../src/api/utils/auth').PasswordService.hashPassword('SecurePassword123!'),
      firstName: 'Test',
      lastName: 'Consumer',
      role: 'CONSUMER',
      status: 'ACTIVE',
    });

    // Generate and store tokens
    const TokenService = require('../../src/api/utils/auth').TokenService;
    const ownerToken = TokenService.generateAccessToken({ id: ownerUser.id, role: ownerUser.role });
    const contributorToken = TokenService.generateAccessToken({ id: contributorUser.id, role: contributorUser.role });
    const consumerToken = TokenService.generateAccessToken({ id: consumerUser.id, role: consumerUser.role });

    apiHelper.clearTokens();
    apiHelper.getToken = (email: string) => {
      if (email === 'owner@test.com') return ownerToken;
      if (email === 'contributor@test.com') return contributorToken;
      if (email === 'consumer@test.com') return consumerToken;
      return undefined;
    };

    // Store user data for test access
    (userFixtures as any).owner = { ...ownerUser, accessToken: ownerToken };
    (userFixtures as any).contributor = { ...contributorUser, accessToken: contributorToken };
    (userFixtures as any).consumer = { ...consumerUser, accessToken: consumerToken };

    // Create test components using contributorUser.id
    testComponents.apiGateway = await componentService.create(
      componentFixtures['apiGateway']!,
      contributorUser.id
    );
    testComponents.authService = await componentService.create(
      componentFixtures['authService']!,
      contributorUser.id
    );
    testComponents.database = await componentService.create(
      componentFixtures['database']!,
      contributorUser.id
    );
  });

  describe('POST /api/v1/contracts', () => {
    it('should create a new contract with valid data', async () => {
      const contractData = {
        name: 'user-authentication',
        version: '1.0.0',
        type: 'REST',
        providerId: testComponents.authService.id,
        consumerIds: [testComponents.apiGateway.id],
        schema: contractFixtures.restContract.schema,
        metadata: {
          description: 'User authentication endpoints',
          tags: ['auth', 'security'],
        },
      };

      const response = await apiHelper
        .authenticatedRequest('post', '/api/v1/contracts', userFixtures.contributor.email)
        .send(contractData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: contractData.name,
        version: contractData.version,
        type: contractData.type,
        status: 'DRAFT',
        schema: contractData.schema,
        metadata: contractData.metadata,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.provider.id).toBe(testComponents.authService.id);
      expect(response.body.consumers).toHaveLength(1);
      expect(response.body.consumers[0].id).toBe(testComponents.apiGateway.id);
    });

    it('should reject contract creation without authentication', async () => {
      const contractData = createContractFixture({
        providerId: testComponents.authService.id,
      });

      await request(app).post('/api/v1/contracts').send(contractData).expect(401);
    });

    it('should reject contract creation with viewer role', async () => {
      const contractData = createContractFixture({
        providerId: testComponents.authService.id,
      });

      await apiHelper
        .authenticatedRequest('post', '/api/v1/contracts', userFixtures.consumer.email)
        .send(contractData)
        .expect(403);
    });

    it('should validate contract schema structure', async () => {
      const invalidContract = {
        name: 'invalid-contract',
        version: '1.0.0',
        type: 'REST',
        providerId: testComponents.authService.id,
        schema: {
          // Missing required fields for REST contract
          endpoints: 'not-an-array',
        },
      };

      const response = await apiHelper
        .authenticatedRequest('post', '/api/v1/contracts', userFixtures.contributor.email)
        .send(invalidContract)
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].path).toContain('schema');
    });

    it('should create GraphQL contract with complex schema', async () => {
      const graphqlContract = {
        ...contractFixtures.graphqlContract,
        providerId: testComponents.authService.id,
        consumerIds: [testComponents.apiGateway.id],
      };

      const response = await apiHelper
        .authenticatedRequest('post', '/api/v1/contracts', userFixtures.contributor.email)
        .send(graphqlContract)
        .expect(201);

      expect(response.body.type).toBe('GRAPHQL');
      expect(response.body.schema.typeDefs).toBeDefined();
      expect(response.body.schema.queries).toBeDefined();
      expect(response.body.schema.mutations).toBeDefined();
    });

    it('should create event-driven contract', async () => {
      const eventContract = {
        ...contractFixtures.eventContract,
        providerId: testComponents.authService.id,
        consumerIds: [testComponents.apiGateway.id, testComponents.database.id],
      };

      const response = await apiHelper
        .authenticatedRequest('post', '/api/v1/contracts', userFixtures.contributor.email)
        .send(eventContract)
        .expect(201);

      expect(response.body.type).toBe('EVENT');
      expect(response.body.schema.events).toBeDefined();
      expect(response.body.consumers).toHaveLength(2);
    });

    it('should reject duplicate name:version:provider combination', async () => {
      const contractData = createContractFixture({
        providerId: testComponents.authService.id,
      });

      // Create first contract
      await apiHelper
        .authenticatedRequest('post', '/api/v1/contracts', userFixtures.contributor.email)
        .send(contractData)
        .expect(201);

      // Try to create duplicate
      const response = await apiHelper
        .authenticatedRequest('post', '/api/v1/contracts', userFixtures.contributor.email)
        .send(contractData)
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });

    it('should validate provider and consumer IDs exist', async () => {
      const contractData = createContractFixture({
        providerId: 'non-existent-id',
        consumerIds: ['invalid-id-1', 'invalid-id-2'],
      });

      const response = await apiHelper
        .authenticatedRequest('post', '/api/v1/contracts', userFixtures.contributor.email)
        .send(contractData)
        .expect(400);

      expect(response.body.error).toContain('Provider component not found');
    });
  });

  describe('GET /api/v1/contracts', () => {
    beforeEach(async () => {
      // Create multiple contracts
      await contractService.create(
        {
          ...contractFixtures.restContract,
          providerId: testComponents.authService.id,
          consumerIds: [testComponents.apiGateway.id],
        },
        userFixtures.contributor.id
      );

      await contractService.create(
        {
          ...contractFixtures.graphqlContract,
          providerId: testComponents.apiGateway.id,
          consumerIds: [testComponents.database.id],
        },
        userFixtures.contributor.id
      );

      await contractService.create(
        {
          ...contractFixtures.eventContract,
          providerId: testComponents.database.id,
          consumerIds: [testComponents.authService.id, testComponents.apiGateway.id],
        },
        userFixtures.contributor.id
      );

      await contractService.create(
        {
          ...createContractFixture({ type: 'REST', status: 'ACTIVE' }),
          providerId: testComponents.authService.id,
          consumerIds: [],
        },
        userFixtures.contributor.id
      );
    });

    it('should list all contracts with pagination', async () => {
      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/contracts', userFixtures.consumer.email)
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 4,
        totalPages: 2,
      });
    });

    it('should filter contracts by type', async () => {
      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/contracts', userFixtures.consumer.email)
        .query({ type: 'REST' })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach((contract: any) => {
        expect(contract.type).toBe('REST');
      });
    });

    it('should filter contracts by status', async () => {
      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/contracts', userFixtures.consumer.email)
        .query({ status: 'ACTIVE' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('ACTIVE');
    });

    it('should filter contracts by provider', async () => {
      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/contracts', userFixtures.consumer.email)
        .query({ providerId: testComponents.authService.id })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach((contract: any) => {
        expect(contract.provider.id).toBe(testComponents.authService.id);
      });
    });

    it('should filter contracts by consumer', async () => {
      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/contracts', userFixtures.consumer.email)
        .query({ consumerId: testComponents.apiGateway.id })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach((contract: any) => {
        const consumerIds = contract.consumers.map((c: any) => c.id);
        expect(consumerIds).toContain(testComponents.apiGateway.id);
      });
    });

    it('should search contracts by name', async () => {
      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/contracts', userFixtures.consumer.email)
        .query({ search: 'user' })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((contract: any) => {
        expect(contract.name.toLowerCase()).toContain('user');
      });
    });

    it('should include related data when requested', async () => {
      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/contracts', userFixtures.consumer.email)
        .query({ includeProvider: true, includeConsumers: true })
        .expect(200);

      response.body.data.forEach((contract: any) => {
        expect(contract.provider).toBeDefined();
        expect(contract.provider.name).toBeDefined();
        expect(contract.consumers).toBeDefined();
        if (contract.consumers.length > 0) {
          expect(contract.consumers[0].name).toBeDefined();
        }
      });
    });

    it('should work without authentication for public access', async () => {
      const response = await request(app).get('/api/v1/contracts').expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/contracts/:id', () => {
    let testContract: any;

    beforeEach(async () => {
      testContract = await contractService.create(
        {
          ...contractFixtures.restContract,
          providerId: testComponents.authService.id,
          consumerIds: [testComponents.apiGateway.id, testComponents.database.id],
        },
        userFixtures.contributor.id
      );
    });

    it('should retrieve contract by ID', async () => {
      const response = await apiHelper
        .authenticatedRequest(
          'get',
          `/api/v1/contracts/${testContract.id}`,
          userFixtures.consumer.email
        )
        .expect(200);

      expect(response.body).toMatchObject({
        id: testContract.id,
        name: testContract.name,
        version: testContract.version,
        type: testContract.type,
        schema: testContract.schema,
      });
    });

    it('should include full provider and consumer details', async () => {
      const response = await apiHelper
        .authenticatedRequest(
          'get',
          `/api/v1/contracts/${testContract.id}`,
          userFixtures.consumer.email
        )
        .expect(200);

      expect(response.body.provider).toMatchObject({
        id: testComponents.authService.id,
        name: testComponents.authService.name,
        version: testComponents.authService.version,
      });
      expect(response.body.consumers).toHaveLength(2);
    });

    it('should return 404 for non-existent contract', async () => {
      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/contracts/non-existent-id', userFixtures.consumer.email)
        .expect(404);

      expect(response.body.error).toContain('Contract not found');
    });

    it('should work without authentication for public access', async () => {
      await request(app).get(`/api/v1/contracts/${testContract.id}`).expect(200);
    });
  });

  describe('GET /api/v1/contracts/:id/validate', () => {
    let restContract: any;
    let graphqlContract: any;

    beforeEach(async () => {
      restContract = await contractService.create(
        {
          ...contractFixtures.restContract,
          providerId: testComponents.authService.id,
          consumerIds: [testComponents.apiGateway.id],
          status: 'ACTIVE',
        },
        userFixtures.contributor.id
      );

      graphqlContract = await contractService.create(
        {
          ...contractFixtures.graphqlContract,
          providerId: testComponents.apiGateway.id,
          consumerIds: [testComponents.database.id],
          status: 'ACTIVE',
        },
        userFixtures.contributor.id
      );
    });

    it('should validate REST contract implementation', async () => {
      const implementation = {
        endpoints: [
          {
            path: '/auth/login',
            method: 'POST',
            request: {
              body: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
                required: ['email', 'password'],
              },
            },
            response: {
              '200': {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  refreshToken: { type: 'string' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        ],
      };

      const response = await apiHelper
        .authenticatedRequest(
          'post',
          `/api/v1/contracts/${restContract.id}/validate`,
          userFixtures.contributor.email
        )
        .send({ implementation })
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.errors).toHaveLength(0);
    });

    it('should detect missing endpoints in REST implementation', async () => {
      const incompleteImplementation = {
        endpoints: [
          // Missing the /auth/register endpoint defined in the contract
          {
            path: '/auth/login',
            method: 'POST',
            request: { body: {} },
            response: { '200': {} },
          },
        ],
      };

      const response = await apiHelper
        .authenticatedRequest(
          'post',
          `/api/v1/contracts/${restContract.id}/validate`,
          userFixtures.contributor.email
        )
        .send({ implementation: incompleteImplementation })
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors[0]).toContain('Missing endpoint');
    });

    it('should validate GraphQL contract implementation', async () => {
      const implementation = {
        typeDefs: `
          type User {
            id: ID!
            email: String!
            name: String
          }
          
          type Query {
            getUser(id: ID!): User
            listUsers(limit: Int, offset: Int): [User!]!
          }
          
          type Mutation {
            createUser(input: CreateUserInput!): User!
          }
          
          input CreateUserInput {
            email: String!
            password: String!
            name: String
          }
        `,
      };

      const response = await apiHelper
        .authenticatedRequest(
          'post',
          `/api/v1/contracts/${graphqlContract.id}/validate`,
          userFixtures.contributor.email
        )
        .send({ implementation })
        .expect(200);

      expect(response.body.valid).toBe(true);
    });

    it('should require authentication for validation', async () => {
      await request(app)
        .post(`/api/v1/contracts/${restContract.id}/validate`)
        .send({ implementation: {} })
        .expect(401);
    });
  });

  describe('PATCH /api/v1/contracts/:id', () => {
    let testContract: any;

    beforeEach(async () => {
      testContract = await contractService.create(
        {
          ...contractFixtures.restContract,
          providerId: testComponents.authService.id,
          consumerIds: [testComponents.apiGateway.id],
        },
        userFixtures.contributor.id
      );
    });

    it('should update contract properties', async () => {
      const updates = {
        status: 'ACTIVE',
        metadata: {
          ...testContract.metadata,
          updated: true,
          reviewedBy: userFixtures.contributor.email,
        },
        consumerIds: [testComponents.apiGateway.id, testComponents.database.id],
      };

      const response = await apiHelper
        .authenticatedRequest(
          'patch',
          `/api/v1/contracts/${testContract.id}`,
          userFixtures.contributor.email
        )
        .send(updates)
        .expect(200);

      expect(response.body.status).toBe('ACTIVE');
      expect(response.body.metadata.updated).toBe(true);
      expect(response.body.consumers).toHaveLength(2);
    });

    it('should update contract schema', async () => {
      const updatedSchema = {
        ...testContract.schema,
        endpoints: [
          ...testContract.schema.endpoints,
          {
            path: '/auth/logout',
            method: 'POST',
            request: {
              headers: {
                type: 'object',
                properties: {
                  Authorization: { type: 'string' },
                },
                required: ['Authorization'],
              },
            },
            response: {
              '200': {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                },
              },
            },
          },
        ],
      };

      const response = await apiHelper
        .authenticatedRequest(
          'patch',
          `/api/v1/contracts/${testContract.id}`,
          userFixtures.contributor.email
        )
        .send({ schema: updatedSchema })
        .expect(200);

      expect(response.body.schema.endpoints).toHaveLength(3);
    });

    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/v1/contracts/${testContract.id}`)
        .send({ status: 'ACTIVE' })
        .expect(401);
    });

    it('should require contributor or owner role', async () => {
      await apiHelper
        .authenticatedRequest(
          'patch',
          `/api/v1/contracts/${testContract.id}`,
          userFixtures.consumer.email
        )
        .send({ status: 'ACTIVE' })
        .expect(403);
    });

    it('should validate schema updates', async () => {
      const invalidSchema = {
        endpoints: 'not-an-array',
      };

      const response = await apiHelper
        .authenticatedRequest(
          'patch',
          `/api/v1/contracts/${testContract.id}`,
          userFixtures.contributor.email
        )
        .send({ schema: invalidSchema })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should handle version updates with new name:version:provider validation', async () => {
      const response = await apiHelper
        .authenticatedRequest(
          'patch',
          `/api/v1/contracts/${testContract.id}`,
          userFixtures.contributor.email
        )
        .send({ version: '2.0.0' })
        .expect(200);

      expect(response.body.version).toBe('2.0.0');
    });
  });

  describe('DELETE /api/v1/contracts/:id', () => {
    let testContract: any;

    beforeEach(async () => {
      testContract = await contractService.create(
        {
          ...contractFixtures.restContract,
          providerId: testComponents.authService.id,
          consumerIds: [testComponents.apiGateway.id],
        },
        userFixtures.contributor.id
      );
    });

    it('should delete contract with owner role', async () => {
      await apiHelper
        .authenticatedRequest(
          'delete',
          `/api/v1/contracts/${testContract.id}`,
          userFixtures.owner.email
        )
        .expect(204);

      // Verify deletion
      await apiHelper
        .authenticatedRequest(
          'get',
          `/api/v1/contracts/${testContract.id}`,
          userFixtures.consumer.email
        )
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app).delete(`/api/v1/contracts/${testContract.id}`).expect(401);
    });

    it('should require owner role', async () => {
      await apiHelper
        .authenticatedRequest(
          'delete',
          `/api/v1/contracts/${testContract.id}`,
          userFixtures.contributor.email
        )
        .expect(403);

      await apiHelper
        .authenticatedRequest(
          'delete',
          `/api/v1/contracts/${testContract.id}`,
          userFixtures.consumer.email
        )
        .expect(403);
    });

    it('should return 404 for non-existent contract', async () => {
      await apiHelper
        .authenticatedRequest(
          'delete',
          '/api/v1/contracts/non-existent-id',
          userFixtures.owner.email
        )
        .expect(404);
    });
  });

  describe('Contract Versioning and Compatibility', () => {
    it('should check compatibility between contract versions', async () => {
      // Create v1 contract
      const v1Contract = await contractService.create(
        {
          name: 'versioned-api',
          version: '1.0.0',
          type: 'REST',
          providerId: testComponents.authService.id,
          consumerIds: [testComponents.apiGateway.id],
          schema: {
            endpoints: [
              {
                path: '/users',
                method: 'GET',
                response: {
                  '200': {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        userFixtures.contributor.id
      );

      // Create v2 contract with breaking changes
      const v2Contract = await contractService.create(
        {
          name: 'versioned-api',
          version: '2.0.0',
          type: 'REST',
          providerId: testComponents.authService.id,
          consumerIds: [testComponents.apiGateway.id],
          schema: {
            endpoints: [
              {
                path: '/users',
                method: 'GET',
                response: {
                  '200': {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' }, // Breaking change: string -> number
                        fullName: { type: 'string' }, // Breaking change: renamed field
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        userFixtures.contributor.id
      );

      // Check compatibility
      const response = await apiHelper
        .authenticatedRequest(
          'post',
          '/api/v1/contracts/check-compatibility',
          userFixtures.contributor.email
        )
        .send({
          fromContractId: v1Contract.id,
          toContractId: v2Contract.id,
        })
        .expect(200);

      expect(response.body.compatible).toBe(false);
      expect(response.body.breakingChanges).toBeDefined();
      expect(response.body.breakingChanges.length).toBeGreaterThan(0);
    });

    it('should detect non-breaking changes', async () => {
      // Create v1 contract
      const v1Contract = await contractService.create(
        {
          name: 'compatible-api',
          version: '1.0.0',
          type: 'REST',
          providerId: testComponents.authService.id,
          consumerIds: [],
          schema: {
            endpoints: [
              {
                path: '/users',
                method: 'GET',
                response: {
                  '200': {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            ],
          },
        },
        userFixtures.contributor.id
      );

      // Create v1.1 contract with non-breaking changes
      const v11Contract = await contractService.create(
        {
          name: 'compatible-api',
          version: '1.1.0',
          type: 'REST',
          providerId: testComponents.authService.id,
          consumerIds: [],
          schema: {
            endpoints: [
              {
                path: '/users',
                method: 'GET',
                response: {
                  '200': {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      email: { type: 'string' }, // Added optional field
                    },
                  },
                },
              },
              {
                path: '/users/:id',
                method: 'GET', // New endpoint
                response: {
                  '200': {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            ],
          },
        },
        userFixtures.contributor.id
      );

      const response = await apiHelper
        .authenticatedRequest(
          'post',
          '/api/v1/contracts/check-compatibility',
          userFixtures.contributor.email
        )
        .send({
          fromContractId: v1Contract.id,
          toContractId: v11Contract.id,
        })
        .expect(200);

      expect(response.body.compatible).toBe(true);
      expect(response.body.breakingChanges).toHaveLength(0);
    });
  });

  describe('Contract Lifecycle', () => {
    it('should support full contract lifecycle', async () => {
      // 1. Create draft contract
      const draftContract = await apiHelper
        .authenticatedRequest('post', '/api/v1/contracts', userFixtures.contributor.email)
        .send({
          name: 'lifecycle-contract',
          version: '1.0.0',
          type: 'REST',
          providerId: testComponents.authService.id,
          consumerIds: [],
          schema: contractFixtures.restContract.schema,
        })
        .expect(201);

      expect(draftContract.body.status).toBe('DRAFT');

      // 2. Add consumers
      await apiHelper
        .authenticatedRequest(
          'patch',
          `/api/v1/contracts/${draftContract.body.id}`,
          userFixtures.contributor.email
        )
        .send({
          consumerIds: [testComponents.apiGateway.id],
        })
        .expect(200);

      // 3. Activate contract
      const activeContract = await apiHelper
        .authenticatedRequest(
          'patch',
          `/api/v1/contracts/${draftContract.body.id}`,
          userFixtures.contributor.email
        )
        .send({ status: 'ACTIVE' })
        .expect(200);

      expect(activeContract.body.status).toBe('ACTIVE');

      // 4. Create new version
      const v2Contract = await apiHelper
        .authenticatedRequest('post', '/api/v1/contracts', userFixtures.contributor.email)
        .send({
          name: 'lifecycle-contract',
          version: '2.0.0',
          type: 'REST',
          providerId: testComponents.authService.id,
          consumerIds: [testComponents.apiGateway.id],
          schema: {
            ...contractFixtures.restContract.schema,
            endpoints: [
              ...contractFixtures.restContract.schema.endpoints,
              {
                path: '/auth/verify',
                method: 'GET',
                response: { '200': { type: 'object' } },
              },
            ],
          },
        })
        .expect(201);

      // 5. Deprecate old version
      await apiHelper
        .authenticatedRequest(
          'patch',
          `/api/v1/contracts/${draftContract.body.id}`,
          userFixtures.contributor.email
        )
        .send({ status: 'DEPRECATED' })
        .expect(200);

      // 6. Verify both versions exist
      const allVersions = await apiHelper
        .authenticatedRequest('get', '/api/v1/contracts', userFixtures.consumer.email)
        .query({ search: 'lifecycle-contract' })
        .expect(200);

      expect(allVersions.body.data).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle circular consumer dependencies gracefully', async () => {
      // Component A provides to B, B provides to A
      const contractA = await contractService.create(
        {
          ...createContractFixture(),
          providerId: testComponents.authService.id,
          consumerIds: [testComponents.apiGateway.id],
        },
        userFixtures.contributor.id
      );

      const contractB = await apiHelper
        .authenticatedRequest('post', '/api/v1/contracts', userFixtures.contributor.email)
        .send({
          ...createContractFixture(),
          providerId: testComponents.apiGateway.id,
          consumerIds: [testComponents.authService.id],
        })
        .expect(201);

      // System should handle this without issues
      expect(contractB.body).toBeDefined();
    });

    it('should handle large contract schemas', async () => {
      const largeSchema = {
        endpoints: Array.from({ length: 100 }, (_, i) => ({
          path: `/endpoint-${i}`,
          method: 'GET',
          request: {
            query: {
              type: 'object',
              properties: {
                param1: { type: 'string' },
                param2: { type: 'number' },
                param3: { type: 'boolean' },
              },
            },
          },
          response: {
            '200': {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      value: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        })),
      };

      const response = await apiHelper
        .authenticatedRequest('post', '/api/v1/contracts', userFixtures.contributor.email)
        .send({
          name: 'large-contract',
          version: '1.0.0',
          type: 'REST',
          providerId: testComponents.authService.id,
          schema: largeSchema,
        })
        .expect(201);

      expect(response.body.schema.endpoints).toHaveLength(100);
    });

    it('should validate contract type matches schema structure', async () => {
      const response = await apiHelper
        .authenticatedRequest('post', '/api/v1/contracts', userFixtures.contributor.email)
        .send({
          name: 'mismatched-contract',
          version: '1.0.0',
          type: 'GRAPHQL', // Type says GraphQL
          providerId: testComponents.authService.id,
          schema: contractFixtures.restContract.schema, // But schema is REST
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid schema for contract type');
    });
  });
});
