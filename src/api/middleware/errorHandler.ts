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
  public readonly isOperational: boolean = true;

  constructor(message: string, statusCode: number = 500, code: string = 'ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | ApiError | any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let message = 'Something went wrong';
  let code = 'INTERNAL_ERROR';
  let details: unknown = undefined;
  let isOperational = false;

  // Handle edge cases
  if (!err) {
    err = new Error('Unknown error');
  }

  // Handle known error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details;
    isOperational = err.isOperational;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation error';
    code = 'VALIDATION_ERROR';
    details = err.errors;
    isOperational = true;
  } else if (err instanceof Error) {
    message = err.message || 'Something went wrong';
    if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid authentication token';
      code = 'INVALID_TOKEN';
      isOperational = true;
    } else if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Authentication token expired';
      code = 'TOKEN_EXPIRED';
      isOperational = true;
    } else if (err.name === 'UnauthorizedError') {
      statusCode = 401;
      message = 'Unauthorized access';
      code = 'UNAUTHORIZED';
      isOperational = true;
    }
  }

  // Log non-operational errors
  if (!isOperational) {
    console.error('Non-operational error:', err);
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
  badRequest: (message: string, details?: unknown) => 
    new AppError(message, 400, 'BAD_REQUEST', details),
  
  unauthorized: (message = 'Unauthorized') => 
    new AppError(message, 401, 'UNAUTHORIZED'),
  
  forbidden: (message = 'Forbidden') => 
    new AppError(message, 403, 'FORBIDDEN'),
  
  notFound: (message = 'Not found') => 
    new AppError(message, 404, 'NOT_FOUND'),
  
  conflict: (message = 'Conflict') => 
    new AppError(message, 409, 'CONFLICT'),
  
  validation: (message = 'Validation error', details?: unknown) => 
    new AppError(message, 400, 'VALIDATION_ERROR', details),
  
  internal: (message = 'Internal server error') => 
    new AppError(message, 500, 'INTERNAL_ERROR'),
};