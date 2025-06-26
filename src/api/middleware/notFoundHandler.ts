/**
 * 404 Not Found handler middleware
 */

import type { Request, Response } from 'express';

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: {
      message: 'Resource not found',
      code: 'NOT_FOUND',
      path: req.path,
    },
    timestamp: new Date().toISOString(),
  });
};