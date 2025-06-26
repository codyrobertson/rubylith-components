/**
 * Request validation middleware
 * Uses Zod schemas to validate request data
 */

import type { Request, Response, NextFunction } from 'express';
import type { AnyZodObject} from 'zod';
import { ZodError } from 'zod';
import { errors } from './errorHandler';

interface ValidationSchema {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export const validateRequest = (schema: ValidationSchema | AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Handle legacy single schema format (assume it's for body)
      if ('_def' in schema) {
        const validated = await (schema).parseAsync(req.body);
        req.body = validated;
        return next();
      }
      
      // Handle object with specific validation schemas
      const validationSchema = schema;
      
      // Validate each part if schema is provided
      if (validationSchema.body) {
        const validated = await validationSchema.body.parseAsync(req.body);
        req.body = validated;
      }
      
      if (validationSchema.query) {
        const validated = await validationSchema.query.parseAsync(req.query);
        req.query = validated;
      }
      
      if (validationSchema.params) {
        const validated = await validationSchema.params.parseAsync(req.params);
        req.params = validated;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        
        next(errors.validationError(formattedErrors));
      } else {
        next(error);
      }
    }
  };
};