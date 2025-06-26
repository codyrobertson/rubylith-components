/**
 * API server configuration
 * Centralizes all configuration with environment variable support
 */

import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

export const config = {
  server: {
    port: parseInt(process.env['PORT'] || '3000', 10),
    env: process.env['NODE_ENV'] || 'development',
    bodyLimit: process.env['BODY_LIMIT'] || '10mb',
    enableLogging: process.env['ENABLE_LOGGING'] !== 'false',
    logFormat: process.env['LOG_FORMAT'] || 'combined',
  },
  
  cors: {
    origins: process.env['CORS_ORIGINS']?.split(',') || ['http://localhost:3000'],
  },
  
  auth: {
    jwtSecret: process.env['JWT_SECRET'] || 'development-secret-change-in-production',
    jwtRefreshSecret: process.env['JWT_REFRESH_SECRET'] || 'development-refresh-secret-change-in-production',
    jwtExpiresIn: process.env['JWT_EXPIRES_IN'] || '15m',
    jwtRefreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',
    jwtIssuer: process.env['JWT_ISSUER'] || 'rubylith-component-registry',
    jwtAudience: process.env['JWT_AUDIENCE'] || 'rubylith-api-users',
    bcryptRounds: parseInt(process.env['BCRYPT_ROUNDS'] || '12', 10),
  },
  
  database: {
    url: process.env['DATABASE_URL'] || 'file:./dev.db',
  },
  
  api: {
    rateLimit: {
      windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10), // 15 minutes
      max: parseInt(process.env['RATE_LIMIT_MAX'] || '100', 10), // limit each IP to 100 requests per windowMs
    },
    pagination: {
      defaultLimit: parseInt(process.env['DEFAULT_PAGE_LIMIT'] || '20', 10),
      maxLimit: parseInt(process.env['MAX_PAGE_LIMIT'] || '100', 10),
    },
  },
  
  security: {
    apiKeys: {
      enabled: process.env['API_KEYS_ENABLED'] === 'true',
      header: process.env['API_KEY_HEADER'] || 'X-API-Key',
    },
  },
} as const;

// Validate required configuration
export function validateConfig(): void {
  const required = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0 && config.server.env === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  if (config.auth.jwtSecret === 'development-secret-change-in-production' && config.server.env === 'production') {
    throw new Error('JWT_SECRET must be changed from default value in production');
  }
  
  if (config.auth.jwtRefreshSecret === 'development-refresh-secret-change-in-production' && config.server.env === 'production') {
    throw new Error('JWT_REFRESH_SECRET must be changed from default value in production');
  }
}