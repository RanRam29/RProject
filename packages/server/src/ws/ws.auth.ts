import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export function wsAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token;

  if (!token) {
    logger.warn('WebSocket connection rejected: no token provided');
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      sub: string;
      email: string;
      systemRole: string;
    };

    (socket as Socket & { userId?: string; userEmail?: string }).userId = decoded.sub;
    (socket as Socket & { userId?: string; userEmail?: string }).userEmail = decoded.email;

    next();
  } catch {
    logger.warn('WebSocket connection rejected: invalid token');
    next(new Error('Invalid token'));
  }
}
