/**
 * Unit tests for validation middleware
 * Tests request validation with Zod schemas
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateRequest } from '../validation';
import { errors } from '../errorHandler';

// Mock Express request, response, and next
const mockRequest = (data: any = {}): Request => ({
  body: data.body || {},
  query: data.query || {},
  params: data.params || {},
  headers: data.headers || {},
  ...data,
} as Request);

const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

describe('Validation Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateRequest', () => {
    describe('body validation', () => {
      const bodySchema = z.object({
        name: z.string().min(1),
        age: z.number().positive(),
        email: z.string().email(),
      });

      it('should pass validation with valid body', async () => {
        const req = mockRequest({
          body: {
            name: 'John Doe',
            age: 25,
            email: 'john@example.com',
          },
        });
        const res = mockResponse();
        const middleware = validateRequest({ body: bodySchema });

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should fail validation with invalid body', async () => {
        const req = mockRequest({
          body: {
            name: '', // Empty name
            age: -5, // Negative age
            email: 'not-an-email', // Invalid email
          },
        });
        const res = mockResponse();
        const middleware = validateRequest({ body: bodySchema });

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        expect(mockNext).toHaveBeenCalledTimes(1);
        
        const error = (mockNext as any).mock.calls[0][0];
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('VALIDATION_ERROR');
      });

      it('should fail validation with missing required fields', async () => {
        const req = mockRequest({
          body: {
            name: 'John Doe',
            // Missing age and email
          },
        });
        const res = mockResponse();
        const middleware = validateRequest({ body: bodySchema });

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = (mockNext as any).mock.calls[0][0];
        expect(error.details).toHaveProperty('age');
        expect(error.details).toHaveProperty('email');
      });

      it('should fail validation with wrong types', async () => {
        const req = mockRequest({
          body: {
            name: 123, // Should be string
            age: '25', // Should be number
            email: true, // Should be string
          },
        });
        const res = mockResponse();
        const middleware = validateRequest({ body: bodySchema });

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = (mockNext as any).mock.calls[0][0];
        expect(error.statusCode).toBe(400);
      });
    });

    describe('query validation', () => {
      const querySchema = z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/).transform(Number).optional(),
        search: z.string().optional(),
      });

      it('should pass validation with valid query', async () => {
        const req = mockRequest({
          query: {
            page: '1',
            limit: '10',
            search: 'test',
          },
        });
        const res = mockResponse();
        const middleware = validateRequest({ query: querySchema });

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(req.query.page).toBe(1); // Transformed to number
        expect(req.query.limit).toBe(10); // Transformed to number
      });

      it('should pass validation with optional query params', async () => {
        const req = mockRequest({
          query: {}, // All params are optional
        });
        const res = mockResponse();
        const middleware = validateRequest({ query: querySchema });

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should fail validation with invalid query format', async () => {
        const req = mockRequest({
          query: {
            page: 'not-a-number',
            limit: 'abc',
          },
        });
        const res = mockResponse();
        const middleware = validateRequest({ query: querySchema });

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = (mockNext as any).mock.calls[0][0];
        expect(error.statusCode).toBe(400);
      });
    });

    describe('params validation', () => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
      });

      it('should pass validation with valid params', async () => {
        const req = mockRequest({
          params: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            version: '1.0.0',
          },
        });
        const res = mockResponse();
        const middleware = validateRequest({ params: paramsSchema });

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should fail validation with invalid UUID', async () => {
        const req = mockRequest({
          params: {
            id: 'not-a-uuid',
            version: '1.0.0',
          },
        });
        const res = mockResponse();
        const middleware = validateRequest({ params: paramsSchema });

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = (mockNext as any).mock.calls[0][0];
        expect(error.details).toHaveProperty('id');
      });

      it('should fail validation with invalid version format', async () => {
        const req = mockRequest({
          params: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            version: '1.0', // Invalid semver
          },
        });
        const res = mockResponse();
        const middleware = validateRequest({ params: paramsSchema });

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = (mockNext as any).mock.calls[0][0];
        expect(error.details).toHaveProperty('version');
      });
    });

    describe('combined validation', () => {
      const schemas = {
        body: z.object({
          name: z.string(),
        }),
        query: z.object({
          filter: z.string().optional(),
        }),
        params: z.object({
          id: z.string(),
        }),
      };

      it('should validate all request parts', async () => {
        const req = mockRequest({
          body: { name: 'Test' },
          query: { filter: 'active' },
          params: { id: '123' },
        });
        const res = mockResponse();
        const middleware = validateRequest(schemas);

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should fail if any part fails validation', async () => {
        const req = mockRequest({
          body: { name: 'Test' },
          query: { filter: 'active' },
          params: {}, // Missing id
        });
        const res = mockResponse();
        const middleware = validateRequest(schemas);

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = (mockNext as any).mock.calls[0][0];
        expect(error.details).toHaveProperty('id');
      });
    });

    describe('error handling', () => {
      it('should handle Zod parsing errors', async () => {
        const schema = z.object({
          nested: z.object({
            deep: z.object({
              value: z.number(),
            }),
          }),
        });

        const req = mockRequest({
          body: {
            nested: {
              deep: {
                value: 'not-a-number',
              },
            },
          },
        });
        const res = mockResponse();
        const middleware = validateRequest({ body: schema });

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = (mockNext as any).mock.calls[0][0];
        expect(error.details).toHaveProperty('nested.deep.value');
      });

      it('should handle array validation errors', async () => {
        const schema = z.object({
          items: z.array(z.string().email()),
        });

        const req = mockRequest({
          body: {
            items: ['valid@email.com', 'invalid-email', 'another@valid.com'],
          },
        });
        const res = mockResponse();
        const middleware = validateRequest({ body: schema });

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        const error = (mockNext as any).mock.calls[0][0];
        expect(error.details).toHaveProperty('items[1]');
      });

      it('should provide clear error messages', async () => {
        const schema = z.object({
          email: z.string().email('Must be a valid email'),
          age: z.number().min(18, 'Must be at least 18'),
        });

        const req = mockRequest({
          body: {
            email: 'not-email',
            age: 15,
          },
        });
        const res = mockResponse();
        const middleware = validateRequest({ body: schema });

        await middleware(req, res, mockNext);

        const error = (mockNext as any).mock.calls[0][0];
        expect(error.details.email).toContain('Must be a valid email');
        expect(error.details.age).toContain('Must be at least 18');
      });
    });

    describe('edge cases', () => {
      it('should handle empty validation schemas', async () => {
        const req = mockRequest();
        const res = mockResponse();
        const middleware = validateRequest({});

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should handle undefined request parts', async () => {
        const schema = z.object({
          name: z.string(),
        });

        const req = mockRequest();
        req.body = undefined as any;
        
        const res = mockResponse();
        const middleware = validateRequest({ body: schema });

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      });

      it('should handle circular references in request data', async () => {
        const schema = z.object({
          name: z.string(),
        });

        const circularObj: any = { name: 'test' };
        circularObj.self = circularObj;

        const req = mockRequest({
          body: circularObj,
        });
        const res = mockResponse();
        const middleware = validateRequest({ body: schema });

        await middleware(req, res, mockNext);

        // Should handle circular reference gracefully
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });
});