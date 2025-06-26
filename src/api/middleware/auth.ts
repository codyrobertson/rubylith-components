/**
 * Authentication middleware
 * Handles JWT token validation and user authentication
 */

import type { Request, Response, NextFunction } from 'express';
import { TokenService, AuthenticationError } from '../utils/auth';
import { RepositoryFactory } from '../../database/repositories';
import { errors } from './errorHandler';

// Extend Express Request type to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      token?: string;
    }
  }
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
}

export enum UserRole {
  OWNER = 'OWNER',
  MAINTAINER = 'MAINTAINER',
  CONTRIBUTOR = 'CONTRIBUTOR',
  CONSUMER = 'CONSUMER',
  AUDITOR = 'AUDITOR',
}

/**
 * Main authentication middleware
 * Validates JWT tokens from Authorization header
 */
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const token = TokenService.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      throw errors.unauthorized('No authorization token provided');
    }
    
    // Verify and decode token
    const decoded = TokenService.verifyAccessToken(token);
    
    // Get user from database to ensure they still exist and are active
    const userRepo = RepositoryFactory.getUserRepository();
    const user = await userRepo.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      throw errors.unauthorized('User account not found or inactive');
    }
    
    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };
    req.token = token;
    
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(errors.unauthorized(error.message));
    } else if (error instanceof Error && error.name === 'JsonWebTokenError') {
      next(errors.unauthorized('Invalid authentication token'));
    } else if (error instanceof Error && error.name === 'TokenExpiredError') {
      next(errors.unauthorized('Authentication token expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Role-based access control middleware
 * Checks if user has required role(s)
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(errors.unauthorized());
    }
    
    if (!roles.includes(req.user.role as UserRole)) {
      return next(errors.forbidden('Insufficient role permissions'));
    }
    
    next();
  };
};

/**
 * Permission-based access control middleware
 * Checks if user has minimum required role level
 */
export const requireMinimumRole = (minimumRole: UserRole) => {
  const roleHierarchy = {
    [UserRole.AUDITOR]: 1,
    [UserRole.CONSUMER]: 2,
    [UserRole.CONTRIBUTOR]: 3,
    [UserRole.MAINTAINER]: 4,
    [UserRole.OWNER]: 5,
  };
  
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(errors.unauthorized());
    }
    
    const userRoleLevel = roleHierarchy[req.user.role as UserRole] || 0;
    const requiredRoleLevel = roleHierarchy[minimumRole] || 0;
    
    if (userRoleLevel < requiredRoleLevel) {
      return next(errors.forbidden(`Insufficient permissions. Minimum role required: ${minimumRole}`));
    }
    
    next();
  };
};

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return next();
  }
  
  // If auth header exists, validate it
  return authMiddleware(req, res, next);
};

/**
 * API key authentication middleware
 * Alternative authentication method using API keys
 */
export const apiKeyAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const { config } = await import('../config');
  
  if (!config.security.apiKeys.enabled) {
    return next();
  }
  
  const apiKey = req.headers[config.security.apiKeys.header.toLowerCase()];
  
  if (!apiKey) {
    return next(errors.unauthorized('API key required'));
  }
  
  // TODO: Implement API key validation against database
  // For now, just check if it matches a static key
  if (apiKey !== process.env['MASTER_API_KEY']) {
    return next(errors.unauthorized('Invalid API key'));
  }
  
  // Set a system user for API key access
  req.user = {
    id: 'api-key-user',
    email: 'api@system',
    role: UserRole.CONSUMER,
    isActive: true,
  };
  
  next();
};

// Re-export TokenService functions for backward compatibility
export const generateTokenPair = TokenService.generateTokenPair.bind(TokenService);
export const verifyAccessToken = TokenService.verifyAccessToken.bind(TokenService);
export const verifyRefreshToken = TokenService.verifyRefreshToken.bind(TokenService);