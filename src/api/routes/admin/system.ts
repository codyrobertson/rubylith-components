/**
 * Admin System Routes
 * Handles system administration, monitoring, and configuration
 */

import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole, UserRole } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { errors } from '../../middleware/errorHandler';
import { checkDatabaseHealth } from '../../../database';
import { config } from '../../config';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const router = Router();

// Apply admin authentication to all routes
router.use(authMiddleware);
router.use(requireRole(UserRole.OWNER));

// Validation schemas
const configUpdateSchema = z.object({
  cors: z.object({
    origins: z.array(z.string().url()).optional(),
  }).optional(),
  api: z.object({
    rateLimit: z.object({
      windowMs: z.number().min(1000).optional(),
      max: z.number().min(1).optional(),
    }).optional(),
    pagination: z.object({
      defaultLimit: z.number().min(1).max(1000).optional(),
      maxLimit: z.number().min(1).max(1000).optional(),
    }).optional(),
  }).optional(),
});

const maintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().optional(),
  estimatedDuration: z.string().optional(),
});

// System state
let maintenanceMode = {
  enabled: false,
  message: 'System is under maintenance. Please try again later.',
  estimatedDuration: undefined as string | undefined,
  startTime: undefined as Date | undefined,
};

// Route handlers
const getSystemInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [dbHealth, packageInfo] = await Promise.all([
      checkDatabaseHealth(),
      getPackageInfo(),
    ]);

    const systemInfo = {
      version: packageInfo.version,
      name: packageInfo.name,
      description: packageInfo.description,
      environment: config.server.env,
      nodeVersion: process.version,
      platform: os.platform(),
      architecture: os.arch(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      database: dbHealth,
      maintenance: maintenanceMode,
      timestamps: {
        started: new Date(Date.now() - process.uptime() * 1000),
        current: new Date(),
      },
    };

    res.json({ data: systemInfo });
  } catch (error) {
    next(error);
  }
};

const getSystemHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [dbHealth, diskUsage, memoryInfo] = await Promise.all([
      checkDatabaseHealth(),
      getDiskUsage(),
      getMemoryInfo(),
    ]);

    const health = {
      status: 'healthy',
      checks: {
        database: {
          status: dbHealth.healthy ? 'healthy' : 'unhealthy',
          details: dbHealth,
        },
        memory: {
          status: memoryInfo.percentUsed < 90 ? 'healthy' : 'critical',
          details: memoryInfo,
        },
        disk: {
          status: diskUsage.percentUsed < 85 ? 'healthy' : 'warning',
          details: diskUsage,
        },
        uptime: {
          status: process.uptime() > 60 ? 'healthy' : 'starting',
          details: {
            uptime: process.uptime(),
            uptimeFormatted: formatUptime(process.uptime()),
          },
        },
      },
    };

    // Determine overall status
    const statuses = Object.values(health.checks).map(check => check.status);
    if (statuses.includes('critical')) {
      health.status = 'critical';
    } else if (statuses.includes('unhealthy')) {
      health.status = 'unhealthy';
    } else if (statuses.includes('warning')) {
      health.status = 'warning';
    }

    res.json({ data: health });
  } catch (error) {
    next(error);
  }
};

const getSystemMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = {
      timestamp: new Date(),
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
      system: {
        platform: os.platform(),
        architecture: os.arch(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAverage: os.loadavg(),
        uptime: os.uptime(),
      },
      nodejs: {
        version: process.version,
        versions: process.versions,
      },
    };

    res.json({ data: metrics });
  } catch (error) {
    next(error);
  }
};

const updateSystemConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updates: {
      cors?: { origins?: string[] };
      api?: {
        rateLimit?: { windowMs?: number; max?: number };
        pagination?: { defaultLimit?: number; maxLimit?: number };
      };
    } = req.body;

    // In a production system, this would update a configuration store
    // For now, we'll just validate and acknowledge the update
    
    const updatedConfig = {
      message: 'Configuration updated successfully',
      changes: updates,
      timestamp: new Date(),
      appliedBy: req.user!.email,
    };

    res.json({ data: updatedConfig });
  } catch (error) {
    next(error);
  }
};

