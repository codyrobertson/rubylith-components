// This file MUST be .mjs to ensure it runs before TypeScript compilation
// Set test database URL before ANY modules are loaded
process.env.DATABASE_URL = 'file:./prisma/test.db';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

console.log('Test environment initialized with DATABASE_URL:', process.env.DATABASE_URL);