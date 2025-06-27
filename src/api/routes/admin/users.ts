/**
 * Admin User Management Routes
 * Handles administrative operations for user accounts
 */

import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { RepositoryFactory } from '../../../database/repositories';
import { PasswordService } from '../../utils/auth';
import { authMiddleware, requireRole, UserRole } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { errors } from '../../middleware/errorHandler';

const router = Router();

// Apply admin authentication to all routes
router.use(authMiddleware);
router.use(requireRole(UserRole.OWNER, UserRole.MAINTAINER));

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().default(true),
});

const updateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
});

const queryUsersSchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.string().transform(val => val === 'true').optional(),
  search: z.string().optional(),
});

const userParamsSchema = z.object({
  id: z.string().min(1),
});

// Route handlers
const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = 50, offset = 0, role, isActive, search }: {
      limit?: number;
      offset?: number;
      role?: UserRole;
      isActive?: boolean;
      search?: string;
    } = req.query;

    const userRepo = RepositoryFactory.getUserRepository();
    
    let users;
    if (search) {
      // Search by email, first name, or last name
      users = await userRepo.findAll();
      users = users.filter(user => 
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(search.toLowerCase())
      );
    } else {
      users = await userRepo.findAll();
    }

    // Apply filters
    if (role !== undefined) {
      users = users.filter(user => user.role === role);
    }
    if (isActive !== undefined) {
      users = users.filter(user => user.isActive === isActive);
    }

    // Apply pagination
    const total = users.length;
    const paginatedUsers = users.slice(offset, offset + limit);

    // Remove passwords from response
    const safeUsers = paginatedUsers.map(({ password, ...user }) => user);

    res.json({
      data: safeUsers,
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

const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const userRepo = RepositoryFactory.getUserRepository();
    const user = await userRepo.findById(id);
    
    if (!user) {
      throw errors.notFound('User not found');
    }

    // Remove password from response
    const { password, ...safeUser } = user;
    
    res.json({ data: safeUser });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, role, isActive }: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      role: UserRole;
      isActive: boolean;
    } = req.body;

    // Only OWNER can create other OWNER accounts
    if (role === UserRole.OWNER && req.user!.role !== UserRole.OWNER) {
      throw errors.forbidden('Only owners can create owner accounts');
    }

    // Validate password strength
    const passwordValidation = PasswordService.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw errors.badRequest('Password does not meet requirements', passwordValidation.errors);
    }

    const userRepo = RepositoryFactory.getUserRepository();
    
    // Check if user already exists
    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) {
      throw errors.conflict('User already exists with this email address');
    }

    // Hash password
    const hashedPassword = await PasswordService.hashPassword(password);

    // Create user
    const user = await userRepo.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      role,
      isActive,
    });

    // Remove password from response
    const { password: _, ...safeUser } = user;

    res.status(201).json({ data: safeUser });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, isActive }: {
      firstName?: string;
      lastName?: string;
      role?: UserRole;
      isActive?: boolean;
    } = req.body;

    const userRepo = RepositoryFactory.getUserRepository();
    
    // Check if user exists
    const existingUser = await userRepo.findById(id);
    if (!existingUser) {
      throw errors.notFound('User not found');
    }

    // Only OWNER can modify OWNER accounts or promote to OWNER
    if ((existingUser.role === UserRole.OWNER || role === UserRole.OWNER) && req.user!.role !== UserRole.OWNER) {
      throw errors.forbidden('Only owners can modify owner accounts');
    }

    // Prevent users from deactivating themselves
    if (id === req.user!.id && isActive === false) {
      throw errors.badRequest('Cannot deactivate your own account');
    }

    // Update user
    const updatedUser = await userRepo.update(id, {
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      role: role ?? undefined,
      isActive: isActive ?? undefined,
    });

    // Remove password from response
    const { password, ...safeUser } = updatedUser;

    res.json({ data: safeUser });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id }: { id: string } = req.params;

    // Only OWNER can delete users
    if (req.user!.role !== UserRole.OWNER) {
      throw errors.forbidden('Only owners can delete user accounts');
    }

    const userRepo = RepositoryFactory.getUserRepository();
    
    // Check if user exists
    const existingUser = await userRepo.findById(id);
    if (!existingUser) {
      throw errors.notFound('User not found');
    }

    // Prevent users from deleting themselves
    if (id === req.user!.id) {
      throw errors.badRequest('Cannot delete your own account');
    }

    // Delete user
    await userRepo.delete(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const resetUserPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id }: { id: string } = req.params;
    const { password }: { password: string } = req.body;

    // Only OWNER and MAINTAINER can reset passwords
    if (!['OWNER', 'MAINTAINER'].includes(req.user!.role)) {
      throw errors.forbidden('Insufficient permissions to reset passwords');
    }

    // Validate password strength
    const passwordValidation = PasswordService.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw errors.badRequest('Password does not meet requirements', passwordValidation.errors);
    }

    const userRepo = RepositoryFactory.getUserRepository();
    
    // Check if user exists
    const existingUser = await userRepo.findById(id);
    if (!existingUser) {
      throw errors.notFound('User not found');
    }

    // Hash new password
    const hashedPassword = await PasswordService.hashPassword(password);

    // Update password
    await userRepo.update(id, { password: hashedPassword });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

// Routes
router.get('/', validateRequest({ query: queryUsersSchema }), listUsers);
router.get('/:id', validateRequest({ params: userParamsSchema }), getUser);
router.post('/', validateRequest({ body: createUserSchema }), createUser);
router.patch('/:id', validateRequest({ params: userParamsSchema, body: updateUserSchema }), updateUser);
router.delete('/:id', validateRequest({ params: userParamsSchema }), deleteUser);
router.post('/:id/reset-password', 
  validateRequest({ 
    params: userParamsSchema, 
    body: z.object({ password: z.string().min(8) }) 
  }), 
  resetUserPassword
);

export const userAdminRoutes = router;