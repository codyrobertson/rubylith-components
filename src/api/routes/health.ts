/**
 * Health check routes
 * Provides system health and status information
 */

import { Router } from 'express';
import { checkDatabaseHealth } from '../../database';

const router = Router();

router.get('/status', async (_req, res) => {
  const dbHealth = await checkDatabaseHealth();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: dbHealth,
    version: process.env['npm_package_version'] || '0.1.0',
  });
});

export const healthRoutes = router;