/**
 * Request validation middleware
 * Uses Zod schemas to validate request data
 */

import type { Request, Response, NextFunction } from 'express';
import type { AnyZodObject } from 'zod';
import { ZodError } from 'zod';
import { errors } from './errorHandler';

interface ValidationSchema {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

interface ValidationIssue {
  path: (string | number)[];
  message: string;
}

// Helper function to convert Zod issues to a keyed object
const toErrorMap = (issues: ValidationIssue[]) => {
  return issues.reduce<Record<string, string>>((acc, issue) => {
    const path = issue.path
      .map((seg: string | number, index: number) => {
        if (typeof seg === 'number') {
          return `[${seg}]`;
        }
        return index === 0 ? seg : `.${seg}`;
      })
      .join('')
      .replace(/\.?\[(\d+)\]/g, '[$1]'); // Ensure "items[1]" style
    return { ...acc, [path]: issue.message };
  }, {});
};

export const validateRequest = (schema: ValidationSchema | AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Handle legacy single schema format (assume it's for body)
      if ('_def' in schema) {
        const validated = await schema.parseAsync(req.body);
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
        const errorDetails = toErrorMap(error.errors);

        next(errors.validation('Validation failed', errorDetails));
      } else {
        next(error);
      }
    }
  };
};
