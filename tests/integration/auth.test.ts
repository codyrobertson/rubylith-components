/**
 * Integration tests for authentication endpoints
 * Tests user registration, login, token refresh, and logout
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { apiServer } from '../../src/api/server';
import { testDb } from '../utils/database';
import { ApiTestHelper, AuthTestUtils, ValidationTestUtils } from '../utils/helpers';
import { userFixtures, loginFixtures, registrationFixtures, invalidUserFixtures, UserFixtureFactory } from '../fixtures/users';

describe('Authentication Endpoints', () => {
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

  describe('POST /api/v1/public/auth/register', () => {
    const endpoint = '/api/v1/public/auth/register';

    it('should register a new user with valid data', async () => {
      const userData = registrationFixtures.validUser;

      const response = await request(app)
        .post(endpoint)
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');

      const { user, tokens } = response.body.data;
      
      ValidationTestUtils.assertUserStructure(user);
      expect(user.email).toBe(userData.email.toLowerCase());
      expect(user.name).toBe(userData.name);
      expect(user.role).toBe('CONTRIBUTOR'); // Default role
      expect(user.isActive).toBe(true);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(typeof tokens.expiresIn).toBe('number');
    });

    it('should handle email case insensitivity', async () => {
      const userData = {
        email: 'TEST@EXAMPLE.COM',
        password: 'SecurePassword123!',
        name: 'Test User',
      };

      const response = await request(app)
        .post(endpoint)
        .send(userData)
        .expect(201);

      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should split name into firstName and lastName', async () => {
      const testCases = [
        { name: 'John Doe', expected: { firstName: 'John', lastName: 'Doe' } },
        { name: 'John', expected: { firstName: 'John', lastName: '' } },
        { name: 'John Michael Doe', expected: { firstName: 'John', lastName: 'Michael Doe' } },
        { name: '  John   Doe  ', expected: { firstName: 'John', lastName: 'Doe' } },
      ];

      for (const testCase of testCases) {
        await testDb.cleanDatabase();
        
        const response = await request(app)
          .post(endpoint)
          .send({
            email: `${Math.random()}@test.com`,
            password: 'SecurePassword123!',
            name: testCase.name,
          })
          .expect(201);

        expect(response.body.data.user.firstName).toBe(testCase.expected.firstName);
        expect(response.body.data.user.lastName).toBe(testCase.expected.lastName);
      }
    });

    it('should fail with duplicate email', async () => {
      // First registration
      await request(app)
        .post(endpoint)
        .send(registrationFixtures.validUser)
        .expect(201);

      // Duplicate registration
      const response = await request(app)
        .post(endpoint)
        .send(registrationFixtures.duplicateEmail)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('CONFLICT');
      expect(response.body.error.message).toContain('already exists');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post(endpoint)
        .send(registrationFixtures.invalidEmail)
        .expect(400);

      ValidationTestUtils.assertErrorResponseStructure(response.body);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveProperty('email');
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post(endpoint)
        .send(registrationFixtures.weakPassword)
        .expect(400);

      ValidationTestUtils.assertErrorResponseStructure(response.body);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveProperty('password');
    });

    it('should validate required fields', async () => {
      const testCases = [
        { payload: invalidUserFixtures.missingEmail, missingField: 'email' },
        { payload: invalidUserFixtures.missingPassword, missingField: 'password' },
        { payload: invalidUserFixtures.missingName, missingField: 'name' },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post(endpoint)
          .send(testCase.payload)
          .expect(400);

        ValidationTestUtils.assertErrorResponseStructure(response.body);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details).toHaveProperty(testCase.missingField);
      }
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post(endpoint)
        .send({})
        .expect(400);

      ValidationTestUtils.assertErrorResponseStructure(response.body);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should sanitize input against XSS', async () => {
      const response = await request(app)
        .post(endpoint)
        .send(invalidUserFixtures.xssAttempt)
        .expect(201);

      // Should register successfully but sanitize the name
      expect(response.body.data.user.name).not.toContain('<script>');
    });

    it('should handle very long names', async () => {
      const response = await request(app)
        .post(endpoint)
        .send(registrationFixtures.longName)
        .expect(400);

      ValidationTestUtils.assertErrorResponseStructure(response.body);
    });
  });

  describe('POST /api/v1/public/auth/login', () => {
    const endpoint = '/api/v1/public/auth/login';

    beforeEach(async () => {
      // Create test users for login tests
      for (const [key, fixture] of Object.entries(userFixtures)) {
        if (key !== 'inactiveUser') {
          await AuthTestUtils.createTestUser(fixture);
        }
      }
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post(endpoint)
        .send(loginFixtures.validOwner)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');

      const { user, tokens } = response.body.data;
      
      ValidationTestUtils.assertUserStructure(user);
      expect(user.email).toBe(loginFixtures.validOwner.email);
      expect(user.role).toBe('OWNER');

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(900); // 15 minutes
    });

    it('should handle email case insensitivity on login', async () => {
      const response = await request(app)
        .post(endpoint)
        .send({
          email: 'OWNER@TEST.COM',
          password: loginFixtures.validOwner.password,
        })
        .expect(200);

      expect(response.body.data.user.email).toBe('owner@test.com');
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post(endpoint)
        .send(loginFixtures.invalidEmail)
        .expect(401);

      ValidationTestUtils.assertErrorResponseStructure(response.body);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('Invalid credentials');
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post(endpoint)
        .send(loginFixtures.invalidPassword)
        .expect(401);

      ValidationTestUtils.assertErrorResponseStructure(response.body);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('Invalid credentials');
    });

    it('should fail with inactive user', async () => {
      // Create inactive user
      await AuthTestUtils.createTestUser(userFixtures.inactiveUser);

      const response = await request(app)
        .post(endpoint)
        .send({
          email: userFixtures.inactiveUser.email,
          password: userFixtures.inactiveUser.password,
        })
        .expect(403);

      ValidationTestUtils.assertErrorResponseStructure(response.body);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toContain('Account is deactivated');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post(endpoint)
        .send(loginFixtures.malformedEmail)
        .expect(400);

      ValidationTestUtils.assertErrorResponseStructure(response.body);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveProperty('email');
    });

    it('should validate required fields', async () => {
      const testCases = [
        { payload: { email: 'test@test.com' }, missingField: 'password' },
        { payload: { password: 'password123' }, missingField: 'email' },
        { payload: {}, missingFields: ['email', 'password'] },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post(endpoint)
          .send(testCase.payload)
          .expect(400);

        ValidationTestUtils.assertErrorResponseStructure(response.body);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        
        if (testCase.missingField) {
          expect(response.body.error.details).toHaveProperty(testCase.missingField);
        } else if (testCase.missingFields) {
          testCase.missingFields.forEach(field => {
            expect(response.body.error.details).toHaveProperty(field);
          });
        }
      }
    });

    it('should handle empty credentials', async () => {
      const response = await request(app)
        .post(endpoint)
        .send(loginFixtures.emptyCredentials)
        .expect(400);

      ValidationTestUtils.assertErrorResponseStructure(response.body);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should work with different user roles', async () => {
      const rolesToTest = ['MAINTAINER', 'CONTRIBUTOR', 'CONSUMER', 'AUDITOR'];

      for (const role of rolesToTest) {
        const userFixture = Object.values(userFixtures).find(u => u.role === role);
        if (userFixture) {
          const response = await request(app)
            .post(endpoint)
            .send({
              email: userFixture.email,
              password: userFixture.password,
            })
            .expect(200);

          expect(response.body.data.user.role).toBe(role);
        }
      }
    });
  });

  describe('POST /api/v1/public/auth/refresh', () => {
    const endpoint = '/api/v1/public/auth/refresh';
    let validRefreshToken: string;
    let validAccessToken: string;

    beforeEach(async () => {
      // Create user and get tokens
      await AuthTestUtils.createTestUser(userFixtures.contributor);
      const loginResponse = await request(app)
        .post('/api/v1/public/auth/login')
        .send({
          email: userFixtures.contributor.email,
          password: userFixtures.contributor.password,
        });

      validRefreshToken = loginResponse.body.data.tokens.refreshToken;
      validAccessToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post(endpoint)
        .send({ refreshToken: validRefreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('expiresIn');
      
      expect(typeof response.body.data.accessToken).toBe('string');
      expect(response.body.data.accessToken).not.toBe(validAccessToken); // Should be new token
      expect(response.body.data.expiresIn).toBe(900); // 15 minutes
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post(endpoint)
        .send({ refreshToken: 'invalid.refresh.token' })
        .expect(401);

      ValidationTestUtils.assertErrorResponseStructure(response.body);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should fail with access token instead of refresh token', async () => {
      const response = await request(app)
        .post(endpoint)
        .send({ refreshToken: validAccessToken })
        .expect(401);

      ValidationTestUtils.assertErrorResponseStructure(response.body);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('Invalid refresh token');
    });

    it('should fail with missing refresh token', async () => {
      const response = await request(app)
        .post(endpoint)
        .send({})
        .expect(400);

      ValidationTestUtils.assertErrorResponseStructure(response.body);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveProperty('refreshToken');
    });

    it('should fail with empty refresh token', async () => {
      const response = await request(app)
        .post(endpoint)
        .send({ refreshToken: '' })
        .expect(400);

      ValidationTestUtils.assertErrorResponseStructure(response.body);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should fail with malformed refresh token', async () => {
      const malformedTokens = [
        'not-a-jwt',
        'missing.parts',
        'too.many.parts.here.invalid',
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .post(endpoint)
          .send({ refreshToken: token })
          .expect(401);

        ValidationTestUtils.assertErrorResponseStructure(response.body);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('POST /api/v1/public/auth/logout', () => {
    const endpoint = '/api/v1/public/auth/logout';
    let accessToken: string;

    beforeEach(async () => {
      // Create user and login
      await AuthTestUtils.createTestUser(userFixtures.contributor);
      accessToken = await apiHelper.loginUser(
        userFixtures.contributor.email,
        userFixtures.contributor.password
      );
    });

    it('should logout with valid access token', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Logged out successfully');
    });

    it('should fail without authorization header', async () => {
      const response = await request(app)
        .post(endpoint)
        .expect(401);

      ValidationTestUtils.assertErrorResponseStructure(response.body);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .post(endpoint)
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      ValidationTestUtils.assertErrorResponseStructure(response.body);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should fail with malformed authorization header', async () => {
      const malformedHeaders = [
        'Bearer', // Missing token
        'InvalidScheme token', // Wrong scheme
        'Bearer token1 token2', // Multiple tokens
        accessToken, // Missing Bearer prefix
      ];

      for (const header of malformedHeaders) {
        const response = await request(app)
          .post(endpoint)
          .set('Authorization', header)
          .expect(401);

        ValidationTestUtils.assertErrorResponseStructure(response.body);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      // 1. Register new user
      const userData = UserFixtureFactory.generateRegistration();
      const registerResponse = await request(app)
        .post('/api/v1/public/auth/register')
        .send(userData)
        .expect(201);

      const { accessToken, refreshToken } = registerResponse.body.data.tokens;

      // 2. Use access token to access protected endpoint
      const profileResponse = await request(app)
        .get('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body.data.email).toBe(userData.email.toLowerCase());

      // 3. Refresh token
      const refreshResponse = await request(app)
        .post('/api/v1/public/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const newAccessToken = refreshResponse.body.data.accessToken;
      expect(newAccessToken).not.toBe(accessToken);

      // 4. Use new access token
      const profileResponse2 = await request(app)
        .get('/api/v1/profiles/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(profileResponse2.body.data.email).toBe(userData.email.toLowerCase());

      // 5. Logout
      await request(app)
        .post('/api/v1/public/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);
    });

    it('should handle concurrent login sessions', async () => {
      // Create user
      const userData = UserFixtureFactory.generateUser();
      await AuthTestUtils.createTestUser(userData);

      // Login from multiple "devices" concurrently
      const loginPromises = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/v1/public/auth/login')
          .send({
            email: userData.email,
            password: userData.password,
          })
      );

      const responses = await Promise.all(loginPromises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.tokens.accessToken).toBeDefined();
      });

      // All tokens should be different
      const tokens = responses.map(r => r.body.data.tokens.accessToken);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(5);
    });
  });
});