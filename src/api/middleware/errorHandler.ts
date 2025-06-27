/**
 * Global error handling middleware
 * Catches and formats all errors consistently
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export class AppError extends Error implements ApiError {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details: unknown = undefined;

  // Handle known error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation error';
    code = 'VALIDATION_ERROR';
    details = err.errors;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    code = 'INVALID_TOKEN';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
    code = 'TOKEN_EXPIRED';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized access';
    code = 'UNAUTHORIZED';
  }

  // Log error details in development
  if (config.server.env === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
      code,
      details,
    });
  }

  // Send error response
  const errorResponse: any = {
    error: {
      message,
      code,
    },
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  if (details) {
    errorResponse.error.details = details;
  }

  if (config.server.env === 'development' && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// Common error generators
export const errors = {
  notFound: (resource: string) => 
    new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
  
  unauthorized: (message = 'Unauthorized access') => 
    new AppError(message, 401, 'UNAUTHORIZED'),
  
  forbidden: (message = 'Access forbidden') => 
    new AppError(message, 403, 'FORBIDDEN'),
  
  badRequest: (message: string, details?: unknown) => 
    new AppError(message, 400, 'BAD_REQUEST', details),
  
  conflict: (message: string) => 
    new AppError(message, 409, 'CONFLICT'),
  
  validationError: (details: unknown) => 
    new AppError('Validation error', 400, 'VALIDATION_ERROR', details),
  
  internalError: (message = 'Internal server error') => 
    new AppError(message, 500, 'INTERNAL_ERROR'),
};