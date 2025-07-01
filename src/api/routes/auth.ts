/**
 * Authentication routes
 * Handles user registration, login, and token management
 */

import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { PasswordService, TokenService, InvalidCredentialsError } from '../utils/auth';
import { RepositoryFactory } from '../../database/repositories';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { errors } from '../middleware/errorHandler';

const router = Router();

// =============================================================================
// Validation Schemas
// =============================================================================

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * POST /auth/register
 * Register a new user account
 */
router.post('/register', validateRequest({ body: registerSchema }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name }: {
      email: string;
      password: string;
      name: string;
    } = req.body;
    
    // Split name into firstName and lastName
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Validate password strength
    const passwordValidation = PasswordService.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors,
      });
      return;
    }
    
    const userRepo = RepositoryFactory.getUserRepository();
    
    // Check if user already exists
    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) {
      res.status(409).json({
        error: 'User already exists with this email address',
      });
      return;
    }
    
    // Hash password
    const hashedPassword = await PasswordService.hashPassword(password);
    
    // Create user
    const user = await userRepo.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      role: 'CONSUMER', // Default role
      status: 'ACTIVE',
    });
    
    // Generate tokens
    const tokens = TokenService.generateTokenPair(user);
    
    // Return success response (exclude password)
    res.status(201).json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        tokens,
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/login
 * Authenticate user and return tokens
 */
router.post('/login', validateRequest({ body: loginSchema }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password }: { email: string; password: string } = req.body;
    
    const userRepo = RepositoryFactory.getUserRepository();
    
    // Find user by email
    const user = await userRepo.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError();
    }
    
    // Check if user is active
    if (user.status !== 'ACTIVE') {
      res.status(403).json({
        error: 'Account is inactive. Please contact support.',
      });
      return;
    }
    
    // Verify password
    const isValidPassword = await PasswordService.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new InvalidCredentialsError();
    }
    
    // Update last login timestamp
    await userRepo.updateLastLogin(user.id);
    
    // Generate tokens
    const tokens = TokenService.generateTokenPair(user);
    
    // Return success response (exclude password)
    res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          role: user.role,
          status: user.status,
          lastLoginAt: new Date(),
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        tokens,
      }
    });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      next(errors.unauthorized(error.message));
    } else {
      next(error);
    }
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', validateRequest({ body: refreshTokenSchema }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken }: { refreshToken: string } = req.body;
    
    // Verify refresh token
    const decoded = TokenService.verifyRefreshToken(refreshToken);
    
    // Get user from database to ensure they still exist and are active
    const userRepo = RepositoryFactory.getUserRepository();
    const user = await userRepo.findById(decoded.userId);
    
    if (!user || user.status !== 'ACTIVE') {
      res.status(401).json({
        error: 'User account not found or inactive',
      });
      return;
    }
    
    // Generate new access token
    const newAccessToken = TokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    
    res.json({
      data: {
        accessToken: newAccessToken,
        expiresIn: 3600 // 1 hour in seconds
      }
    });
  } catch (error) {
    next(errors.unauthorized('Invalid refresh token'));
  }
});

/**
 * POST /auth/logout
 * Logout user (for completeness, mainly clears client-side tokens)
 */
router.post('/logout', authMiddleware, (_req: Request, res: Response) => {
  // In a JWT system, logout is typically handled client-side by removing tokens
  // This endpoint exists for completeness and future token blacklisting
  res.json({
    message: 'Logged out successfully',
  });
});

/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userRepo = RepositoryFactory.getUserRepository();
    const user = await userRepo.findById(req.user!.id);
    
    if (!user) {
      next(errors.notFound('User not found'));
      return;
    }
    
    // Return user profile (exclude password)
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /auth/me
 * Update current user profile
 */
router.put('/me', authMiddleware, validateRequest({
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
  }),
}), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email }: {
      firstName?: string;
      lastName?: string;
      email?: string;
    } = req.body;
    const userRepo = RepositoryFactory.getUserRepository();
    
    // If email is being updated, check if it's already taken
    if (email && email !== req.user!.email) {
      const existingUser = await userRepo.findByEmail(email);
      if (existingUser) {
        res.status(409).json({
          error: 'Email address is already taken',
        });
        return;
      }
    }
    
    // Update user
    const updatedUser = await userRepo.update(req.user!.id, {
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      email: email ? email.toLowerCase() : undefined,
    });
    
    // Return updated user profile (exclude password)
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        status: updatedUser.status,
        lastLoginAt: updatedUser.lastLoginAt,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

export const authRoutes = router;