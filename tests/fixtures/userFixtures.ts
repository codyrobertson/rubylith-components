import { UserData } from '../helpers/TestDatabase';

export const userFixtures = {
  owner: {
    email: 'owner@example.com',
    password: 'owner-password-123',
    name: 'Project Owner',
    role: 'owner'
  } as UserData,

  admin: {
    email: 'admin@example.com',
    password: 'admin-password-123',
    name: 'Admin User',
    role: 'admin'
  } as UserData,

  user: {
    email: 'user@example.com',
    password: 'user-password-123',
    name: 'Regular User',
    role: 'user'
  } as UserData,

  moderator: {
    email: 'moderator@example.com',
    password: 'moderator-password-123',
    name: 'Moderator User',
    role: 'moderator'
  } as UserData,

  guest: {
    email: 'guest@example.com',
    password: 'guest-password-123',
    name: 'Guest User',
    role: 'guest'
  } as UserData,

  // Helper to generate dynamic test users
  generateTestUser: (suffix: string = Date.now().toString()): UserData => ({
    email: `test-user-${suffix}@example.com`,
    password: `test-password-${suffix}`,
    name: `Test User ${suffix}`,
    role: 'user'
  }),

  // Helper to generate admin users
  generateAdminUser: (suffix: string = Date.now().toString()): UserData => ({
    email: `admin-${suffix}@example.com`,
    password: `admin-password-${suffix}`,
    name: `Admin User ${suffix}`,
    role: 'admin'
  })
};