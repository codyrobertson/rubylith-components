/**
 * User test fixtures
 * Predefined user data for testing
 */

import { faker } from '@faker-js/faker';

export interface UserFixture {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'OWNER' | 'MAINTAINER' | 'CONTRIBUTOR' | 'CONSUMER' | 'AUDITOR';
  isActive: boolean;
}

export interface UserLoginFixture {
  email: string;
  password: string;
}

export interface UserRegistrationFixture {
  email: string;
  password: string;
  name: string;
}

/**
 * Predefined user fixtures for consistent testing
 */
export const userFixtures: Record<string, UserFixture> = {
  owner: {
    email: 'owner@test.com',
    password: 'SecurePassword123!',
    firstName: 'Test',
    lastName: 'Owner',
    role: 'OWNER',
    isActive: true,
  },
  
  maintainer: {
    email: 'maintainer@test.com',
    password: 'SecurePassword123!',
    firstName: 'Test',
    lastName: 'Maintainer',
    role: 'MAINTAINER',
    isActive: true,
  },
  
  contributor: {
    email: 'contributor@test.com',
    password: 'SecurePassword123!',
    firstName: 'Test',
    lastName: 'Contributor',
    role: 'CONTRIBUTOR',
    isActive: true,
  },
  
  consumer: {
    email: 'consumer@test.com',
    password: 'SecurePassword123!',
    firstName: 'Test',
    lastName: 'Consumer',
    role: 'CONSUMER',
    isActive: true,
  },
  
  auditor: {
    email: 'auditor@test.com',
    password: 'SecurePassword123!',
    firstName: 'Test',
    lastName: 'Auditor',
    role: 'AUDITOR',
    isActive: true,
  },
  
  inactiveUser: {
    email: 'inactive@test.com',
    password: 'SecurePassword123!',
    firstName: 'Inactive',
    lastName: 'User',
    role: 'CONTRIBUTOR',
    isActive: false,
  },
};

/**
 * Login fixtures for authentication tests
 */
export const loginFixtures: Record<string, UserLoginFixture> = {
  validOwner: {
    email: 'owner@test.com',
    password: 'SecurePassword123!',
  },
  
  validMaintainer: {
    email: 'maintainer@test.com',
    password: 'SecurePassword123!',
  },
  
  validContributor: {
    email: 'contributor@test.com',
    password: 'SecurePassword123!',
  },
  
  invalidEmail: {
    email: 'nonexistent@test.com',
    password: 'SecurePassword123!',
  },
  
  invalidPassword: {
    email: 'owner@test.com',
    password: 'WrongPassword123!',
  },
  
  malformedEmail: {
    email: 'not-an-email',
    password: 'SecurePassword123!',
  },
  
  weakPassword: {
    email: 'test@test.com',
    password: '123',
  },
  
  emptyCredentials: {
    email: '',
    password: '',
  },
};

/**
 * Registration fixtures for user creation tests
 */
export const registrationFixtures: Record<string, UserRegistrationFixture> = {
  validUser: {
    email: 'newuser@test.com',
    password: 'SecurePassword123!',
    name: 'New Test User',
  },
  
  anotherValidUser: {
    email: 'another@test.com',
    password: 'AnotherSecure123!',
    name: 'Another Test User',
  },
  
  duplicateEmail: {
    email: 'owner@test.com', // Already exists in userFixtures
    password: 'SecurePassword123!',
    name: 'Duplicate Email User',
  },
  
  invalidEmail: {
    email: 'invalid-email-format',
    password: 'SecurePassword123!',
    name: 'Invalid Email User',
  },
  
  weakPassword: {
    email: 'weakpass@test.com',
    password: '123',
    name: 'Weak Password User',
  },
  
  emptyName: {
    email: 'emptyname@test.com',
    password: 'SecurePassword123!',
    name: '',
  },
  
  longName: {
    email: 'longname@test.com',
    password: 'SecurePassword123!',
    name: 'A'.repeat(256), // Exceeds typical name length limits
  },
};