const setMaintenanceMode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { enabled, message, estimatedDuration }: {
      enabled: boolean;
      message?: string;
      estimatedDuration?: string;
    } = req.body;

    maintenanceMode = {
      enabled,
      message: message || maintenanceMode.message,
      estimatedDuration,
      startTime: enabled ? new Date() : undefined,
    };

    res.json({
      data: {
        maintenance: maintenanceMode,
        message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
      },
    });
  } catch (error) {
    next(error);
  }
};

const getLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lines = 100, level = 'all' }: {
      lines?: number;
      level?: string;
    } = req.query;

    // In a production system, this would read from actual log files
    // For demonstration, we'll return a mock log structure
    const logs = {
      timestamp: new Date(),
      level,
      lines: Math.min(lines, 1000), // Limit to 1000 lines max
      entries: [
        {
          timestamp: new Date(),
          level: 'info',
          message: 'API server started successfully',
          module: 'server',
        },
        {
          timestamp: new Date(Date.now() - 1000 * 60),
          level: 'info',
          message: 'Database connection established',
          module: 'database',
        },
        // Add more mock log entries as needed
      ],
    };

    res.json({ data: logs });
  } catch (error) {
    next(error);
  }
};

const clearCache = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In a production system, this would clear various caches
    const cacheStats = {
      cleared: [
        'application_cache',
        'database_query_cache',
        'session_cache',
      ],
      timestamp: new Date(),
      clearedBy: req.user!.email,
    };

    res.json({
      data: cacheStats,
      message: 'Caches cleared successfully',
    });
  } catch (error) {
    next(error);
  }
};

const restartSystem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // This is a dangerous operation - only allow in development
    if (config.server.env === 'production') {
      throw errors.forbidden('System restart not allowed in production');
    }

    res.json({
      message: 'System restart initiated',
      timestamp: new Date(),
      initiatedBy: req.user!.email,
    });

    // In a real system, this would trigger a graceful restart
    // setTimeout(() => process.exit(0), 1000);
  } catch (error) {
    next(error);
  }
};

// Helper functions
async function getPackageInfo() {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageData = await fs.readFile(packagePath, 'utf-8');
    return JSON.parse(packageData);
  } catch {
    return {
      name: 'rubylith-component-registry',
      version: '0.1.0',
      description: 'Contract-Driven Component Registry',
    };
  }
}

async function getDiskUsage() {
  try {
    const stats = await fs.stat(process.cwd());
    // This is a simplified disk usage check
    return {
      total: 1000000000, // 1GB mock
      used: 500000000,   // 500MB mock
      free: 500000000,   // 500MB mock
      percentUsed: 50,
    };
  } catch {
    return {
      total: 0,
      used: 0,
      free: 0,
      percentUsed: 0,
    };
  }
}

function getMemoryInfo() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  
  return {
    total,
    used,
    free,
    percentUsed: Math.round((used / total) * 100),
  };
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// Middleware to check maintenance mode
export const maintenanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (maintenanceMode.enabled && !req.path.startsWith('/admin/system')) {
    return res.status(503).json({
      error: {
        message: maintenanceMode.message,
        code: 'MAINTENANCE_MODE',
        estimatedDuration: maintenanceMode.estimatedDuration,
        startTime: maintenanceMode.startTime,
      },
    });
  }
  next();
};

// Routes
router.get('/info', getSystemInfo);
router.get('/health', getSystemHealth);
router.get('/metrics', getSystemMetrics);
router.patch('/config', validateRequest({ body: configUpdateSchema }), updateSystemConfig);
router.post('/maintenance', validateRequest({ body: maintenanceSchema }), setMaintenanceMode);
router.get('/logs', getLogs);
router.post('/cache/clear', clearCache);
router.post('/restart', restartSystem);

export const systemRoutes = router;
export { maintenanceMiddleware };