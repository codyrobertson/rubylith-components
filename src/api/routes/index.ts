/**
 * Main API router
 * Organizes all API routes into public, protected, and admin sections
 */

import { Router } from 'express';
import { componentRoutes } from './components';
import { contractRoutes } from './contracts';
import { publicEnvironmentRoutes, protectedEnvironmentRoutes } from './environments';
import { authRoutes } from './auth';
import { profileRoutes } from './profiles';
import { healthRoutes } from './health';
import { userAdminRoutes } from './admin/users';
import { auditRoutes } from './admin/audit';
import { systemRoutes } from './admin/system';

// Create routers for different access levels
const publicRouter = Router();
const protectedRouter = Router();
const adminRouter = Router();

// Public routes (no authentication required)
publicRouter.use('/auth', authRoutes);
publicRouter.use('/health', healthRoutes);
publicRouter.use('/environments', publicEnvironmentRoutes);

// Protected routes (authentication required)
protectedRouter.use('/components', componentRoutes);
protectedRouter.use('/contracts', contractRoutes);
protectedRouter.use('/environments', protectedEnvironmentRoutes);
protectedRouter.use('/profiles', profileRoutes);

// Admin routes (admin role required)
adminRouter.use('/users', userAdminRoutes);
adminRouter.use('/audit', auditRoutes);
adminRouter.use('/system', systemRoutes);

export const apiRouter = {
  public: publicRouter,
  protected: protectedRouter,
  admin: adminRouter,
};