/**
 * Invalid user data for validation testing
 */
export const invalidUserFixtures = {
  missingEmail: {
    password: 'SecurePassword123!',
    name: 'Missing Email User',
  },
  
  missingPassword: {
    email: 'missingpass@test.com',
    name: 'Missing Password User',
  },
  
  missingName: {
    email: 'missingname@test.com',
    password: 'SecurePassword123!',
  },
  
  nullValues: {
    email: null,
    password: null,
    name: null,
  },
  
  undefinedValues: {
    email: undefined,
    password: undefined,
    name: undefined,
  },
  
  sqlInjection: {
    email: "admin@test.com'; DROP TABLE users; --",
    password: 'SecurePassword123!',
    name: 'SQL Injection User',
  },
  
  xssAttempt: {
    email: 'xss@test.com',
    password: 'SecurePassword123!',
    name: '<script>alert("XSS")</script>',
  },
};

/**
 * User update fixtures for modification tests
 */
export const userUpdateFixtures = {
  validUpdate: {
    firstName: 'Updated',
    lastName: 'Name',
  },
  
  roleUpdate: {
    role: 'MAINTAINER',
  },
  
  statusUpdate: {
    isActive: false,
  },
  
  fullUpdate: {
    firstName: 'Completely',
    lastName: 'Updated',
    role: 'AUDITOR',
    isActive: true,
  },
  
  emptyUpdate: {},
  
  invalidRole: {
    role: 'INVALID_ROLE',
  },
  
  invalidType: {
    firstName: 123,
    lastName: true,
    isActive: 'not-boolean',
  },
};

/**
 * Factory functions for generating dynamic test data
 */
export class UserFixtureFactory {
  /**
   * Generate a random valid user
   */
  static generateUser(overrides: Partial<UserFixture> = {}): UserFixture {
    return {
      email: faker.internet.email(),
      password: 'SecurePassword123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: 'CONTRIBUTOR',
      isActive: true,
      ...overrides,
    };
  }

  /**
   * Generate a random registration payload
   */
  static generateRegistration(overrides: Partial<UserRegistrationFixture> = {}): UserRegistrationFixture {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    return {
      email: faker.internet.email(),
      password: 'SecurePassword123!',
      name: `${firstName} ${lastName}`,
      ...overrides,
    };
  }

  /**
   * Generate multiple users
   */
  static generateUsers(count: number, baseOverrides: Partial<UserFixture> = {}): UserFixture[] {
    return Array.from({ length: count }, (_, index) => 
      UserFixtureFactory.generateUser({
        ...baseOverrides,
        email: `user${index + 1}@test.com`,
      })
    );
  }

  /**
   * Generate users with different roles
   */
  static generateUsersWithRoles(): UserFixture[] {
    const roles: UserFixture['role'][] = ['OWNER', 'MAINTAINER', 'CONTRIBUTOR', 'CONSUMER', 'AUDITOR'];
    
    return roles.map((role, index) => 
      UserFixtureFactory.generateUser({
        role,
        email: `${role.toLowerCase()}${index + 1}@test.com`,
      })
    );
  }

  /**
   * Generate edge case users
   */
  static generateEdgeCaseUsers(): UserFixture[] {
    return [
      // Minimum length values
      UserFixtureFactory.generateUser({
        email: 'a@b.co',
        firstName: 'A',
        lastName: 'B',
      }),
      
      // Maximum length values
      UserFixtureFactory.generateUser({
        email: `${'a'.repeat(50)}@${'b'.repeat(50)}.com`,
        firstName: 'A'.repeat(50),
        lastName: 'B'.repeat(50),
      }),
      
      // Special characters
      UserFixtureFactory.generateUser({
        email: 'test+tag@example-domain.co.uk',
        firstName: "O'Connor",
        lastName: 'van der Berg',
      }),
      
      // Unicode characters
      UserFixtureFactory.generateUser({
        firstName: 'José',
        lastName: 'Müller',
      }),
    ];
  }
}