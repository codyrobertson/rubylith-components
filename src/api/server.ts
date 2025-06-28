/**
 * Main API server configuration
 * Sets up Express server with all middleware and routes
 */

import type { Express } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { authMiddleware } from './middleware/auth';
import { apiRouter } from './routes';
import { initializeDatabase } from '../database';
import { specs } from './docs/swagger';

export class ApiServer {
  private app: Express;
  private server: ReturnType<Express['listen']> | null = null;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS configuration
    this.app.use(
      cors({
        origin: config.cors.origins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
    );

    // Body parsing
    this.app.use(express.json({ limit: config.server.bodyLimit }));
    this.app.use(express.urlencoded({ extended: true, limit: config.server.bodyLimit }));

    // Compression
    this.app.use(compression());

    // Request logging
    if (config.server.enableLogging) {
      this.app.use(morgan(config.server.logFormat));
    }

    // Health check endpoint (no auth required)
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Ready check endpoint (checks database connection)
    this.app.get('/ready', async (_req, res) => {
      try {
        await initializeDatabase();
        res.json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res
          .status(503)
          .json({ status: 'not ready', database: 'disconnected', error: errorMessage });
      }
    });

    // API Documentation
    this.app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(specs, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Rubylith Component Registry API',
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          filter: true,
          tryItOutEnabled: true,
        },
      })
    );

    // API specification JSON endpoint
    this.app.get('/api-docs.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(specs);
    });
  }

  private setupRoutes(): void {
    // Public routes (no auth required)
    this.app.use('/api/v1/public', apiRouter.public);

    // Protected routes (auth required)
    this.app.use('/api/v1', authMiddleware, apiRouter.protected);

    // Admin routes (admin auth required)
    this.app.use('/api/v1/admin', authMiddleware, apiRouter.admin);
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Initialize database connection
      await initializeDatabase();
      console.log('Database connection established');

      // Start server
      this.server = this.app.listen(config.server.port, () => {
        console.log(
          `API Server running on port ${config.server.port} in ${config.server.env} mode`
        );
      });

      // Graceful shutdown handlers
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    console.log('Gracefully shutting down...');

    if (this.server) {
      this.server.close(() => {
        console.log('HTTP server closed');
      });
    }

    // Close database connections
    const { closeDatabase } = await import('../database');
    await closeDatabase();

    process.exit(0);
  }

  public getApp(): Express {
    return this.app;
  }
}

// Create and export server instance
export const apiServer = new ApiServer();

// Export function to create server for testing
export function createServer(prismaClient?: any): Express {
  const server = new ApiServer();
  return server.getApp();
}
