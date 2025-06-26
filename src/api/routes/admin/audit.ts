/**
 * Admin Audit Routes
 * Handles audit logging and security monitoring
 */

import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole, UserRole } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { errors } from '../../middleware/errorHandler';

const router = Router();

// Apply admin authentication to all routes
router.use(authMiddleware);
router.use(requireRole(UserRole.OWNER, UserRole.MAINTAINER, UserRole.AUDITOR));

// Audit log entry interface
interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  statusCode: number;
  userAgent?: string;
  ipAddress?: string;
  details?: Record<string, unknown>;
}

// In-memory audit log (in production, this should be in a database)
const auditLog: AuditLogEntry[] = [];

// Validation schemas
const queryAuditSchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  statusCode: z.string().regex(/^\d+$/).transform(Number).optional(),
});

const auditParamsSchema = z.object({
  id: z.string().min(1),
});

// Audit logging middleware
export const auditMiddleware = (action: string, resource: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;

    // Override response methods to capture status code
    res.send = function(body) {
      logAuditEntry(req, res, action, resource);
      return originalSend.call(this, body);
    };

    res.json = function(body) {
      logAuditEntry(req, res, action, resource);
      return originalJson.call(this, body);
    };

    next();
  };
};

// Helper function to log audit entries
function logAuditEntry(req: Request, res: Response, action: string, resource: string): void {
  const entry: AuditLogEntry = {
    id: generateId(),
    timestamp: new Date(),
    userId: req.user?.id,
    userEmail: req.user?.email,
    action,
    resource,
    resourceId: req.params.id,
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip || req.connection.remoteAddress,
    details: {
      query: req.query,
      body: sanitizeBody(req.body),
    },
  };

  auditLog.push(entry);

  // Keep only last 10000 entries in memory
  if (auditLog.length > 10000) {
    auditLog.splice(0, auditLog.length - 10000);
  }
}

// Generate simple ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Sanitize request body to remove sensitive data
function sanitizeBody(body: unknown): unknown {
  if (typeof body !== 'object' || body === null) {
    return body;
  }

  const sanitized = { ...body as Record<string, unknown> };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

// Route handlers
const getAuditLogs = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      limit = 100, 
      offset = 0, 
      userId, 
      action, 
      resource, 
      startDate, 
      endDate, 
      statusCode 
    }: {
      limit?: number;
      offset?: number;
      userId?: string;
      action?: string;
      resource?: string;
      startDate?: string;
      endDate?: string;
      statusCode?: number;
    } = req.query;

    let filteredLogs = [...auditLog];

    // Apply filters
    if (userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === userId);
    }
    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action.toLowerCase().includes(action.toLowerCase()));
    }
    if (resource) {
      filteredLogs = filteredLogs.filter(log => log.resource.toLowerCase().includes(resource.toLowerCase()));
    }
    if (startDate) {
      const start = new Date(startDate);
      filteredLogs = filteredLogs.filter(log => log.timestamp >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      filteredLogs = filteredLogs.filter(log => log.timestamp <= end);
    }
    if (statusCode !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.statusCode === statusCode);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const total = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    res.json({
      data: paginatedLogs,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLog = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id }: { id: string } = req.params;
    
    const logEntry = auditLog.find(entry => entry.id === id);
    
    if (!logEntry) {
      throw errors.notFound('Audit log entry not found');
    }

    res.json({ data: logEntry });
  } catch (error) {
    next(error);
  }
};

const getAuditStats = (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: auditLog.length,
      last24Hours: auditLog.filter(log => log.timestamp >= last24Hours).length,
      last7Days: auditLog.filter(log => log.timestamp >= last7Days).length,
      byAction: {},
      byResource: {},
      byStatusCode: {},
      recentFailures: auditLog
        .filter(log => log.statusCode >= 400 && log.timestamp >= last24Hours)
        .slice(0, 10),
    };

    // Count by action
    auditLog.forEach(log => {
      const actionKey = log.action;
      stats.byAction[actionKey] = (stats.byAction[actionKey] || 0) + 1;
    });

    // Count by resource
    auditLog.forEach(log => {
      const resourceKey = log.resource;
      stats.byResource[resourceKey] = (stats.byResource[resourceKey] || 0) + 1;
    });

    // Count by status code
    auditLog.forEach(log => {
      const statusKey = log.statusCode.toString();
      stats.byStatusCode[statusKey] = (stats.byStatusCode[statusKey] || 0) + 1;
    });

    res.json({ data: stats });
  } catch (error) {
    next(error);
  }
};

const exportAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only OWNER and AUDITOR can export logs
    if (!['OWNER', 'AUDITOR'].includes(req.user!.role)) {
      throw errors.forbidden('Insufficient permissions to export audit logs');
    }

    const { format = 'json', startDate, endDate }: {
      format?: string;
      startDate?: string;
      endDate?: string;
    } = req.query;

    let logsToExport = [...auditLog];

    // Apply date filters
    if (startDate) {
      const start = new Date(startDate);
      logsToExport = logsToExport.filter(log => log.timestamp >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      logsToExport = logsToExport.filter(log => log.timestamp <= end);
    }

    // Sort by timestamp
    logsToExport.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (format === 'csv') {
      // Convert to CSV
      const csvHeaders = 'Timestamp,User ID,User Email,Action,Resource,Method,Path,Status Code,IP Address\n';
      const csvData = logsToExport.map(log => 
        `${log.timestamp.toISOString()},${log.userId || ''},${log.userEmail || ''},${log.action},${log.resource},${log.method},${log.path},${log.statusCode},${log.ipAddress || ''}`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvHeaders + csvData);
    } else {
      // Return as JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        exportDate: new Date().toISOString(),
        totalEntries: logsToExport.length,
        data: logsToExport,
      });
    }
  } catch (error) {
    next(error);
  }
};

// Routes
router.get('/', validateRequest({ query: queryAuditSchema }), getAuditLogs);
router.get('/stats', getAuditStats);
router.get('/export', exportAuditLogs);
router.get('/:id', validateRequest({ params: auditParamsSchema }), getAuditLog);

export const auditRoutes = router;
export { auditMiddleware };