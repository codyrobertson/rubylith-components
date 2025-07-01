import { PrismaClient } from '../../generated/prisma';

const isDatabaseTest = process.env.NODE_ENV === 'test';
const defaultUrl = isDatabaseTest ? 'file:./prisma/test.db' : 'file:./dev.db';

export const prisma = new PrismaClient({
  datasources: { 
    db: { 
      url: process.env.DATABASE_URL || defaultUrl
    } 
  },
});