/**
 * Integration tests for admin endpoints
 * Tests user management, audit logging, and system administration
 */

import request from 'supertest';
import { apiServer } from '../../src/api/server';
import { testDb } from '../utils/database';
import { ApiTestHelper, AuthTestUtils } from '../utils/helpers';
import { userFixtures, createUserFixture } from '../fixtures/users';
import { componentFixtures } from '../fixtures/components';
import { contractFixtures } from '../fixtures/contracts';
import { environmentFixtures } from '../fixtures/environments';

describe('Admin Endpoints', () => {
  let app: any;
  let apiHelper: ApiTestHelper;

  beforeAll(async () => {
    await testDb.setup();
    app = apiServer.getApp();
    apiHelper = new ApiTestHelper(app);
  });

  afterAll(async () => {
    await testDb.teardown();
  });

  beforeEach(async () => {
    await testDb.cleanDatabase();
    apiHelper.clearTokens();
  });

  describe('User Management - /api/v1/admin/users', () => {
    describe('GET /api/v1/admin/users', () => {
      beforeEach(async () => {
        // Create test users
        const users = [
          userFixtures.owner,
          userFixtures.maintainer,
          userFixtures.contributor,
          userFixtures.consumer,
          userFixtures.auditor
        ];

        for (const user of users) {
          await testDb.createUser(user);
        }
      });

      it('should list all users with owner role', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/users', userFixtures.owner)
          .expect(200);

        expect(response.body.data).toHaveLength(5);
        response.body.data.forEach((user: any) => {
          expect(user).toHaveProperty('id');
          expect(user).toHaveProperty('email');
          expect(user).toHaveProperty('role');
          expect(user).toHaveProperty('status');
          expect(user).not.toHaveProperty('password');
        });
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/v1/admin/users')
          .expect(401);
      });

      it('should require owner or auditor role', async () => {
        await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/users', userFixtures.maintainer)
          .expect(403);

        await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/users', userFixtures.contributor)
          .expect(403);

        await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/users', userFixtures.consumer)
          .expect(403);
      });

      it('should allow auditor role to view users', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/users', userFixtures.auditor)
          .expect(200);

        expect(response.body.data).toHaveLength(5);
      });

      it('should support pagination', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/users', userFixtures.owner)
          .query({ page: 1, limit: 2 })
          .expect(200);

        expect(response.body.data).toHaveLength(2);
        expect(response.body.pagination).toEqual({
          page: 1,
          limit: 2,
          total: 5,
          totalPages: 3
        });
      });

      it('should filter by role', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/users', userFixtures.owner)
          .query({ role: 'CONTRIBUTOR' })
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].role).toBe('CONTRIBUTOR');
      });

      it('should filter by status', async () => {
        // Create an inactive user
        await testDb.createUser({
          ...createUserFixture(),
          status: 'INACTIVE'
        });

        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/users', userFixtures.owner)
          .query({ status: 'INACTIVE' })
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].status).toBe('INACTIVE');
      });

      it('should search by email', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/users', userFixtures.owner)
          .query({ search: 'owner' })
          .expect(200);

        expect(response.body.data.length).toBeGreaterThan(0);
        response.body.data.forEach((user: any) => {
          expect(user.email.toLowerCase()).toContain('owner');
        });
      });

      it('should include user statistics', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/users', userFixtures.owner)
          .query({ includeStats: true })
          .expect(200);

        response.body.data.forEach((user: any) => {
          expect(user).toHaveProperty('stats');
          expect(user.stats).toHaveProperty('componentsCreated');
          expect(user.stats).toHaveProperty('contractsCreated');
          expect(user.stats).toHaveProperty('lastActive');
        });
      });
    });

    describe('GET /api/v1/admin/users/:id', () => {
      let testUser: any;

      beforeEach(async () => {
        testUser = await testDb.createUser(userFixtures.contributor);
      });

      it('should get user details with owner role', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', `/api/v1/admin/users/${testUser.id}`, userFixtures.owner)
          .expect(200);

        expect(response.body.data).toMatchObject({
          id: testUser.id,
          email: testUser.email,
          role: testUser.role,
          status: testUser.status
        });
        expect(response.body.data).not.toHaveProperty('password');
      });

      it('should include user activity', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', `/api/v1/admin/users/${testUser.id}`, userFixtures.owner)
          .query({ includeActivity: true })
          .expect(200);

        expect(response.body.data).toHaveProperty('activity');
        expect(response.body.data.activity).toHaveProperty('logins');
        expect(response.body.data.activity).toHaveProperty('apiCalls');
        expect(response.body.data.activity).toHaveProperty('resources');
      });

      it('should return 404 for non-existent user', async () => {
        await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/users/non-existent-id', userFixtures.owner)
          .expect(404);
      });
    });

    describe('PATCH /api/v1/admin/users/:id', () => {
      let testUser: any;

      beforeEach(async () => {
        testUser = await testDb.createUser(userFixtures.contributor);
      });

      it('should update user role with owner permission', async () => {
        const response = await apiHelper
          .authenticatedRequest('patch', `/api/v1/admin/users/${testUser.id}`, userFixtures.owner)
          .send({ role: 'MAINTAINER' })
          .expect(200);

        expect(response.body.data.role).toBe('MAINTAINER');
      });

      it('should update user status', async () => {
        const response = await apiHelper
          .authenticatedRequest('patch', `/api/v1/admin/users/${testUser.id}`, userFixtures.owner)
          .send({ status: 'INACTIVE' })
          .expect(200);

        expect(response.body.data.status).toBe('INACTIVE');
      });

      it('should not allow non-owners to update users', async () => {
        await apiHelper
          .authenticatedRequest('patch', `/api/v1/admin/users/${testUser.id}`, userFixtures.maintainer)
          .send({ role: 'OWNER' })
          .expect(403);
      });

      it('should prevent users from updating their own role', async () => {
        const ownerUser = await testDb.createUser(userFixtures.owner);
        
        await apiHelper
          .authenticatedRequest('patch', `/api/v1/admin/users/${ownerUser.id}`, userFixtures.owner)
          .send({ role: 'CONTRIBUTOR' })
          .expect(400);
      });

      it('should validate role values', async () => {
        const response = await apiHelper
          .authenticatedRequest('patch', `/api/v1/admin/users/${testUser.id}`, userFixtures.owner)
          .send({ role: 'INVALID_ROLE' })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });
    });

    describe('DELETE /api/v1/admin/users/:id', () => {
      let testUser: any;

      beforeEach(async () => {
        testUser = await testDb.createUser(userFixtures.consumer);
      });

      it('should soft delete user with owner permission', async () => {
        await apiHelper
          .authenticatedRequest('delete', `/api/v1/admin/users/${testUser.id}`, userFixtures.owner)
          .expect(200);

        // Verify user is soft deleted
        const response = await apiHelper
          .authenticatedRequest('get', `/api/v1/admin/users/${testUser.id}`, userFixtures.owner)
          .expect(200);

        expect(response.body.data.status).toBe('DELETED');
        expect(response.body.data.deletedAt).toBeDefined();
      });

      it('should prevent deleting owner accounts', async () => {
        const ownerUser = await testDb.createUser({
          ...createUserFixture(),
          role: 'OWNER'
        });

        await apiHelper
          .authenticatedRequest('delete', `/api/v1/admin/users/${ownerUser.id}`, userFixtures.owner)
          .expect(400);
      });

      it('should transfer ownership before deletion if needed', async () => {
        // Create components owned by the user
        await testDb.createComponent({
          ...componentFixtures.apiGateway,
          createdById: testUser.id
        });

        const response = await apiHelper
          .authenticatedRequest('delete', `/api/v1/admin/users/${testUser.id}`, userFixtures.owner)
          .query({ transferTo: userFixtures.maintainer.id })
          .expect(200);

        expect(response.body.data.transferredResources).toBeDefined();
        expect(response.body.data.transferredResources.components).toBe(1);
      });
    });
  });

  describe('Audit Logging - /api/v1/admin/audit', () => {
    beforeEach(async () => {
      // Create some audit events
      const events = [
        {
          userId: userFixtures.owner.id,
          action: 'USER_LOGIN',
          resource: 'auth',
          details: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' }
        },
        {
          userId: userFixtures.maintainer.id,
          action: 'COMPONENT_CREATE',
          resource: 'component',
          resourceId: 'comp-123',
          details: { name: 'api-gateway', version: '1.0.0' }
        },
        {
          userId: userFixtures.contributor.id,
          action: 'CONTRACT_UPDATE',
          resource: 'contract',
          resourceId: 'contract-456',
          details: { fields: ['schema', 'version'] }
        },
        {
          userId: userFixtures.owner.id,
          action: 'USER_DELETE',
          resource: 'user',
          resourceId: 'user-789',
          details: { deletedUser: 'test@example.com' }
        }
      ];

      for (const event of events) {
        await testDb.createAuditLog(event);
      }
    });

    describe('GET /api/v1/admin/audit', () => {
      it('should list audit logs with owner role', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/audit', userFixtures.owner)
          .expect(200);

        expect(response.body.data).toHaveLength(4);
        response.body.data.forEach((log: any) => {
          expect(log).toHaveProperty('id');
          expect(log).toHaveProperty('userId');
          expect(log).toHaveProperty('action');
          expect(log).toHaveProperty('resource');
          expect(log).toHaveProperty('timestamp');
          expect(log).toHaveProperty('details');
        });
      });

      it('should allow auditor role to view logs', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/audit', userFixtures.auditor)
          .expect(200);

        expect(response.body.data).toHaveLength(4);
      });

      it('should filter by action', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/audit', userFixtures.owner)
          .query({ action: 'COMPONENT_CREATE' })
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].action).toBe('COMPONENT_CREATE');
      });

      it('should filter by resource type', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/audit', userFixtures.owner)
          .query({ resource: 'contract' })
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].resource).toBe('contract');
      });

      it('should filter by user', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/audit', userFixtures.owner)
          .query({ userId: userFixtures.maintainer.id })
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].userId).toBe(userFixtures.maintainer.id);
      });

      it('should filter by date range', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/audit', userFixtures.owner)
          .query({
            startDate: yesterday.toISOString(),
            endDate: tomorrow.toISOString()
          })
          .expect(200);

        expect(response.body.data).toHaveLength(4);
      });

      it('should support pagination', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/audit', userFixtures.owner)
          .query({ page: 1, limit: 2 })
          .expect(200);

        expect(response.body.data).toHaveLength(2);
        expect(response.body.pagination).toBeDefined();
      });

      it('should include user details when requested', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/audit', userFixtures.owner)
          .query({ includeUser: true })
          .expect(200);

        response.body.data.forEach((log: any) => {
          expect(log).toHaveProperty('user');
          expect(log.user).toHaveProperty('email');
          expect(log.user).not.toHaveProperty('password');
        });
      });
    });

    describe('GET /api/v1/admin/audit/stats', () => {
      it('should get audit statistics', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/audit/stats', userFixtures.owner)
          .expect(200);

        expect(response.body.data).toHaveProperty('totalEvents');
        expect(response.body.data).toHaveProperty('eventsByAction');
        expect(response.body.data).toHaveProperty('eventsByResource');
        expect(response.body.data).toHaveProperty('topUsers');
        expect(response.body.data).toHaveProperty('timeline');
      });

      it('should filter statistics by date range', async () => {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);

        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/audit/stats', userFixtures.owner)
          .query({ startDate: lastWeek.toISOString() })
          .expect(200);

        expect(response.body.data.totalEvents).toBe(4);
      });
    });

    describe('POST /api/v1/admin/audit/export', () => {
      it('should export audit logs as CSV', async () => {
        const response = await apiHelper
          .authenticatedRequest('post', '/api/v1/admin/audit/export', userFixtures.owner)
          .send({
            format: 'csv',
            filters: {
              startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            }
          })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('audit-log');
      });

      it('should export audit logs as JSON', async () => {
        const response = await apiHelper
          .authenticatedRequest('post', '/api/v1/admin/audit/export', userFixtures.owner)
          .send({
            format: 'json',
            filters: {}
          })
          .expect(200);

        expect(response.headers['content-type']).toContain('application/json');
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('metadata');
      });

      it('should require owner or auditor role', async () => {
        await apiHelper
          .authenticatedRequest('post', '/api/v1/admin/audit/export', userFixtures.maintainer)
          .send({ format: 'csv' })
          .expect(403);
      });
    });
  });

  describe('System Administration - /api/v1/admin/system', () => {
    describe('GET /api/v1/admin/system/info', () => {
      it('should get system information with owner role', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/system/info', userFixtures.owner)
          .expect(200);

        expect(response.body.data).toHaveProperty('version');
        expect(response.body.data).toHaveProperty('environment');
        expect(response.body.data).toHaveProperty('uptime');
        expect(response.body.data).toHaveProperty('database');
        expect(response.body.data).toHaveProperty('resources');
      });

      it('should require owner role', async () => {
        await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/system/info', userFixtures.maintainer)
          .expect(403);

        await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/system/info', userFixtures.auditor)
          .expect(403);
      });
    });

    describe('GET /api/v1/admin/system/health', () => {
      it('should get system health status', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/system/health', userFixtures.owner)
          .expect(200);

        expect(response.body.data).toHaveProperty('status');
        expect(response.body.data).toHaveProperty('checks');
        expect(response.body.data.checks).toHaveProperty('database');
        expect(response.body.data.checks).toHaveProperty('cache');
        expect(response.body.data.checks).toHaveProperty('storage');
        expect(response.body.data.checks).toHaveProperty('api');
      });

      it('should include detailed metrics', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/system/health', userFixtures.owner)
          .query({ detailed: true })
          .expect(200);

        expect(response.body.data).toHaveProperty('metrics');
        expect(response.body.data.metrics).toHaveProperty('cpu');
        expect(response.body.data.metrics).toHaveProperty('memory');
        expect(response.body.data.metrics).toHaveProperty('disk');
        expect(response.body.data.metrics).toHaveProperty('network');
      });
    });

    describe('GET /api/v1/admin/system/stats', () => {
      it('should get system statistics', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/system/stats', userFixtures.owner)
          .expect(200);

        expect(response.body.data).toHaveProperty('users');
        expect(response.body.data).toHaveProperty('components');
        expect(response.body.data).toHaveProperty('contracts');
        expect(response.body.data).toHaveProperty('environments');
        expect(response.body.data).toHaveProperty('apiCalls');
        expect(response.body.data).toHaveProperty('storage');
      });

      it('should include growth metrics', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/system/stats', userFixtures.owner)
          .query({ includeGrowth: true })
          .expect(200);

        expect(response.body.data).toHaveProperty('growth');
        expect(response.body.data.growth).toHaveProperty('daily');
        expect(response.body.data.growth).toHaveProperty('weekly');
        expect(response.body.data.growth).toHaveProperty('monthly');
      });
    });

    describe('POST /api/v1/admin/system/maintenance', () => {
      it('should enable maintenance mode', async () => {
        const response = await apiHelper
          .authenticatedRequest('post', '/api/v1/admin/system/maintenance', userFixtures.owner)
          .send({
            enabled: true,
            message: 'System upgrade in progress',
            estimatedDuration: '2 hours'
          })
          .expect(200);

        expect(response.body.data).toHaveProperty('maintenanceMode', true);
        expect(response.body.data).toHaveProperty('message');
        expect(response.body.data).toHaveProperty('startedAt');
      });

      it('should disable maintenance mode', async () => {
        // First enable
        await apiHelper
          .authenticatedRequest('post', '/api/v1/admin/system/maintenance', userFixtures.owner)
          .send({ enabled: true })
          .expect(200);

        // Then disable
        const response = await apiHelper
          .authenticatedRequest('post', '/api/v1/admin/system/maintenance', userFixtures.owner)
          .send({ enabled: false })
          .expect(200);

        expect(response.body.data).toHaveProperty('maintenanceMode', false);
        expect(response.body.data).toHaveProperty('endedAt');
      });

      it('should require owner role', async () => {
        await apiHelper
          .authenticatedRequest('post', '/api/v1/admin/system/maintenance', userFixtures.maintainer)
          .send({ enabled: true })
          .expect(403);
      });
    });

    describe('POST /api/v1/admin/system/cache/clear', () => {
      it('should clear system cache', async () => {
        const response = await apiHelper
          .authenticatedRequest('post', '/api/v1/admin/system/cache/clear', userFixtures.owner)
          .send({ targets: ['api', 'database'] })
          .expect(200);

        expect(response.body.data).toHaveProperty('cleared');
        expect(response.body.data.cleared).toContain('api');
        expect(response.body.data.cleared).toContain('database');
        expect(response.body.data).toHaveProperty('timestamp');
      });

      it('should clear all caches when no targets specified', async () => {
        const response = await apiHelper
          .authenticatedRequest('post', '/api/v1/admin/system/cache/clear', userFixtures.owner)
          .send({})
          .expect(200);

        expect(response.body.data.cleared).toContain('all');
      });
    });

    describe('GET /api/v1/admin/system/config', () => {
      it('should get system configuration', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/system/config', userFixtures.owner)
          .expect(200);

        expect(response.body.data).toHaveProperty('features');
        expect(response.body.data).toHaveProperty('limits');
        expect(response.body.data).toHaveProperty('security');
        expect(response.body.data).not.toHaveProperty('secrets');
      });

      it('should mask sensitive values', async () => {
        const response = await apiHelper
          .authenticatedRequest('get', '/api/v1/admin/system/config', userFixtures.owner)
          .expect(200);

        const configStr = JSON.stringify(response.body.data);
        expect(configStr).not.toContain('password');
        expect(configStr).not.toContain('secret');
        expect(configStr).not.toContain('key');
      });
    });

    describe('PATCH /api/v1/admin/system/config', () => {
      it('should update system configuration', async () => {
        const response = await apiHelper
          .authenticatedRequest('patch', '/api/v1/admin/system/config', userFixtures.owner)
          .send({
            features: {
              enableRegistration: false,
              requireEmailVerification: true
            },
            limits: {
              maxComponentsPerUser: 100,
              maxContractsPerComponent: 10
            }
          })
          .expect(200);

        expect(response.body.data.features.enableRegistration).toBe(false);
        expect(response.body.data.features.requireEmailVerification).toBe(true);
        expect(response.body.data.limits.maxComponentsPerUser).toBe(100);
      });

      it('should validate configuration values', async () => {
        const response = await apiHelper
          .authenticatedRequest('patch', '/api/v1/admin/system/config', userFixtures.owner)
          .send({
            limits: {
              maxComponentsPerUser: -1, // Invalid
              maxContractsPerComponent: 'invalid' // Invalid type
            }
          })
          .expect(400);

        expect(response.body.errors).toBeDefined();
      });

      it('should create backup before updating', async () => {
        const response = await apiHelper
          .authenticatedRequest('patch', '/api/v1/admin/system/config', userFixtures.owner)
          .send({
            features: { enableDebugMode: true }
          })
          .expect(200);

        expect(response.body.data).toHaveProperty('backupId');
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should enforce proper access control across all admin endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/v1/admin/users', allowedRoles: ['OWNER', 'AUDITOR'] },
        { method: 'patch', path: '/api/v1/admin/users/123', allowedRoles: ['OWNER'] },
        { method: 'delete', path: '/api/v1/admin/users/123', allowedRoles: ['OWNER'] },
        { method: 'get', path: '/api/v1/admin/audit', allowedRoles: ['OWNER', 'AUDITOR'] },
        { method: 'get', path: '/api/v1/admin/system/info', allowedRoles: ['OWNER'] },
        { method: 'post', path: '/api/v1/admin/system/maintenance', allowedRoles: ['OWNER'] }
      ];

      const roles = ['OWNER', 'MAINTAINER', 'CONTRIBUTOR', 'CONSUMER', 'AUDITOR'];

      for (const endpoint of endpoints) {
        for (const role of roles) {
          const user = userFixtures[role.toLowerCase()];
          const expectedStatus = endpoint.allowedRoles.includes(role) ? 200 : 403;

          // Skip actual data modification for testing
          if (endpoint.method === 'delete' || endpoint.method === 'patch') {
            continue;
          }

          const response = await apiHelper
            .authenticatedRequest(endpoint.method, endpoint.path, user);

          if (expectedStatus === 403) {
            expect(response.status).toBe(403);
          }
        }
      }
    });
  });

  describe('Admin Dashboard Data', () => {
    beforeEach(async () => {
      // Create sample data for dashboard
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      // Create users with different registration dates
      await testDb.createUser({ ...userFixtures.owner, createdAt: lastWeek });
      await testDb.createUser({ ...userFixtures.maintainer, createdAt: yesterday });
      await testDb.createUser({ ...userFixtures.contributor, createdAt: new Date() });

      // Create components
      await testDb.createComponent({
        ...componentFixtures.apiGateway,
        createdById: userFixtures.owner.id,
        createdAt: yesterday
      });
      await testDb.createComponent({
        ...componentFixtures.authService,
        createdById: userFixtures.maintainer.id,
        createdAt: new Date()
      });

      // Create audit events
      await testDb.createAuditLog({
        userId: userFixtures.owner.id,
        action: 'USER_LOGIN',
        resource: 'auth',
        timestamp: yesterday
      });
    });

    it('should get comprehensive dashboard data', async () => {
      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/admin/dashboard', userFixtures.owner)
        .expect(200);

      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary).toHaveProperty('totalUsers', 3);
      expect(response.body.data.summary).toHaveProperty('totalComponents', 2);
      expect(response.body.data.summary).toHaveProperty('activeUsers');
      
      expect(response.body.data).toHaveProperty('trends');
      expect(response.body.data.trends).toHaveProperty('userGrowth');
      expect(response.body.data.trends).toHaveProperty('componentGrowth');
      
      expect(response.body.data).toHaveProperty('recentActivity');
      expect(response.body.data).toHaveProperty('systemStatus');
    });

    it('should filter dashboard data by date range', async () => {
      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/admin/dashboard', userFixtures.owner)
        .query({
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        })
        .expect(200);

      expect(response.body.data.summary.totalUsers).toBe(2); // Only users from last 24h
      expect(response.body.data.summary.totalComponents).toBe(1); // Only components from last 24h
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Temporarily disconnect database
      await testDb.disconnect();

      const response = await apiHelper
        .authenticatedRequest('get', '/api/v1/admin/users', userFixtures.owner)
        .expect(500);

      expect(response.body.error).toBeDefined();

      // Reconnect for cleanup
      await testDb.connect();
    });

    it('should handle concurrent admin operations', async () => {
      const operations = [
        apiHelper.authenticatedRequest('get', '/api/v1/admin/users', userFixtures.owner),
        apiHelper.authenticatedRequest('get', '/api/v1/admin/audit', userFixtures.auditor),
        apiHelper.authenticatedRequest('get', '/api/v1/admin/system/stats', userFixtures.owner),
        apiHelper.authenticatedRequest('get', '/api/v1/admin/dashboard', userFixtures.owner)
      ];

      const results = await Promise.allSettled(operations);
      const successful = results.filter(r => r.status === 'fulfilled');
      
      expect(successful.length).toBe(4);
    });

    it('should rate limit admin endpoints', async () => {
      // Make multiple rapid requests
      const requests = Array(20).fill(null).map(() => 
        apiHelper.authenticatedRequest('get', '/api/v1/admin/users', userFixtures.owner)
      );

      const results = await Promise.allSettled(requests);
      const rateLimited = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      );

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});