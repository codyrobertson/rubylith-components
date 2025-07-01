# Critical Test Failures - GitHub Issues

## Issue #1: Component Creation Validation Schema Mismatch

**Priority:** Critical
**Labels:** bug, api, validation, tests
**Milestone:** Test Suite Stabilization

### Description
Component creation is failing with 400 Bad Request due to validation schema mismatch between API requirements and test fixture data.

### Root Cause Analysis
1. **Schema requires `contractId` as required field** but test fixtures make it optional
2. **Type mismatch** between ComponentService expected input and actual data structure
3. **Validation error messages not properly returned** to help debug the issue

### Investigation Findings

**Validation Schema (src/api/routes/components.ts:19-32):**
```typescript
const createComponentSchema = z.object({
  name: z.string().min(1).max(255),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  type: z.nativeEnum(ComponentType),
  lifecycle: z.nativeEnum(ComponentLifecycle),
  description: z.string(),
  author: z.string(),
  license: z.string(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  keywords: z.array(z.string()),
  contractId: z.string(), // ❌ REQUIRED but fixtures don't provide
  metadata: z.record(z.any()).optional(),
});
```

**Test Fixture (tests/fixtures/components.ts:402-414):**
```typescript
export function createComponentFixture(overrides: Partial<ComponentCreateFixture> = {}): ComponentCreateFixture {
  return {
    name: `TestComponent${Math.random().toString(36).substring(2, 8)}`,
    version: '1.0.0',
    description: 'Test component for integration tests',
    author: 'Test Author',
    license: 'MIT',
    keywords: ['test', 'component'],
    type: 'UI_COMPONENT',
    lifecycle: 'DEVELOPMENT',
    metadata: {},
    // ❌ Missing contractId required by schema
    ...overrides,
  };
}
```

**Database Schema (prisma/schema.prisma:69-70):**
```prisma
contractId  String?    // ❌ Optional in DB but required in API validation
contract    Contract? @relation(fields: [contractId], references: [id])
```

### Technical Details

**Error Flow:**
1. Test calls `createComponentFixture()` which generates data without `contractId`
2. API validation schema rejects request due to missing required `contractId`
3. Returns 400 Bad Request with no helpful error details
4. Test expects 201 Created but gets 400

**Related Files:**
- `src/api/routes/components.ts` - Validation schema definition
- `tests/fixtures/components.ts` - Test fixture generation
- `tests/integration/components.test.ts` - Failing tests
- `prisma/schema.prisma` - Database schema definition

### Reproduction Steps
```bash
npm test -- tests/integration/components.test.ts -t "should create a new component with valid data"
```

### Proposed Solution

**Option 1: Make contractId Optional (Recommended)**
```typescript
// Update validation schema
contractId: z.string().optional(),
```

**Option 2: Update Fixtures to Include contractId**
```typescript
// Update createComponentFixture
contractId: `contract-${Math.random().toString(36).substring(2, 8)}`,
```

**Option 3: Create Contract First in Tests**
```typescript
// In beforeEach, create a contract and use its ID
const contract = await testDb.createContract({...});
const componentData = createComponentFixture({ contractId: contract.id });
```

### Acceptance Criteria
- [ ] Component creation tests pass
- [ ] Validation schema aligns with database schema
- [ ] Test fixtures generate valid data
- [ ] Error messages are helpful for debugging
- [ ] All component CRUD operations work correctly

### Impact
- **Blocks:** All component integration tests (26 failing tests)
- **Affects:** Component API functionality
- **Severity:** Critical - core feature completely broken

---

## Issue #2: Missing Input Validation Error Response Details

**Priority:** High
**Labels:** dx, validation, api, tests
**Milestone:** Test Suite Stabilization

### Description
When validation fails, the API returns 400 Bad Request but doesn't include detailed error information, making debugging extremely difficult.

### Current Behavior
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Validation failed"
}
```

### Expected Behavior
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "contractId",
        "message": "contractId is required"
      }
    ]
  }
}
```

### Investigation
The validation middleware in `src/api/middleware/validation.ts` needs to return detailed error information.

### Acceptance Criteria
- [ ] Validation errors include field-specific details
- [ ] Error response format is consistent
- [ ] Tests can validate specific validation errors
- [ ] Development experience is improved

---

## Issue #3: Auth Test Failures - Multiple Issues

**Priority:** High
**Labels:** auth, tests, security
**Milestone:** Test Suite Stabilization

### Description
Multiple authentication tests are failing due to various issues:

1. **Duplicate email validation not working**
2. **Missing XSS sanitization**
3. **Error response format inconsistencies**
4. **Missing `/api/v1/profiles/me` endpoint**
5. **Auth middleware error handling issues**

### Failing Tests
```
- should fail with duplicate email (expects 409, gets 201)
- should sanitize input against XSS (XSS content not sanitized)
- should fail with inactive user (missing timestamp field)
- should logout with valid access token (wrong response format)
- should fail with invalid token (expects 401, gets 500)
```

