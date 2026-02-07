import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { wsAuthMiddleware } from './ws.auth.js';
import { WS_EVENTS } from './ws.events.js';
import { logger } from '../utils/logger.js';
import prisma from '../config/db.js';
import { env } from '../config/env.js';

let io: SocketServer | null = null;

export function getIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

export function initializeWebSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    path: '/ws',
    transports: ['websocket', 'polling'],
  });

  io.use(wsAuthMiddleware);

  io.on('connection', (socket) => {
    const userId = (socket as unknown as { userId: string }).userId;
    logger.info(`WebSocket connected: ${userId}`);

    // Join project room
    socket.on(WS_EVENTS.PROJECT_JOIN, async (projectId: string) => {
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
    });

    // Leave project room
    socket.on(WS_EVENTS.PROJECT_LEAVE, (projectId: string) => {
      socket.leave(projectId);
      socket.to(projectId).emit(WS_EVENTS.USER_LEFT, {
        projectId,
        userId,
      });
      logger.info(`User ${userId} left project room ${projectId}`);
    });

    // Cursor movement (for live presence)
    socket.on(WS_EVENTS.CURSOR_MOVE, (data: { projectId: string; x: number; y: number }) => {
      socket.to(data.projectId).emit(WS_EVENTS.CURSORS, {
        projectId: data.projectId,
        cursors: [{ userId, x: data.x, y: data.y }],
      });
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
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
