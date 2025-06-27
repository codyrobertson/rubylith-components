/**
 * Integration tests for environment endpoints
 * Tests environment CRUD operations and health monitoring
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { apiServer } from '../../src/api/server';
import { testDb } from '../utils/database';
import { ApiTestHelper, AuthTestUtils, ValidationTestUtils } from '../utils/helpers';
import { userFixtures } from '../fixtures/users';
import { environmentFixtures, createEnvironmentFixture, EnvironmentFixtureFactory } from '../fixtures/environments';

describe('Environment Endpoints', () => {
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

  describe('POST /api/v1/environments', () => {
    const endpoint = '/api/v1/environments';

    it('should create a new environment with valid data', async () => {
      const envData = environmentFixtures.production;

      const response = await apiHelper
        .authenticatedRequest('post', endpoint, userFixtures.owner)
        .send(envData)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      const { data } = response.body;
      
      expect(data.name).toBe(envData.name);
      expect(data.version).toBe(envData.version);
      expect(data.provider).toBe(envData.provider);
      expect(data.status).toBe(envData.status);
      expect(data.deploymentTarget).toBe(envData.deploymentTarget);
      expect(data.deploymentConfig).toEqual(envData.deploymentConfig);
      expect(data.resourceLimits).toEqual(envData.resourceLimits);
      expect(data.capabilities).toEqual(envData.capabilities);
      expect(data.id).toBeDefined();
      expect(data.createdAt).toBeDefined();
    });

    it('should reject environment creation without authentication', async () => {
      const envData = environmentFixtures.staging;

      const response = await request(app)
        .post(endpoint)
        .send(envData)
        .expect(401);

      expect(response.body.error).toContain('Authentication required');
    });

    it('should require developer role or higher', async () => {
      const envData = environmentFixtures.development;

      const response = await apiHelper
        .authenticatedRequest('post', endpoint, userFixtures.consumer)
        .send(envData)
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '', // Empty name
        version: 'invalid-version', // Invalid semantic version
        provider: '', // Empty provider
        status: 'INVALID', // Invalid status
      };

      const response = await apiHelper
        .authenticatedRequest('post', endpoint, userFixtures.maintainer)
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(3);
    });

    it('should prevent duplicate name:version combination', async () => {
      const envData = environmentFixtures.production;

      // Create first environment
      await apiHelper
        .authenticatedRequest('post', endpoint, userFixtures.owner)
        .send(envData)
        .expect(201);

      // Try to create duplicate
      const response = await apiHelper
        .authenticatedRequest('post', endpoint, userFixtures.owner)
        .send(envData)
        .expect(409);

      expect(response.body.error).toContain('Environment with this name and version already exists');
    });

    it('should handle complex deployment configurations', async () => {
      const complexEnv = createEnvironmentFixture({
        deploymentConfig: {
          kubernetes: {
            namespace: 'production',
            replicas: 3,
            resources: {
              requests: { cpu: '100m', memory: '256Mi' },
              limits: { cpu: '1000m', memory: '1Gi' }
            },
            nodeSelector: { 'node-type': 'compute-optimized' },
            tolerations: [{ key: 'production', operator: 'Equal', value: 'true' }],
            affinity: {
              podAntiAffinity: {
                requiredDuringSchedulingIgnoredDuringExecution: [{
                  labelSelector: { matchLabels: { app: 'api-gateway' } },
                  topologyKey: 'kubernetes.io/hostname'
                }]
              }
            }
          },
          envVars: {
            NODE_ENV: 'production',
            LOG_LEVEL: 'info',
            ENABLE_METRICS: 'true'
          },
          secrets: ['db-credentials', 'api-keys', 'tls-certs']
        }
      });

      const response = await apiHelper
        .authenticatedRequest('post', endpoint, userFixtures.maintainer)
        .send(complexEnv)
        .expect(201);

      expect(response.body.data.deploymentConfig).toEqual(complexEnv.deploymentConfig);
    });
  });

  describe('GET /api/v1/environments', () => {
    const endpoint = '/api/v1/environments';

    beforeEach(async () => {
      // Create multiple environments
      const environments = [
        { ...environmentFixtures.production, createdById: userFixtures.owner.id },
        { ...environmentFixtures.staging, createdById: userFixtures.maintainer.id },
        { ...environmentFixtures.development, createdById: userFixtures.contributor.id },
        { ...createEnvironmentFixture({ status: 'DEGRADED' }), createdById: userFixtures.owner.id },
        { ...createEnvironmentFixture({ status: 'MAINTENANCE' }), createdById: userFixtures.maintainer.id }
      ];

      for (const env of environments) {
        await testDb.createEnvironment(env);
      }
    });

    it('should list all environments with pagination', async () => {
      const response = await request(app)
        .get(endpoint)
        .query({ page: 1, limit: 3 })
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 3,
        total: 5,
        totalPages: 2
      });
    });

    it('should filter environments by status', async () => {
      const response = await request(app)
        .get(endpoint)
        .query({ status: 'HEALTHY' })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((env: any) => {
        expect(env.status).toBe('HEALTHY');
      });
    });

    it('should filter environments by provider', async () => {
      const response = await request(app)
        .get(endpoint)
        .query({ provider: 'AWS' })
        .expect(200);

      response.body.data.forEach((env: any) => {
        expect(env.provider).toBe('AWS');
      });
    });

    it('should filter environments by deployment target', async () => {
      const response = await request(app)
        .get(endpoint)
        .query({ deploymentTarget: 'kubernetes' })
        .expect(200);

      response.body.data.forEach((env: any) => {
        expect(env.deploymentTarget).toBe('kubernetes');
      });
    });

    it('should search environments by name', async () => {
      const response = await request(app)
        .get(endpoint)
        .query({ search: 'prod' })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((env: any) => {
        expect(env.name.toLowerCase()).toContain('prod');
      });
    });

    it('should sort environments', async () => {
      const response = await request(app)
        .get(endpoint)
        .query({ sortBy: 'createdAt', sortOrder: 'desc' })
        .expect(200);

      for (let i = 1; i < response.body.data.length; i++) {
        const prev = new Date(response.body.data[i - 1].createdAt);
        const curr = new Date(response.body.data[i].createdAt);
        expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
      }
    });

    it('should include creator information when requested', async () => {
      const response = await request(app)
        .get(endpoint)
        .query({ includeCreator: true })
        .expect(200);

      response.body.data.forEach((env: any) => {
        expect(env.createdBy).toBeDefined();
        expect(env.createdBy.email).toBeDefined();
        expect(env.createdBy.password).toBeUndefined();
      });
    });

    it('should work without authentication for public access', async () => {
      const response = await request(app)
        .get(endpoint)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/environments/:id', () => {
    let testEnvironment: any;

    beforeEach(async () => {
      testEnvironment = await testDb.createEnvironment({
        ...environmentFixtures.production,
        createdById: userFixtures.owner.id
      });
    });

    it('should retrieve environment by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/environments/${testEnvironment.id}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: testEnvironment.id,
        name: testEnvironment.name,
        version: testEnvironment.version,
        provider: testEnvironment.provider,
        status: testEnvironment.status
      });
    });

    it('should retrieve environment by name:version', async () => {
      const nameVersion = `${testEnvironment.name}:${testEnvironment.version}`;
      const response = await request(app)
        .get(`/api/v1/environments/${encodeURIComponent(nameVersion)}`)
        .expect(200);

      expect(response.body.data.id).toBe(testEnvironment.id);
    });

    it('should return 404 for non-existent environment', async () => {
      const response = await request(app)
        .get('/api/v1/environments/non-existent-id')
        .expect(404);

      expect(response.body.error).toContain('Environment not found');
    });

    it('should include related data when requested', async () => {
      const response = await request(app)
        .get(`/api/v1/environments/${testEnvironment.id}`)
        .query({ includeCreator: true, includeComponents: true })
        .expect(200);

      expect(response.body.data.createdBy).toBeDefined();
      expect(response.body.data.components).toBeDefined();
      expect(Array.isArray(response.body.data.components)).toBe(true);
    });

    it('should work without authentication for public access', async () => {
      await request(app)
        .get(`/api/v1/environments/${testEnvironment.id}`)
        .expect(200);
    });
  });

  describe('PATCH /api/v1/environments/:id', () => {
    let testEnvironment: any;

    beforeEach(async () => {
      testEnvironment = await testDb.createEnvironment({
        ...environmentFixtures.staging,
        createdById: userFixtures.maintainer.id
      });
    });

    it('should update environment properties', async () => {
      const updates = {
        status: 'DEGRADED',
        deploymentConfig: {
          ...testEnvironment.deploymentConfig,
          replicas: 1,
          healthCheck: {
            enabled: true,
            interval: 30,
            timeout: 10
          }
        },
        metadata: {
          ...testEnvironment.metadata,
          lastHealthCheck: new Date().toISOString(),
          alerts: ['High CPU usage detected']
        }
      };

      const response = await apiHelper
        .authenticatedRequest('patch', `/api/v1/environments/${testEnvironment.id}`, userFixtures.maintainer)
        .send(updates)
        .expect(200);

      expect(response.body.data.status).toBe('DEGRADED');
      expect(response.body.data.deploymentConfig.healthCheck).toEqual(updates.deploymentConfig.healthCheck);
      expect(response.body.data.metadata.alerts).toEqual(updates.metadata.alerts);
      expect(response.body.data.updatedAt).not.toBe(testEnvironment.updatedAt);
    });

    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/v1/environments/${testEnvironment.id}`)
        .send({ status: 'HEALTHY' })
        .expect(401);
    });

    it('should require developer role or higher', async () => {
      const response = await apiHelper
        .authenticatedRequest('patch', `/api/v1/environments/${testEnvironment.id}`, userFixtures.consumer)
        .send({ status: 'HEALTHY' })
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should validate update data', async () => {
      const invalidUpdates = {
        status: 'INVALID_STATUS',
        version: 'not-a-version',
        resourceLimits: {
          cpu: 'invalid',
          memory: -1
        }
      };

      const response = await apiHelper
        .authenticatedRequest('patch', `/api/v1/environments/${testEnvironment.id}`, userFixtures.maintainer)
        .send(invalidUpdates)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should prevent updating to duplicate name:version', async () => {
      // Create another environment
      const anotherEnv = await testDb.createEnvironment({
        ...createEnvironmentFixture(),
        createdById: userFixtures.owner.id
      });

      // Try to update to existing name:version
      const response = await apiHelper
        .authenticatedRequest('patch', `/api/v1/environments/${anotherEnv.id}`, userFixtures.owner)
        .send({
          name: testEnvironment.name,
          version: testEnvironment.version
        })
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });

    it('should handle partial updates', async () => {
      const response = await apiHelper
        .authenticatedRequest('patch', `/api/v1/environments/${testEnvironment.id}`, userFixtures.maintainer)
        .send({ status: 'MAINTENANCE' })
        .expect(200);

      expect(response.body.data.status).toBe('MAINTENANCE');
      expect(response.body.data.name).toBe(testEnvironment.name);
      expect(response.body.data.version).toBe(testEnvironment.version);
    });

    it('should update health status', async () => {
      const healthUpdate = {
        status: 'UNHEALTHY',
        metadata: {
          ...testEnvironment.metadata,
          healthMetrics: {
            cpu: 95,
            memory: 88,
            disk: 92,
            networkLatency: 250
          },
          lastIncident: {
            timestamp: new Date().toISOString(),
            severity: 'critical',
            message: 'Database connection timeout'
          }
        }
      };

      const response = await apiHelper
        .authenticatedRequest('patch', `/api/v1/environments/${testEnvironment.id}`, userFixtures.maintainer)
        .send(healthUpdate)
        .expect(200);

      expect(response.body.data.status).toBe('UNHEALTHY');
      expect(response.body.data.metadata.healthMetrics).toEqual(healthUpdate.metadata.healthMetrics);
      expect(response.body.data.metadata.lastIncident).toEqual(healthUpdate.metadata.lastIncident);
    });
  });

  describe('DELETE /api/v1/environments/:id', () => {
    let testEnvironment: any;

    beforeEach(async () => {
      testEnvironment = await testDb.createEnvironment({
        ...environmentFixtures.development,
        createdById: userFixtures.owner.id
      });
    });

    it('should delete environment with owner role', async () => {
      await apiHelper
        .authenticatedRequest('delete', `/api/v1/environments/${testEnvironment.id}`, userFixtures.owner)
        .expect(204);

      // Verify deletion
      await request(app)
        .get(`/api/v1/environments/${testEnvironment.id}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/v1/environments/${testEnvironment.id}`)
        .expect(401);
    });

    it('should require owner role', async () => {
      await apiHelper
        .authenticatedRequest('delete', `/api/v1/environments/${testEnvironment.id}`, userFixtures.maintainer)
        .expect(403);

      await apiHelper
        .authenticatedRequest('delete', `/api/v1/environments/${testEnvironment.id}`, userFixtures.contributor)
        .expect(403);

      await apiHelper
        .authenticatedRequest('delete', `/api/v1/environments/${testEnvironment.id}`, userFixtures.consumer)
        .expect(403);
    });

    it('should return 404 for non-existent environment', async () => {
      await apiHelper
        .authenticatedRequest('delete', '/api/v1/environments/non-existent-id', userFixtures.owner)
        .expect(404);
    });

    it('should handle cascade deletion with components', async () => {
      // Create environment with associated components
      // This would be tested if we had component-environment relationships set up
      await apiHelper
        .authenticatedRequest('delete', `/api/v1/environments/${testEnvironment.id}`, userFixtures.owner)
        .expect(204);
    });
  });

  describe('Environment Health Monitoring', () => {
    let healthyEnv: any;
    let unhealthyEnv: any;

    beforeEach(async () => {
      healthyEnv = await testDb.createEnvironment({
        ...environmentFixtures.production,
        status: 'HEALTHY',
        createdById: userFixtures.owner.id
      });

      unhealthyEnv = await testDb.createEnvironment({
        ...createEnvironmentFixture({ 
          name: 'unhealthy-env',
          status: 'UNHEALTHY',
          metadata: {
            healthMetrics: {
              cpu: 98,
              memory: 95,
              disk: 89,
              networkLatency: 500
            }
          }
        }),
        createdById: userFixtures.owner.id
      });
    });

    it('should get environment health status', async () => {
      const response = await request(app)
        .get(`/api/v1/environments/${healthyEnv.id}/health`)
        .expect(200);

      expect(response.body.data).toHaveProperty('status', 'HEALTHY');
      expect(response.body.data).toHaveProperty('lastChecked');
      expect(response.body.data).toHaveProperty('metrics');
    });

    it('should update environment health metrics', async () => {
      const healthData = {
        metrics: {
          cpu: 45,
          memory: 62,
          disk: 35,
          networkLatency: 20,
          activeConnections: 125,
          requestsPerSecond: 850
        },
        checks: {
          database: { status: 'healthy', latency: 5 },
          cache: { status: 'healthy', latency: 2 },
          messageQueue: { status: 'healthy', lag: 0 }
        }
      };

      const response = await apiHelper
        .authenticatedRequest('put', `/api/v1/environments/${healthyEnv.id}/health`, userFixtures.maintainer)
        .send(healthData)
        .expect(200);

      expect(response.body.data.metrics).toEqual(healthData.metrics);
      expect(response.body.data.checks).toEqual(healthData.checks);
      expect(response.body.data.status).toBe('HEALTHY');
    });

    it('should automatically set status to DEGRADED based on metrics', async () => {
      const degradedMetrics = {
        metrics: {
          cpu: 85,
          memory: 78,
          disk: 70,
          networkLatency: 150
        }
      };

      const response = await apiHelper
        .authenticatedRequest('put', `/api/v1/environments/${healthyEnv.id}/health`, userFixtures.maintainer)
        .send(degradedMetrics)
        .expect(200);

      expect(response.body.data.status).toBe('DEGRADED');
    });

    it('should automatically set status to UNHEALTHY based on metrics', async () => {
      const unhealthyMetrics = {
        metrics: {
          cpu: 95,
          memory: 92,
          disk: 88,
          networkLatency: 300
        },
        checks: {
          database: { status: 'unhealthy', latency: 1000, error: 'Connection timeout' }
        }
      };

      const response = await apiHelper
        .authenticatedRequest('put', `/api/v1/environments/${healthyEnv.id}/health`, userFixtures.maintainer)
        .send(unhealthyMetrics)
        .expect(200);

      expect(response.body.data.status).toBe('UNHEALTHY');
    });
  });

  describe('Environment Capability Management', () => {
    let testEnvironment: any;

    beforeEach(async () => {
      testEnvironment = await testDb.createEnvironment({
        ...environmentFixtures.production,
        capabilities: ['auto-scaling', 'load-balancing', 'ssl-termination'],
        createdById: userFixtures.owner.id
      });
    });

    it('should list environment capabilities', async () => {
      const response = await request(app)
        .get(`/api/v1/environments/${testEnvironment.id}/capabilities`)
        .expect(200);

      expect(response.body.data).toEqual(testEnvironment.capabilities);
    });

    it('should add new capabilities', async () => {
      const newCapabilities = ['monitoring', 'alerting'];

      const response = await apiHelper
        .authenticatedRequest('post', `/api/v1/environments/${testEnvironment.id}/capabilities`, userFixtures.maintainer)
        .send({ capabilities: newCapabilities })
        .expect(200);

      expect(response.body.data).toContain('monitoring');
      expect(response.body.data).toContain('alerting');
      expect(response.body.data).toContain('auto-scaling');
      expect(response.body.data.length).toBe(5);
    });

    it('should remove capabilities', async () => {
      const response = await apiHelper
        .authenticatedRequest('delete', `/api/v1/environments/${testEnvironment.id}/capabilities`, userFixtures.maintainer)
        .send({ capabilities: ['ssl-termination'] })
        .expect(200);

      expect(response.body.data).not.toContain('ssl-termination');
      expect(response.body.data).toContain('auto-scaling');
      expect(response.body.data).toContain('load-balancing');
    });

    it('should validate capability names', async () => {
      const response = await apiHelper
        .authenticatedRequest('post', `/api/v1/environments/${testEnvironment.id}/capabilities`, userFixtures.maintainer)
        .send({ capabilities: ['', 'valid-capability', '123-invalid'] })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should require authentication for capability management', async () => {
      await request(app)
        .post(`/api/v1/environments/${testEnvironment.id}/capabilities`)
        .send({ capabilities: ['new-capability'] })
        .expect(401);
    });
  });

  describe('Environment Status Transitions', () => {
    let testEnvironment: any;

    beforeEach(async () => {
      testEnvironment = await testDb.createEnvironment({
        ...environmentFixtures.staging,
        status: 'HEALTHY',
        createdById: userFixtures.owner.id
      });
    });

    it('should transition from HEALTHY to MAINTENANCE', async () => {
      const response = await apiHelper
        .authenticatedRequest('patch', `/api/v1/environments/${testEnvironment.id}`, userFixtures.maintainer)
        .send({ 
          status: 'MAINTENANCE',
          metadata: {
            ...testEnvironment.metadata,
            maintenanceWindow: {
              start: new Date().toISOString(),
              estimatedDuration: '2 hours',
              reason: 'System upgrade'
            }
          }
        })
        .expect(200);

      expect(response.body.data.status).toBe('MAINTENANCE');
      expect(response.body.data.metadata.maintenanceWindow).toBeDefined();
    });

    it('should track status history', async () => {
      // Update status multiple times
      const statusChanges = ['DEGRADED', 'UNHEALTHY', 'MAINTENANCE', 'HEALTHY'];
      
      for (const status of statusChanges) {
        await apiHelper
          .authenticatedRequest('patch', `/api/v1/environments/${testEnvironment.id}`, userFixtures.maintainer)
          .send({ status })
          .expect(200);
      }

      const response = await request(app)
        .get(`/api/v1/environments/${testEnvironment.id}/status-history`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(statusChanges.length);
      expect(response.body.data[0].status).toBe('HEALTHY');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily disconnect the database
      await testDb.disconnect();

      const response = await request(app)
        .get('/api/v1/environments')
        .expect(500);

      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain('Database');

      // Reconnect for cleanup
      await testDb.connect();
    });

    it('should handle malformed JSON', async () => {
      const response = await apiHelper
        .authenticatedRequest('post', '/api/v1/environments', userFixtures.maintainer)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.error).toContain('Invalid JSON');
    });

    it('should handle large payloads', async () => {
      const largeConfig = {
        ...environmentFixtures.production,
        deploymentConfig: {
          data: 'x'.repeat(1000000) // 1MB of data
        }
      };

      const response = await apiHelper
        .authenticatedRequest('post', '/api/v1/environments', userFixtures.owner)
        .send(largeConfig)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle concurrent updates gracefully', async () => {
      const env = await testDb.createEnvironment({
        ...environmentFixtures.staging,
        createdById: userFixtures.owner.id
      });

      // Simulate concurrent updates
      const updates = Array(5).fill(null).map((_, i) => 
        apiHelper
          .authenticatedRequest('patch', `/api/v1/environments/${env.id}`, userFixtures.maintainer)
          .send({ metadata: { updateNumber: i } })
      );

      const results = await Promise.allSettled(updates);
      const successful = results.filter(r => r.status === 'fulfilled');
      
      expect(successful.length).toBeGreaterThan(0);
    });
  });
});