import express from 'express';
import { ApiTestHelper, TestDatabase, userFixtures } from '../helpers';

describe('ApiTestHelper Integration Tests', () => {
  let app: express.Express;
  let apiHelper: ApiTestHelper;
  let testDb: TestDatabase;

  beforeAll(() => {
    // Create a simple Express app for testing
    app = express();
    app.use(express.json());
    
    // Get TestDatabase singleton instance
    testDb = TestDatabase.getInstance();
    
    // Initialize ApiTestHelper with the app and database
    apiHelper = new ApiTestHelper(app, testDb);
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await apiHelper.cleanupTestData();
  });

  afterAll(async () => {
    // Clean up after all tests
    await apiHelper.cleanupTestData();
  });

  describe('User Creation', () => {
    it('should create a user successfully', async () => {
      const user = await apiHelper.createUser(userFixtures.user);
      
      expect(user).toBeDefined();
      expect(user.email).toBe(userFixtures.user.email);
      expect(user.name).toBe(userFixtures.user.name);
      expect(user.role).toBe(userFixtures.user.role);
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should throw error when creating duplicate user', async () => {
      await apiHelper.createUser(userFixtures.user);
      
      await expect(apiHelper.createUser(userFixtures.user))
        .rejects.toThrow('User with email user@example.com already exists');
    });
  });

  describe('User Authentication', () => {
    it('should authenticate user and return token', async () => {
      const { user, token } = await apiHelper.authenticateUser(userFixtures.owner);
      
      expect(user).toBeDefined();
      expect(user.email).toBe(userFixtures.owner.email);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should login existing user', async () => {
      // First create the user
      await apiHelper.createUser(userFixtures.admin);
      
      // Then login
      const token = await apiHelper.loginUser(userFixtures.admin.email, userFixtures.admin.password);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should throw error when logging in non-existent user', async () => {
      await expect(apiHelper.loginUser('nonexistent@example.com', 'password'))
        .rejects.toThrow('User not found');
    });
  });

  describe('Token Verification', () => {
    it('should verify valid token', async () => {
      const { token } = await apiHelper.authenticateUser(userFixtures.moderator);
      
      const decoded = await apiHelper.verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.email).toBe(userFixtures.moderator.email);
      expect(decoded.role).toBe(userFixtures.moderator.role);
    });

    it('should throw error for invalid token', async () => {
      await expect(apiHelper.verifyToken('invalid-token'))
        .rejects.toThrow('Invalid token');
    });
  });

  describe('Test User Setup Helpers', () => {
    it('should setup test user with default values', async () => {
      const { user, token } = await apiHelper.setupTestUser();
      
      expect(user.email).toMatch(/test-\d+@example\.com/);
      expect(user.name).toBe('Test User');
      expect(user.role).toBe('user');
      expect(token).toBeDefined();
    });

    it('should setup admin user with default values', async () => {
      const { user, token } = await apiHelper.setupAdminUser();
      
      expect(user.email).toMatch(/admin-\d+@example\.com/);
      expect(user.name).toBe('Admin User');
      expect(user.role).toBe('admin');
      expect(token).toBeDefined();
    });

    it('should override default values when specified', async () => {
      const customUserData = {
        email: 'custom@example.com',
        name: 'Custom User'
      };
      
      const { user } = await apiHelper.setupTestUser(customUserData);
      
      expect(user.email).toBe('custom@example.com');
      expect(user.name).toBe('Custom User');
      expect(user.role).toBe('user'); // Should keep default role
    });
  });

  describe('Database Integration', () => {
    it('should integrate properly with TestDatabase singleton', async () => {
      // Create user through ApiTestHelper
      const user1 = await apiHelper.createUser(userFixtures.user);
      
      // Retrieve user directly from TestDatabase
      const user2 = await testDb.getUserByEmail(userFixtures.user.email);
      
      expect(user1).toEqual(user2);
    });

    it('should maintain data consistency between ApiTestHelper and TestDatabase', async () => {
      // Create user through ApiTestHelper
      await apiHelper.createUser(userFixtures.admin);
      
      // Verify through both interfaces
      const userFromHelper = await apiHelper.getUserByEmail(userFixtures.admin.email);
      const userFromDb = await testDb.getUserByEmail(userFixtures.admin.email);
      
      expect(userFromHelper).toEqual(userFromDb);
    });

    it('should clean up properly', async () => {
      // Create multiple users
      await apiHelper.createUser(userFixtures.user);
      await apiHelper.createUser(userFixtures.admin);
      
      // Verify they exist
      const users = await testDb.getAllUsers();
      expect(users).toHaveLength(2);
      
      // Clean up
      await apiHelper.cleanupTestData();
      
      // Verify cleanup
      const usersAfterCleanup = await testDb.getAllUsers();
      expect(usersAfterCleanup).toHaveLength(0);
    });
  });
});

// Demonstration of the fixed integration pattern from the issue
describe('Fixed Integration Pattern', () => {
  let app: express.Express;
  let apiHelper: ApiTestHelper;
  let testDb: TestDatabase;

  beforeAll(() => {
    app = express();
    testDb = TestDatabase.getInstance();
    apiHelper = new ApiTestHelper(app, testDb);
  });

  beforeEach(async () => {
    await apiHelper.cleanupTestData();
  });

  it('should demonstrate the fixed user creation pattern', async () => {
    // OLD PROBLEMATIC PATTERN (from issue description):
    // await apiHelper.createUser(userFixtures.owner, testDb); // This was wrong
    
    // NEW FIXED PATTERN:
    const user = await apiHelper.createUser(userFixtures.owner);
    
    expect(user).toBeDefined();
    expect(user.email).toBe(userFixtures.owner.email);
    
    // Verify integration works
    const retrievedUser = await testDb.getUserByEmail(userFixtures.owner.email);
    expect(retrievedUser).toEqual(user);
  });

  it('should demonstrate simplified authentication flow', async () => {
    // Single method that handles both user creation and authentication
    const { user, token } = await apiHelper.authenticateUser(userFixtures.owner);
    
    expect(user).toBeDefined();
    expect(token).toBeDefined();
    
    // Token should be valid
    const decoded = await apiHelper.verifyToken(token);
    expect(decoded.email).toBe(userFixtures.owner.email);
  });
});