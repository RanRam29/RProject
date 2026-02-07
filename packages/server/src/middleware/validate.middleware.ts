import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../utils/api-error.js';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errors' in err) {
        const zodErr = err as { errors: Array<{ message: string }> };
        const message = zodErr.errors[0]?.message || 'Validation error';
        next(ApiError.badRequest(message));
      } else {
        next(ApiError.badRequest('Validation error'));
      }
    }
  };
}
