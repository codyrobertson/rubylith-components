// This file runs BEFORE any test files are imported
// It ensures DATABASE_URL is set early enough to affect all database connections

import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

// Set test database URL before ANY database modules are imported
const testDbPath = path.join(process.cwd(), 'prisma', 'test.db');
process.env.DATABASE_URL = `file:${testDbPath}`;

// Set other test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

console.log('Test environment initialized with DATABASE_URL:', process.env.DATABASE_URL);

// Create test database if it doesn't exist
if (!fs.existsSync(testDbPath)) {
  console.log('Creating test database...');
  
  // Create temporary schema file with test database URL
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  const testSchemaPath = path.join(process.cwd(), 'prisma', 'test-schema.prisma');
  
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const testSchemaContent = schemaContent.replace(
    /url\s*=\s*"[^"]*"/,
    `url = "file:./test.db"`
  );
  
  fs.writeFileSync(testSchemaPath, testSchemaContent);
  
  try {
    execSync(`npx prisma db push --force-reset --skip-generate --schema=${testSchemaPath}`, {
      stdio: 'inherit'
    });
    console.log('Test database created successfully');
  } finally {
    // Clean up temp schema
    if (fs.existsSync(testSchemaPath)) {
      fs.unlinkSync(testSchemaPath);
    }
  }
}