### Root Cause Analysis

**1. Duplicate Email Issue:**
- Database cleanup between tests may not be working properly
- User creation in test setup needs verification

**2. XSS Sanitization Missing:**
```typescript
// Current: No sanitization
const { name } = req.body;

// Needed: Input sanitization
import DOMPurify from 'isomorphic-dompurify';
const sanitizedName = DOMPurify.sanitize(name, { ALLOWED_TAGS: [] });
```

**3. Missing Endpoint:**
- `/api/v1/profiles/me` referenced in tests but doesn't exist
- Needed for auth flow completion tests

### Proposed Solutions

**For Duplicate Email:**
```typescript
// Ensure proper test isolation
beforeEach(async () => {
  await cleanTestDatabase();
  // Verify database is actually clean
  const userCount = await testDb.getClient().user.count();
  expect(userCount).toBe(0);
});
```

**For XSS Sanitization:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

// In registration route
const sanitizeName = (name: string) => {
  return DOMPurify.sanitize(name, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};
```

**For Missing Endpoint:**
```typescript
// Add to profiles routes
router.get('/me', authMiddleware, async (req, res) => {
  const user = await userRepo.findById(req.user.userId);
  res.json({ data: user });
});
```

### Acceptance Criteria
- [ ] All auth tests pass (31/31)
- [ ] XSS protection is implemented
- [ ] Duplicate email validation works
- [ ] Error response formats are consistent
- [ ] Missing endpoints are implemented

---

## Issue #4: Test Infrastructure - ApiTestHelper Integration Issues

**Priority:** Medium
**Labels:** tests, infrastructure, dx
**Milestone:** Test Suite Stabilization

### Description
The `ApiTestHelper` class has integration issues with the new `TestDatabase` setup, causing user creation and authentication to fail in tests.

### Problems Identified

**1. User Creation Method Inconsistency:**
```typescript
// Current problematic call
await apiHelper.createUser(userFixtures.owner, testDb);

// TestDatabase expects different signature
await testDb.createUser(userData);
```

**2. Authentication Token Issues:**
- Tokens generated for test users may not work with API
- Token storage/retrieval inconsistent

**3. Test Database Integration:**
- ApiTestHelper not properly integrated with TestDatabase singleton
- User data not persisting correctly between operations

### Proposed Solution

**Update ApiTestHelper:**
```typescript
export class ApiTestHelper {
  constructor(private app: Express, private testDb: TestDatabase) {}
  
  async createUser(userData: any) {
    return await this.testDb.createUser(userData);
  }
  
  async authenticateUser(userData: any) {
    const user = await this.createUser(userData);
    const token = await this.loginUser(user.email, userData.password);
    return { user, token };
  }
}
```

### Acceptance Criteria
- [ ] ApiTestHelper works seamlessly with TestDatabase
- [ ] User creation is reliable across all tests
- [ ] Authentication flow works consistently
- [ ] Test setup is simplified and more reliable

---

## Issue #5: Unit Test Performance - Infinite Loop in Auth Tests

**Priority:** Medium
**Labels:** performance, tests, unit-tests
**Milestone:** Test Suite Optimization

### Description
The auth unit tests appear to be running in an infinite loop, causing performance issues and excessive console output.

### Symptoms
- Tests show "✓ |unit| src/api/utils/__tests__/auth.test.ts (31) 3712ms" repeated hundreds of times
- Test execution becomes very slow
- Console output is overwhelming

### Investigation Needed
- Check for circular dependencies in auth test imports
- Verify test runner configuration
- Look for infinite loops in test setup/teardown

### Acceptance Criteria
- [ ] Unit tests run efficiently
- [ ] No repeated test execution
- [ ] Console output is clean and useful
- [ ] Test performance is optimized

---

## Implementation Priority Order

### Phase 1: Critical Fixes (Week 1)
1. **Issue #1** - Fix component validation schema mismatch
2. **Issue #2** - Add detailed validation error responses

### Phase 2: Auth & Infrastructure (Week 2)  
3. **Issue #3** - Fix all auth test failures
4. **Issue #4** - Fix ApiTestHelper integration

### Phase 3: Optimization (Week 3)
5. **Issue #5** - Fix unit test performance issues

### Success Metrics
- **Phase 1 Complete:** Component tests pass (0/26 → 26/26)
- **Phase 2 Complete:** Auth tests pass (6/31 → 31/31), Infrastructure stable
- **Phase 3 Complete:** All tests pass, performance optimized

### Testing Strategy
1. Fix one issue at a time
2. Run focused tests after each fix
3. Ensure no regressions
4. Document all changes
5. Run full test suite after each phase

This plan provides a systematic approach to resolving all test failures with clear priorities, acceptance criteria, and measurable success metrics.