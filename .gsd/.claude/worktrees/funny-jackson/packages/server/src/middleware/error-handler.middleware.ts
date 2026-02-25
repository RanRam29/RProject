import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(', ');
    res.status(400).json({
      success: false,
      error: message,
      details: err.errors,
    });
    return;
  }

  logger.error('Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}
