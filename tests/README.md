# Test Infrastructure

This directory contains the test infrastructure for the rubylith-components project, specifically addressing the ApiTestHelper integration with TestDatabase.

## Overview

The test infrastructure provides a reliable and consistent way to handle user creation and authentication in tests, fixing the integration issues between `ApiTestHelper` and `TestDatabase`.

## Key Components

### TestDatabase
- **Location**: `tests/helpers/TestDatabase.ts`
- **Purpose**: Singleton class that manages test user data in memory
- **Features**:
  - User creation with unique ID generation
  - User lookup by email or ID
  - User updates and deletion
  - Complete data cleanup for test isolation

### ApiTestHelper
- **Location**: `tests/helpers/ApiTestHelper.ts`
- **Purpose**: Helper class that integrates with TestDatabase for API testing
- **Features**:
  - Seamless TestDatabase integration
  - User creation and authentication
  - JWT token generation and verification
  - Convenient test user setup methods
  - Authenticated API request helpers

### User Fixtures
- **Location**: `tests/fixtures/userFixtures.ts`
- **Purpose**: Predefined user data for consistent testing
- **Includes**: Owner, admin, user, moderator, guest roles with helper functions

## Fixed Integration Issues

### Problem 1: User Creation Method Inconsistency
**Before** (problematic):
```typescript
await apiHelper.createUser(userFixtures.owner, testDb); // Wrong signature
```

**After** (fixed):
```typescript
await apiHelper.createUser(userFixtures.owner); // Correct signature
```

### Problem 2: Authentication Token Issues
**Fixed with**:
- Consistent JWT token generation
- Proper token storage and retrieval
- Token verification methods

### Problem 3: Test Database Integration
**Fixed with**:
- ApiTestHelper constructor accepts TestDatabase instance
- Proper singleton pattern usage
- Data persistence between operations

## Usage Examples

### Basic User Creation
```typescript
import { ApiTestHelper, TestDatabase, userFixtures } from './helpers';

const testDb = TestDatabase.getInstance();
const apiHelper = new ApiTestHelper(app, testDb);

// Create a user
const user = await apiHelper.createUser(userFixtures.owner);
```

### User Authentication
```typescript
// Create and authenticate in one step
const { user, token } = await apiHelper.authenticateUser(userFixtures.admin);

// Or login existing user
const token = await apiHelper.loginUser(user.email, password);
```

### Quick Test User Setup
```typescript
// Setup a regular test user
const { user, token } = await apiHelper.setupTestUser();

// Setup an admin user
const { user: adminUser, token: adminToken } = await apiHelper.setupAdminUser();

// Setup with custom data
const { user, token } = await apiHelper.setupTestUser({
  email: 'custom@example.com',
  name: 'Custom User'
});
```

### Test Cleanup
```typescript
beforeEach(async () => {
  await apiHelper.cleanupTestData();
});
```

## Integration Test Example

```typescript
describe('API Integration Tests', () => {
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

  it('should create and authenticate user', async () => {
    const { user, token } = await apiHelper.authenticateUser(userFixtures.owner);
    
    expect(user.email).toBe(userFixtures.owner.email);
    expect(token).toBeDefined();
    
    // Verify token is valid
    const decoded = await apiHelper.verifyToken(token);
    expect(decoded.email).toBe(user.email);
  });
});
```

## Running Tests

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- apiTestHelper.test.ts
```

## Benefits of the Fixed Integration

1. **Reliability**: User creation and authentication work consistently
2. **Simplicity**: Single interface for all test user operations
3. **Consistency**: Proper integration between ApiTestHelper and TestDatabase
4. **Maintainability**: Clear separation of concerns and reusable components
5. **Test Isolation**: Proper cleanup mechanisms prevent test interference