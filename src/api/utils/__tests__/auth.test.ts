/**
 * Unit tests for authentication utilities
 * Tests password hashing, JWT token generation, and validation
 */

import { PasswordService, TokenService } from '../auth';
import jwt from 'jsonwebtoken';

describe('Authentication Utilities', () => {
  describe('PasswordService', () => {
    describe('hashPassword', () => {
      it('should hash a plain text password', async () => {
        const plainPassword = 'SecurePassword123!';
        const hashedPassword = await PasswordService.hashPassword(plainPassword);

        expect(hashedPassword).toBeDefined();
        expect(hashedPassword).not.toBe(plainPassword);
        expect(hashedPassword.length).toBeGreaterThan(50);
        expect(hashedPassword).toMatch(/^\$2[aby]\$/); // bcrypt hash format
      });

      it('should generate different hashes for the same password', async () => {
        const plainPassword = 'SecurePassword123!';
        const hash1 = await PasswordService.hashPassword(plainPassword);
        const hash2 = await PasswordService.hashPassword(plainPassword);

        expect(hash1).not.toBe(hash2);
      });

      it('should handle empty password', async () => {
        const plainPassword = '';
        const hashedPassword = await PasswordService.hashPassword(plainPassword);

        expect(hashedPassword).toBeDefined();
        expect(hashedPassword).not.toBe(plainPassword);
      });

      it('should handle very long passwords', async () => {
        const plainPassword = 'A'.repeat(100);
        const hashedPassword = await PasswordService.hashPassword(plainPassword);

        expect(hashedPassword).toBeDefined();
        expect(hashedPassword.length).toBeLessThan(100); // bcrypt has a max length
      });

      it('should handle special characters in password', async () => {
        const plainPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const hashedPassword = await PasswordService.hashPassword(plainPassword);

        expect(hashedPassword).toBeDefined();
        expect(hashedPassword).not.toBe(plainPassword);
      });
    });

    describe('verifyPassword', () => {
      it('should verify correct password', async () => {
        const plainPassword = 'SecurePassword123!';
        const hashedPassword = await PasswordService.hashPassword(plainPassword);
        
        const isValid = await PasswordService.verifyPassword(plainPassword, hashedPassword);
        
        expect(isValid).toBe(true);
      });

      it('should reject incorrect password', async () => {
        const plainPassword = 'SecurePassword123!';
        const wrongPassword = 'WrongPassword123!';
        const hashedPassword = await PasswordService.hashPassword(plainPassword);
        
        const isValid = await PasswordService.verifyPassword(wrongPassword, hashedPassword);
        
        expect(isValid).toBe(false);
      });

      it('should reject empty password against hash', async () => {
        const plainPassword = 'SecurePassword123!';
        const hashedPassword = await PasswordService.hashPassword(plainPassword);
        
        const isValid = await PasswordService.verifyPassword('', hashedPassword);
        
        expect(isValid).toBe(false);
      });

      it('should handle invalid hash format', async () => {
        const plainPassword = 'SecurePassword123!';
        const invalidHash = 'not-a-valid-bcrypt-hash';
        
        await expect(
          PasswordService.verifyPassword(plainPassword, invalidHash)
        ).rejects.toThrow();
      });

      it('should be case sensitive', async () => {
        const plainPassword = 'SecurePassword123!';
        const hashedPassword = await PasswordService.hashPassword(plainPassword);
        
        const isValid = await PasswordService.verifyPassword('securepassword123!', hashedPassword);
        
        expect(isValid).toBe(false);
      });
    });
  });

  describe('TokenService', () => {
    const mockUser = {
      id: 'test-user-id',
      role: 'CONTRIBUTOR',
    };

    // Store original env values
    const originalSecret = process.env.JWT_SECRET;
    const originalAccessExpiry = process.env.JWT_ACCESS_TOKEN_EXPIRES_IN;
    const originalRefreshExpiry = process.env.JWT_REFRESH_TOKEN_EXPIRES_IN;

    beforeEach(() => {
      // Set test JWT configuration
      process.env.JWT_SECRET = 'test-secret-key-for-testing';
      process.env.JWT_ACCESS_TOKEN_EXPIRES_IN = '15m';
      process.env.JWT_REFRESH_TOKEN_EXPIRES_IN = '7d';
    });

    afterEach(() => {
      // Restore original env values
      process.env.JWT_SECRET = originalSecret;
      process.env.JWT_ACCESS_TOKEN_EXPIRES_IN = originalAccessExpiry;
      process.env.JWT_REFRESH_TOKEN_EXPIRES_IN = originalRefreshExpiry;
    });

    describe('generateAccessToken', () => {
      it('should generate a valid access token', () => {
        const token = TokenService.generateAccessToken(mockUser);

        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3); // JWT format
      });

      it('should include user payload in token', () => {
        const token = TokenService.generateAccessToken(mockUser);
        const decoded = jwt.decode(token) as any;

        expect(decoded).toBeDefined();
        expect(decoded.userId).toBe(mockUser.id);
        expect(decoded.role).toBe(mockUser.role);
        expect(decoded.type).toBe('access');
      });

      it('should set correct expiration time', () => {
        const token = TokenService.generateAccessToken(mockUser);
        const decoded = jwt.decode(token) as any;

        expect(decoded.exp).toBeDefined();
        expect(decoded.iat).toBeDefined();
        
        // Check expiration is approximately 15 minutes
        const expirationTime = decoded.exp - decoded.iat;
        expect(expirationTime).toBe(15 * 60); // 15 minutes in seconds
      });

      it('should generate different tokens for same user', () => {
        const token1 = TokenService.generateAccessToken(mockUser);
        const token2 = TokenService.generateAccessToken(mockUser);

        expect(token1).not.toBe(token2);
      });

      it('should handle different user roles', () => {
        const ownerUser = { id: 'owner-id', role: 'OWNER' };
        const token = TokenService.generateAccessToken(ownerUser);
        const decoded = jwt.decode(token) as any;

        expect(decoded.role).toBe('OWNER');
      });
    });

    describe('generateRefreshToken', () => {
      it('should generate a valid refresh token', () => {
        const token = TokenService.generateRefreshToken(mockUser);

        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3);
      });

      it('should include user payload in token', () => {
        const token = TokenService.generateRefreshToken(mockUser);
        const decoded = jwt.decode(token) as any;

        expect(decoded).toBeDefined();
        expect(decoded.userId).toBe(mockUser.id);
        expect(decoded.type).toBe('refresh');
      });

      it('should set correct expiration time', () => {
        const token = TokenService.generateRefreshToken(mockUser);
        const decoded = jwt.decode(token) as any;

        expect(decoded.exp).toBeDefined();
        expect(decoded.iat).toBeDefined();
        
        // Check expiration is approximately 7 days
        const expirationTime = decoded.exp - decoded.iat;
        expect(expirationTime).toBe(7 * 24 * 60 * 60); // 7 days in seconds
      });

      it('should not include role in refresh token', () => {
        const token = TokenService.generateRefreshToken(mockUser);
        const decoded = jwt.decode(token) as any;

        expect(decoded.role).toBeUndefined();
      });
    });

    describe('verifyToken', () => {
      it('should verify valid access token', () => {
        const token = TokenService.generateAccessToken(mockUser);
        const decoded = TokenService.verifyToken(token);

        expect(decoded).toBeDefined();
        expect(decoded.userId).toBe(mockUser.id);
        expect(decoded.role).toBe(mockUser.role);
        expect(decoded.type).toBe('access');
      });

      it('should verify valid refresh token', () => {
        const token = TokenService.generateRefreshToken(mockUser);
        const decoded = TokenService.verifyToken(token);

        expect(decoded).toBeDefined();
        expect(decoded.userId).toBe(mockUser.id);
        expect(decoded.type).toBe('refresh');
      });

      it('should throw error for invalid token', () => {
        const invalidToken = 'invalid.token.here';

        expect(() => {
          TokenService.verifyToken(invalidToken);
        }).toThrow();
      });

      it('should throw error for expired token', () => {
        // Create token with immediate expiration
        const expiredToken = jwt.sign(
          { userId: mockUser.id, type: 'access' },
          process.env.JWT_SECRET!,
          { expiresIn: '0s' }
        );

        expect(() => {
          TokenService.verifyToken(expiredToken);
        }).toThrow();
      });

      it('should throw error for token with wrong secret', () => {
        const wrongSecretToken = jwt.sign(
          { userId: mockUser.id, type: 'access' },
          'wrong-secret-key',
          { expiresIn: '15m' }
        );

        expect(() => {
          TokenService.verifyToken(wrongSecretToken);
        }).toThrow();
      });

      it('should throw error for malformed token', () => {
        const malformedTokens = [
          '',
          'not-a-jwt',
          'missing.parts',
          'too.many.parts.here.invalid',
          null,
          undefined,
        ];

        malformedTokens.forEach(token => {
          expect(() => {
            TokenService.verifyToken(token as any);
          }).toThrow();
        });
      });
    });

    describe('generateTokenPair', () => {
      it('should generate both access and refresh tokens', () => {
        const { accessToken, refreshToken } = TokenService.generateTokenPair(mockUser);

        expect(accessToken).toBeDefined();
        expect(refreshToken).toBeDefined();
        expect(accessToken).not.toBe(refreshToken);
      });

      it('should generate valid tokens', () => {
        const { accessToken, refreshToken } = TokenService.generateTokenPair(mockUser);

        const decodedAccess = TokenService.verifyToken(accessToken);
        const decodedRefresh = TokenService.verifyToken(refreshToken);

        expect(decodedAccess.type).toBe('access');
        expect(decodedRefresh.type).toBe('refresh');
        expect(decodedAccess.userId).toBe(mockUser.id);
        expect(decodedRefresh.userId).toBe(mockUser.id);
      });
    });

    describe('edge cases', () => {
      it('should handle missing JWT_SECRET', () => {
        delete process.env.JWT_SECRET;

        expect(() => {
          TokenService.generateAccessToken(mockUser);
        }).toThrow();
      });

      it('should handle empty user id', () => {
        const invalidUser = { id: '', role: 'CONTRIBUTOR' };
        const token = TokenService.generateAccessToken(invalidUser);
        const decoded = TokenService.verifyToken(token);

        expect(decoded.userId).toBe('');
      });

      it('should handle special characters in user id', () => {
        const specialUser = { id: '!@#$%^&*()', role: 'CONTRIBUTOR' };
        const token = TokenService.generateAccessToken(specialUser);
        const decoded = TokenService.verifyToken(token);

        expect(decoded.userId).toBe(specialUser.id);
      });

      it('should handle custom expiration times', () => {
        process.env.JWT_ACCESS_TOKEN_EXPIRES_IN = '1h';
        
        const token = TokenService.generateAccessToken(mockUser);
        const decoded = jwt.decode(token) as any;
        
        const expirationTime = decoded.exp - decoded.iat;
        expect(expirationTime).toBe(60 * 60); // 1 hour in seconds
      });
    });
  });
});