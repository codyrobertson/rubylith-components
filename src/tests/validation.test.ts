import { Request, Response, NextFunction } from 'express';
import { validate, ValidationSchema } from '../api/middleware/validation';
import { ValidationException } from '../utils/errors';

// Mock Express objects
const mockRequest = (body?: any, query?: any, params?: any): Partial<Request> => ({
  body: body || {},
  query: query || {},
  params: params || {}
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext: NextFunction = jest.fn();

describe('Validation Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Required Field Validation', () => {
    const schema: ValidationSchema = {
      body: [
        { field: 'contractId', required: true, type: 'string' },
        { field: 'name', required: true, type: 'string' }
      ]
    };

    test('should pass validation with valid required fields', () => {
      const req = mockRequest({ contractId: 'contract-123', name: 'Test Contract' });
      const res = mockResponse();
      const middleware = validate(schema);

      middleware(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('should fail validation with missing required fields', () => {
      const req = mockRequest({});
      const res = mockResponse();
      const middleware = validate(schema);

      middleware(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [
            {
              field: 'contractId',
              message: 'contractId is required',
              value: undefined
            },
            {
              field: 'name',
              message: 'name is required',
              value: undefined
            }
          ]
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Type Validation', () => {
    const schema: ValidationSchema = {
      body: [
        { field: 'age', required: true, type: 'number' },
        { field: 'active', required: true, type: 'boolean' },
        { field: 'tags', required: true, type: 'array' }
      ]
    };

    test('should pass validation with correct types', () => {
      const req = mockRequest({ 
        age: 25, 
        active: true, 
        tags: ['tag1', 'tag2'] 
      });
      const res = mockResponse();
      const middleware = validate(schema);

      middleware(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    test('should fail validation with incorrect types', () => {
      const req = mockRequest({ 
        age: 'twenty-five', 
        active: 'yes', 
        tags: 'tag1,tag2' 
      });
      const res = mockResponse();
      const middleware = validate(schema);

      middleware(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [
            {
              field: 'age',
              message: 'age must be of type number',
              value: 'twenty-five'
            },
            {
              field: 'active',
              message: 'active must be of type boolean',
              value: 'yes'
            },
            {
              field: 'tags',
              message: 'tags must be of type array',
              value: 'tag1,tag2'
            }
          ]
        }
      });
    });
  });

  describe('String Length Validation', () => {
    const schema: ValidationSchema = {
      body: [
        { field: 'username', required: true, type: 'string', minLength: 3, maxLength: 20 },
        { field: 'password', required: true, type: 'string', minLength: 8 }
      ]
    };

    test('should pass validation with valid string lengths', () => {
      const req = mockRequest({ 
        username: 'testuser', 
        password: 'password123' 
      });
      const res = mockResponse();
      const middleware = validate(schema);

      middleware(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    test('should fail validation with invalid string lengths', () => {
      const req = mockRequest({ 
        username: 'ab', // too short
        password: '123' // too short
      });
      const res = mockResponse();
      const middleware = validate(schema);

      middleware(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [
            {
              field: 'username',
              message: 'username must be at least 3 characters long',
              value: 'ab'
            },
            {
              field: 'password',
              message: 'password must be at least 8 characters long',
              value: '123'
            }
          ]
        }
      });
    });
  });

  describe('Pattern Validation', () => {
    const schema: ValidationSchema = {
      body: [
        { field: 'email', required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        { field: 'version', required: false, type: 'string', pattern: /^\d+\.\d+\.\d+$/ }
      ]
    };

    test('should pass validation with valid patterns', () => {
      const req = mockRequest({ 
        email: 'test@example.com',
        version: '1.0.0'
      });
      const res = mockResponse();
      const middleware = validate(schema);

      middleware(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    test('should fail validation with invalid patterns', () => {
      const req = mockRequest({ 
        email: 'invalid-email',
        version: '1.0'
      });
      const res = mockResponse();
      const middleware = validate(schema);

      middleware(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [
            {
              field: 'email',
              message: 'email format is invalid',
              value: 'invalid-email'
            },
            {
              field: 'version',
              message: 'version format is invalid',
              value: '1.0'
            }
          ]
        }
      });
    });
  });

  describe('Custom Validator', () => {
    const schema: ValidationSchema = {
      body: [
        { 
          field: 'age', 
          required: true, 
          type: 'number',
          validator: (value) => value >= 18 || 'Must be 18 or older'
        },
        {
          field: 'status',
          required: true,
          type: 'string',
          validator: (value) => ['active', 'inactive', 'pending'].includes(value) || 'Status must be active, inactive, or pending'
        }
      ]
    };

    test('should pass validation with valid custom validation', () => {
      const req = mockRequest({ 
        age: 25,
        status: 'active'
      });
      const res = mockResponse();
      const middleware = validate(schema);

      middleware(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    test('should fail validation with invalid custom validation', () => {
      const req = mockRequest({ 
        age: 16,
        status: 'unknown'
      });
      const res = mockResponse();
      const middleware = validate(schema);

      middleware(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [
            {
              field: 'age',
              message: 'Must be 18 or older',
              value: 16
            },
            {
              field: 'status',
              message: 'Status must be active, inactive, or pending',
              value: 'unknown'
            }
          ]
        }
      });
    });
  });

  describe('Query and Parameter Validation', () => {
    const schema: ValidationSchema = {
      query: [
        { field: 'page', required: false, type: 'number' },
        { field: 'limit', required: false, type: 'number' }
      ],
      params: [
        { field: 'id', required: true, type: 'string', minLength: 1 }
      ]
    };

    test('should validate query parameters and route parameters', () => {
      const req = mockRequest(
        {}, // body
        { page: '1', limit: '10' }, // query (note: express query params are strings)
        { id: 'user-123' } // params
      );
      const res = mockResponse();
      const middleware = validate(schema);

      middleware(req as Request, res as Response, mockNext);

      // This would fail because query params are strings, not numbers
      // In a real application, you'd need to parse them or adjust the validation
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});