import { Request, Response, NextFunction } from 'express';
import { errors, ValidationException, formatValidationError } from '../../utils/errors';
import { ValidationErrorDetail } from '../../types/errors';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validator?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  body?: ValidationRule[];
  query?: ValidationRule[];
  params?: ValidationRule[];
}

/**
 * Validation middleware that returns detailed error responses
 * 
 * @param schema - Validation schema defining rules for request validation
 * @returns Express middleware function
 */
export const validate = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errorDetails: ValidationErrorDetail[] = [];

    // Validate request body
    if (schema.body) {
      const bodyErrors = validateFields(req.body || {}, schema.body);
      errorDetails.push(...bodyErrors);
    }

    // Validate query parameters
    if (schema.query) {
      const queryErrors = validateFields(req.query || {}, schema.query);
      errorDetails.push(...queryErrors);
    }

    // Validate route parameters
    if (schema.params) {
      const paramErrors = validateFields(req.params || {}, schema.params);
      errorDetails.push(...paramErrors);
    }

    // If validation errors exist, throw detailed validation error
    if (errorDetails.length > 0) {
      const validationError = errors.validation('Request validation failed', {
        code: 'VALIDATION_ERROR',
        details: errorDetails
      });
      
      return res.status(400).json({
        error: formatValidationError(validationError)
      });
    }

    next();
  };
};

/**
 * Validates fields against validation rules
 */
function validateFields(data: any, rules: ValidationRule[]): ValidationErrorDetail[] {
  const errors: ValidationErrorDetail[] = [];

  for (const rule of rules) {
    const value = data[rule.field];
    const error = validateField(rule.field, value, rule);
    
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

/**
 * Validates a single field against a validation rule
 */
function validateField(fieldName: string, value: any, rule: ValidationRule): ValidationErrorDetail | null {
  // Check required fields
  if (rule.required && (value === undefined || value === null || value === '')) {
    return {
      field: fieldName,
      message: `${fieldName} is required`,
      value
    };
  }

  // Skip validation for optional empty fields
  if (!rule.required && (value === undefined || value === null || value === '')) {
    return null;
  }

  // Type validation
  if (rule.type && !isValidType(value, rule.type)) {
    return {
      field: fieldName,
      message: `${fieldName} must be of type ${rule.type}`,
      value
    };
  }

  // String length validation
  if (typeof value === 'string') {
    if (rule.minLength && value.length < rule.minLength) {
      return {
        field: fieldName,
        message: `${fieldName} must be at least ${rule.minLength} characters long`,
        value
      };
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      return {
        field: fieldName,
        message: `${fieldName} must be no more than ${rule.maxLength} characters long`,
        value
      };
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      return {
        field: fieldName,
        message: `${fieldName} format is invalid`,
        value
      };
    }
  }

  // Custom validator
  if (rule.validator) {
    const result = rule.validator(value);
    if (result !== true) {
      return {
        field: fieldName,
        message: typeof result === 'string' ? result : `${fieldName} is invalid`,
        value
      };
    }
  }

  return null;
}

/**
 * Checks if value matches expected type
 */
function isValidType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return true;
  }
}

/**
 * Example validation schemas for common use cases
 */
export const commonSchemas = {
  contractValidation: {
    body: [
      { field: 'contractId', required: true, type: 'string' as const, minLength: 1 },
      { field: 'name', required: true, type: 'string' as const, minLength: 1, maxLength: 100 },
      { field: 'version', required: false, type: 'string' as const, pattern: /^\d+\.\d+\.\d+$/ },
      { field: 'components', required: true, type: 'array' as const }
    ]
  },
  
  componentValidation: {
    body: [
      { field: 'id', required: true, type: 'string' as const, minLength: 1 },
      { field: 'type', required: true, type: 'string' as const },
      { field: 'props', required: false, type: 'object' as const },
      { field: 'enabled', required: false, type: 'boolean' as const }
    ]
  }
};

/**
 * Error handler middleware for validation exceptions
 */
export const validationErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof ValidationException) {
    return res.status(error.statusCode).json({
      error: formatValidationError(error)
    });
  }
  
  next(error);
};