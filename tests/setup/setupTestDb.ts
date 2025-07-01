/**
 * Setup test database with proper schema
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export function setupTestDatabase(dbUrl: string): void {
  console.log('Setting up test database with URL:', dbUrl);
  
  // Extract the database file path from the URL
  const dbPath = dbUrl.replace('file:', '');
  
  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // Remove existing database file if it exists
  if (fs.existsSync(dbPath)) {
    console.log('Removing existing test database file...');
    fs.unlinkSync(dbPath);
  }
  
  // Set the DATABASE_URL environment variable
  process.env.DATABASE_URL = dbUrl;
  
  // Run prisma db push to create the schema
  console.log('Running prisma db push...');
  try {
    const output = execSync(
      'npx prisma db push --skip-generate --accept-data-loss',
      {
        env: {
          ...process.env,
          DATABASE_URL: dbUrl
        },
        encoding: 'utf8'
      }
    );
    console.log('Prisma db push output:', output);
  } catch (error: any) {
    console.error('Failed to push schema:', error.message);
    if (error.stdout) console.log('stdout:', error.stdout.toString());
    if (error.stderr) console.error('stderr:', error.stderr.toString());
    throw error;
  }
  
  // Verify the database was created
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file was not created at: ${dbPath}`);
  }
  
  console.log('Test database setup complete');
}