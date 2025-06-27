/**
 * Authentication utilities
 * Password hashing and JWT token management
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { User } from '../../../generated/prisma';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// =============================================================================
// Password Hashing
// =============================================================================

export class PasswordService {
  private static readonly SALT_ROUNDS = 12;

  static async hashPassword(plainPassword: string): Promise<string> {
    return await bcrypt.hash(plainPassword, this.SALT_ROUNDS);
  }

  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// =============================================================================
// JWT Token Management
// =============================================================================

export class TokenService {
  private static readonly ACCESS_TOKEN_EXPIRES_IN = '15m';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

  static generateAccessToken(user: { id: string; role: string }): string {
    // Check if JWT_SECRET was explicitly deleted (undefined vs not set)
    if ('JWT_SECRET' in process.env && !process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }
    
    const jwtSecret = process.env.JWT_SECRET || config.auth.jwtSecret;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const payload = {
      userId: user.id,
      role: user.role,
      type: 'access',
      // Add nanosecond precision to ensure uniqueness
      nonce: Date.now() + Math.random(),
    };

    return jwt.sign(payload, jwtSecret, {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || this.ACCESS_TOKEN_EXPIRES_IN,
      issuer: config.auth.jwtIssuer,
      audience: config.auth.jwtAudience,
    });
  }

  static generateRefreshToken(user: { id: string; role: string }): string {
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || config.auth.jwtRefreshSecret;
    if (!jwtRefreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    const payload = {
      userId: user.id,
      type: 'refresh',
      nonce: Date.now() + Math.random(),
    };

    return jwt.sign(payload, jwtRefreshSecret, {
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || this.REFRESH_TOKEN_EXPIRES_IN,
      issuer: config.auth.jwtIssuer,
      audience: config.auth.jwtAudience,
    });
  }

  static verifyToken(token: string): any {
    const jwtSecret = process.env.JWT_SECRET || config.auth.jwtSecret;
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || config.auth.jwtRefreshSecret;
    
    try {
      // Try to verify as access token first
      return jwt.verify(token, jwtSecret, {
        issuer: config.auth.jwtIssuer,
        audience: config.auth.jwtAudience,
      });
    } catch {
      // If that fails, try as refresh token
      try {
        return jwt.verify(token, jwtRefreshSecret, {
          issuer: config.auth.jwtIssuer,
          audience: config.auth.jwtAudience,
        });
      } catch (error) {
        throw new Error('Invalid or expired token');
      }
    }
  }

  static generateTokenPair(user: User): TokenPair {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
    };
  }

  static verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.auth.jwtSecret, {
        issuer: config.auth.jwtIssuer,
        audience: config.auth.jwtAudience,
      }) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  static verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.auth.jwtRefreshSecret, {
        issuer: config.auth.jwtIssuer,
        audience: config.auth.jwtAudience,
      }) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }


  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {return null;}
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1] || null;
  }

  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as TokenPayload;
      if (!decoded || !decoded.exp) {return null;}
      
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }
}

// =============================================================================
// Authentication Errors
// =============================================================================

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class InvalidCredentialsError extends AuthenticationError {
  constructor() {
    super('Invalid email or password');
  }
}

export class TokenExpiredError extends AuthenticationError {
  constructor() {
    super('Token has expired');
  }
}

export class InsufficientPermissionsError extends AuthorizationError {
  constructor(requiredRole?: string) {
    super(requiredRole ? `Insufficient permissions. Required role: ${requiredRole}` : 'Insufficient permissions');
  }
}