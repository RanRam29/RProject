import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/api-error';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('No token provided'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      sub: string;
      email: string;
      systemRole: string;
      iat: number;
      exp: number;
    };
    req.user = { ...decoded, id: decoded.sub } as Express.Request['user'];
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

export function requireSystemRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Not authenticated'));
    }
    if (!roles.includes(req.user.systemRole)) {
      return next(ApiError.forbidden('Insufficient system permissions'));
    }
    next();
  };
}
