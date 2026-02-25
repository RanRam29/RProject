import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const allowedOrigins = env.CLIENT_URL
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

/**
 * Origin/Referer validation middleware for state-changing requests.
 *
 * For JWT-based SPAs, OWASP recommends verifying the Origin header
 * on mutating requests rather than traditional CSRF tokens.
 * Combined with strict CORS, this prevents cross-site request forgery.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // Allow requests with a valid Origin header
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      return next();
    }
    logger.warn(`CSRF: Blocked request from origin ${origin}`);
    res.status(403).json({ success: false, error: 'Forbidden: invalid origin' });
    return;
  }

  // Fall back to Referer header check
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (allowedOrigins.includes(refererOrigin)) {
        return next();
      }
    } catch {
      // invalid referer URL
    }
    logger.warn(`CSRF: Blocked request with referer ${referer}`);
    res.status(403).json({ success: false, error: 'Forbidden: invalid referer' });
    return;
  }

  // No Origin or Referer — allow only if request comes from non-browser clients
  // (e.g. curl, Postman). Browsers always send Origin on cross-origin requests.
  // For extra safety in production, you could reject these too.
  next();
}
