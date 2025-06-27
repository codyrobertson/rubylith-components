/**
 * Unit tests for error handling middleware
 * Tests error responses and custom error types
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler, errors, AppError } from '../errorHandler';
import { config } from '../../config';

// Mock Express request, response, and next
const mockRequest = (data: any = {}): Request => ({
  path: '/api/test',
  method: 'GET',
  ...data,
} as Request);

const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.locals = {};
  return res;
};

const mockNext: NextFunction = vi.fn();

// Mock console methods
// eslint-disable-next-line no-console
const originalConsoleError = console.error;
// eslint-disable-next-line no-console
const originalConsoleLog = console.log;

describe('Error Handler Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line no-console
    console.error = vi.fn();
    // eslint-disable-next-line no-console
    console.log = vi.fn();
  });

  afterEach(() => {
    // eslint-disable-next-line no-console
    console.error = originalConsoleError;
    // eslint-disable-next-line no-console
    console.log = originalConsoleLog;
  });

  describe('AppError class', () => {
    it('should create error with message and status code', () => {
      const error = new AppError('Test error', 404);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('ERROR');
    });

    it('should create error with custom code', () => {
      const error = new AppError('Test error', 400, 'CUSTOM_ERROR');

      expect(error.code).toBe('CUSTOM_ERROR');
    });

    it('should create error with details', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new AppError('Validation failed', 400, 'VALIDATION_ERROR', details);

      expect(error.details).toEqual(details);
    });

    it('should be an instance of Error', () => {
      const error = new AppError('Test error', 500);

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });
  });

  describe('errorHandler middleware', () => {
    it('should handle AppError instances', () => {
      const req = mockRequest();
      const res = mockResponse();
      const error = new AppError('Custom error', 404, 'NOT_FOUND');

      errorHandler(error, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Custom error',
          code: 'NOT_FOUND',
        },
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('should handle AppError with details', () => {
      const req = mockRequest();
      const res = mockResponse();
      const details = { field: 'email', reason: 'already exists' };
      const error = new AppError('Validation error', 400, 'VALIDATION_ERROR', details);

      errorHandler(error, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: details,
        },
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('should handle generic Error instances', () => {
      const req = mockRequest();
      const res = mockResponse();
      const error = new Error('Generic error');

      errorHandler(error, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Generic error',
          code: 'INTERNAL_ERROR',
        },
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('should handle non-Error objects', () => {
      const req = mockRequest();
      const res = mockResponse();
      const error = { custom: 'error object' };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      errorHandler(error as any, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Something went wrong',
          code: 'INTERNAL_ERROR',
        },
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('should handle string errors', () => {
      const req = mockRequest();
      const res = mockResponse();
      const error = 'String error message';

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      errorHandler(error as any, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          message: 'Something went wrong',
          code: 'INTERNAL_ERROR',
        },
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('should include stack trace in development', () => {
      const req = mockRequest();
      const res = mockResponse();
      const error = new Error('Test error');
      
      // Mock development environment
      const originalEnv = config.server.env;
      config.server.env = 'development';

      errorHandler(error, req, res, mockNext);

      const response = (res.json as vi.Mock).mock.calls[0][0];
      expect(response.error.stack).toBeDefined();
      expect(response.error.stack).toContain('Test error');

      // Restore environment
      config.server.env = originalEnv;
    });

    it('should not include stack trace in production', () => {
      const req = mockRequest();
      const res = mockResponse();
      const error = new Error('Test error');
      
      // Mock production environment
      const originalEnv = config.server.env;
      config.server.env = 'production';

      errorHandler(error, req, res, mockNext);

      const response = (res.json as vi.Mock).mock.calls[0][0];
      expect(response.error.stack).toBeUndefined();

      // Restore environment
      config.server.env = originalEnv;
    });

    it('should log non-operational errors', () => {
      const req = mockRequest();
      const res = mockResponse();
      const error = new Error('Unexpected error');

      errorHandler(error, req, res, mockNext);

      // eslint-disable-next-line no-console
      expect(console.error).toHaveBeenCalledWith(
        'Non-operational error:',
        error
      );
    });

    it('should not log operational errors', () => {
      const req = mockRequest();
      const res = mockResponse();
      const error = new AppError('Expected error', 400);

      errorHandler(error, req, res, mockNext);

      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('error generator functions', () => {
    describe('badRequest', () => {
      it('should create 400 error', () => {
        const error = errors.badRequest('Invalid input');

        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('BAD_REQUEST');
        expect(error.message).toBe('Invalid input');
      });

      it('should include details', () => {
        const details = { field: 'email' };
        const error = errors.badRequest('Invalid input', details);

        expect(error.details).toEqual(details);
      });
    });

    describe('unauthorized', () => {
      it('should create 401 error', () => {
        const error = errors.unauthorized('Please login');

        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('UNAUTHORIZED');
        expect(error.message).toBe('Please login');
      });

      it('should use default message', () => {
        const error = errors.unauthorized();

        expect(error.message).toBe('Unauthorized');
      });
    });

    describe('forbidden', () => {
      it('should create 403 error', () => {
        const error = errors.forbidden('Access denied');

        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('FORBIDDEN');
        expect(error.message).toBe('Access denied');
      });

      it('should use default message', () => {
        const error = errors.forbidden();

        expect(error.message).toBe('Forbidden');
      });
    });

    describe('notFound', () => {
      it('should create 404 error', () => {
        const error = errors.notFound('Resource not found');

        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
        expect(error.message).toBe('Resource not found');
      });

      it('should use default message', () => {
        const error = errors.notFound();

        expect(error.message).toBe('Not found');
      });
    });

    describe('conflict', () => {
      it('should create 409 error', () => {
        const error = errors.conflict('Email already exists');

        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('CONFLICT');
        expect(error.message).toBe('Email already exists');
      });

      it('should use default message', () => {
        const error = errors.conflict();

        expect(error.message).toBe('Conflict');
      });
    });

    describe('validation', () => {
      it('should create validation error with details', () => {
        const details = {
          email: 'Invalid email format',
          password: 'Too short',
        };
        const error = errors.validation('Validation failed', details);

        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.message).toBe('Validation failed');
        expect(error.details).toEqual(details);
      });

      it('should use default message', () => {
        const error = errors.validation();

        expect(error.message).toBe('Validation error');
      });
    });

    describe('internal', () => {
      it('should create 500 error', () => {
        const error = errors.internal('Database connection failed');

        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('INTERNAL_ERROR');
        expect(error.message).toBe('Database connection failed');
      });

      it('should use default message', () => {
        const error = errors.internal();

        expect(error.message).toBe('Internal server error');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle error without message', () => {
      const req = mockRequest();
      const res = mockResponse();
      const error = new Error();

      errorHandler(error, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      const response = (res.json as vi.Mock).mock.calls[0][0];
      expect(response.error.message).toBe('Something went wrong');
    });

    it('should handle null error', () => {
      const req = mockRequest();
      const res = mockResponse();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      errorHandler(null as any, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
    });

    it('should handle undefined error', () => {
      const req = mockRequest();
      const res = mockResponse();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      errorHandler(undefined as any, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
    });

    it('should handle very long error messages', () => {
      const req = mockRequest();
      const res = mockResponse();
      const longMessage = 'A'.repeat(1000);
      const error = new AppError(longMessage, 400);

      errorHandler(error, req, res, mockNext);

      const response = (res.json as vi.Mock).mock.calls[0][0];
      expect(response.error.message).toBe(longMessage);
    });

    it('should handle errors with circular references in details', () => {
      const req = mockRequest();
      const res = mockResponse();
      const circularObj: any = { prop: 'value' };
      circularObj.self = circularObj;
      
      const error = new AppError('Error with circular ref', 400, 'CIRCULAR_ERROR', circularObj);

      // Should not throw when handling circular reference
      expect(() => {
        errorHandler(error, req, res, mockNext);
      }).not.toThrow();
    });
  });
});