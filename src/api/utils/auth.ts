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

  static generateTokenPair(user: User): TokenPair {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
      issuer: config.auth.jwtIssuer,
      audience: config.auth.jwtAudience,
    });

    const refreshToken = jwt.sign(payload, config.auth.jwtRefreshSecret, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      issuer: config.auth.jwtIssuer,
      audience: config.auth.jwtAudience,
    });

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

  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      },
      config.auth.jwtSecret,
      {
        expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
        issuer: config.auth.jwtIssuer,
        audience: config.auth.jwtAudience,
      }
    );
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