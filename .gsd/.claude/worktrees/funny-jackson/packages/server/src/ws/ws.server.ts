import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { wsAuthMiddleware } from './ws.auth.js';
import { WS_EVENTS } from './ws.events.js';
import { logger } from '../utils/logger.js';
import prisma from '../config/db.js';
import { env } from '../config/env.js';

let io: SocketServer | null = null;

// --- WS Rate Limiting ---
const WS_RATE_LIMIT_WINDOW_MS = 10_000; // 10-second sliding window
const WS_RATE_LIMIT_MAX_EVENTS = 50;    // Max client-to-server events per window
const wsRateMap = new Map<string, { count: number; windowStart: number }>();

function isWsRateLimited(socketId: string): boolean {
  const now = Date.now();
  let entry = wsRateMap.get(socketId);

  if (!entry || now - entry.windowStart > WS_RATE_LIMIT_WINDOW_MS) {
    entry = { count: 0, windowStart: now };
    wsRateMap.set(socketId, entry);
  }

  entry.count += 1;
  return entry.count > WS_RATE_LIMIT_MAX_EVENTS;
}

// --- Heartbeat / Auth Re-validation ---
const HEARTBEAT_INTERVAL_MS = 30_000; // Send ping every 30s
const HEARTBEAT_TIMEOUT_MS = 10_000;  // Disconnect if no pong within 10s

export function getIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

/**
 * Evict a user from all project rooms across all their sockets.
 * Called when permissions are revoked for a user on a project.
 */
export function evictUserFromProject(userId: string, projectId: string): void {
  if (!io) return;

  const sockets = io.sockets.sockets;
  for (const [, socket] of sockets) {
    const sockUserId = (socket as Socket & { userId?: string }).userId;
    if (sockUserId === userId && socket.rooms.has(projectId)) {
      socket.leave(projectId);
      socket.emit('error', { message: 'Your access to this project has been revoked' });
      socket.to(projectId).emit(WS_EVENTS.USER_LEFT, { projectId, userId });
      logger.info(`Evicted user ${userId} from project room ${projectId}`);
    }
  }
}

export function initializeWebSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    path: '/ws',
    transports: ['websocket', 'polling'],
    pingInterval: HEARTBEAT_INTERVAL_MS,
    pingTimeout: HEARTBEAT_TIMEOUT_MS,
  });

  io.use(wsAuthMiddleware);

  io.on('connection', (socket) => {
    const userId = (socket as unknown as { userId: string }).userId;
    logger.info(`WebSocket connected: ${userId}`);

    // Join personal notification room
    socket.join(`user:${userId}`);

    // --- Periodic auth re-validation ---
    const authCheckInterval = setInterval(async () => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) {
          logger.warn(`WS auth re-validation failed for ${userId}: no token`);
          socket.emit('error', { message: 'Authentication expired' });
          socket.disconnect(true);
          return;
        }

        // Verify the JWT is still valid
        jwt.verify(token, env.JWT_SECRET);

        // Verify user is still active
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { isActive: true },
        });

        if (!user || !user.isActive) {
          logger.warn(`WS auth re-validation failed for ${userId}: user inactive or deleted`);
          socket.emit('error', { message: 'Account deactivated' });
          socket.disconnect(true);
          return;
        }

        // Re-validate room memberships
        const projectRooms = Array.from(socket.rooms).filter(
          (r) => r !== socket.id && !r.startsWith('user:'),
        );

        if (projectRooms.length > 0) {
          const validPermissions = await prisma.projectPermission.findMany({
            where: { userId, projectId: { in: projectRooms } },
            select: { projectId: true },
          });

          const validProjectIds = new Set(validPermissions.map((p) => p.projectId));

          for (const room of projectRooms) {
            if (!validProjectIds.has(room)) {
              socket.leave(room);
              socket.emit('error', { message: 'Your access to a project has been revoked' });
              socket.to(room).emit(WS_EVENTS.USER_LEFT, { projectId: room, userId });
              logger.info(`Auth re-validation: evicted ${userId} from room ${room}`);
            }
          }
        }
      } catch {
        logger.warn(`WS auth re-validation failed for ${userId}: token invalid`);
        socket.emit('error', { message: 'Authentication expired' });
        socket.disconnect(true);
      }
    }, HEARTBEAT_INTERVAL_MS);

    // --- Rate-limited event wrapper ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function withRateLimit<T extends (...args: any[]) => void | Promise<void>>(handler: T): T {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((...args: any[]) => {
        if (isWsRateLimited(socket.id)) {
          socket.emit('error', { message: 'Rate limit exceeded. Slow down.' });
          return;
        }
        handler(...args);
      }) as T;
    }

    // Join project room
    socket.on(WS_EVENTS.PROJECT_JOIN, withRateLimit(async (projectId: string) => {
      try {
        // Verify user has access to this project
        const permission = await prisma.projectPermission.findUnique({
          where: { projectId_userId: { projectId, userId } },
        });

        if (!permission) {
          socket.emit('error', { message: 'No access to this project' });
          return;
        }

        socket.join(projectId);

        // Notify others in the room
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, displayName: true, avatarUrl: true },
        });

        if (user) {
          socket.to(projectId).emit(WS_EVENTS.USER_JOINED, {
            projectId,
            user: {
              id: user.id,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
            },
          });
        }

        logger.info(`User ${userId} joined project room ${projectId}`);
      } catch (err) {
        logger.error('Error joining project room:', String(err));
      }
    }));

    // Leave project room
    socket.on(WS_EVENTS.PROJECT_LEAVE, withRateLimit((projectId: string) => {
      socket.leave(projectId);
      socket.to(projectId).emit(WS_EVENTS.USER_LEFT, {
        projectId,
        userId,
      });
      logger.info(`User ${userId} left project room ${projectId}`);
    }));

    // Cursor movement (for live presence) — only emit if user is in the room
    socket.on(WS_EVENTS.CURSOR_MOVE, withRateLimit((data: { projectId: string; x: number; y: number }) => {
      if (!socket.rooms.has(data.projectId)) {
        socket.emit('error', { message: 'Not in this project room' });
        return;
      }
      socket.to(data.projectId).emit(WS_EVENTS.CURSORS, {
        projectId: data.projectId,
        cursors: [{ userId, x: data.x, y: data.y }],
      });
    }));

    // Typing indicators
    socket.on(WS_EVENTS.TYPING_START, withRateLimit(async (data: { projectId: string; taskId: string }) => {
      if (!socket.rooms.has(data.projectId)) return;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true },
      });
      socket.to(data.projectId).emit(WS_EVENTS.USER_TYPING, {
        projectId: data.projectId,
        taskId: data.taskId,
        userId,
        displayName: user?.displayName || 'Someone',
        isTyping: true,
      });
    }));

    socket.on(WS_EVENTS.TYPING_STOP, withRateLimit((data: { projectId: string; taskId: string }) => {
      if (!socket.rooms.has(data.projectId)) return;
      socket.to(data.projectId).emit(WS_EVENTS.USER_TYPING, {
        projectId: data.projectId,
        taskId: data.taskId,
        userId,
        displayName: '',
        isTyping: false,
      });
    }));

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      clearInterval(authCheckInterval);
      wsRateMap.delete(socket.id);
      logger.info(`WebSocket disconnected: ${userId}`);
      // Notify all rooms this socket was in
      const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
      rooms.forEach((projectId) => {
        socket.to(projectId).emit(WS_EVENTS.USER_LEFT, {
          projectId,
          userId,
        });
      });
    });
  });

  logger.info('WebSocket server initialized');
  return io;
}
