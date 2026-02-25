import { getIO } from '../ws/ws.server.js';
import logger from './logger.js';

/**
 * Emit a WebSocket event to a project room.
 * Safe to call even if Socket.IO hasn't been initialized yet (e.g., during tests).
 */
export function emitToProject(projectId: string, event: string, payload: unknown): void {
  try {
    getIO().to(projectId).emit(event, payload);
  } catch {
    logger.warn(`ws-emitter: failed to emit "${event}" to project ${projectId}`);
  }
}

/**
 * Emit a WebSocket event to a user-scoped room (e.g., notifications).
 * Room format: `user:{userId}`
 */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  try {
    getIO().to(`user:${userId}`).emit(event, payload);
  } catch {
    logger.warn(`ws-emitter: failed to emit "${event}" to user ${userId}`);
  }
}
