import { ValidationError, ValidationErrorDetail, ErrorOptions } from '../types/errors';

export class ValidationException extends Error {
  public readonly code: string;
  public readonly details: ValidationErrorDetail[];
  public readonly statusCode: number;

  constructor(message: string, options: ErrorOptions = {}) {
    super(message);
    this.name = 'ValidationException';
    this.code = options.code || 'VALIDATION_ERROR';
    this.details = options.details || [];
    this.statusCode = 400;
  }
}

export const errors = {
  validation: (message: string, options: ErrorOptions = {}): ValidationException => {
    return new ValidationException(message, options);
  }
};

export const formatValidationError = (error: ValidationException): ValidationError => {
  return {
    code: error.code,
    message: error.message,
    details: error.details
  };
};