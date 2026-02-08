import prisma from '../../config/db.js';
import { ApiError } from '../../utils/api-error.js';
import { getIO } from '../../ws/ws.server.js';
import { WS_EVENTS } from '../../ws/ws.events.js';
import type { NotificationType, Prisma } from '@prisma/client';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  projectId?: string;
  taskId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export class NotificationsService {
  async list(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const skip = (page - 1) * limit;
    const where = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return { data: notifications, total, page, limit };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async create(input: CreateNotificationInput) {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        projectId: input.projectId ?? null,
        taskId: input.taskId ?? null,
        actorId: input.actorId ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    // Send real-time notification to the target user via their personal room
    try {
      getIO().to(`user:${input.userId}`).emit(WS_EVENTS.NOTIFICATION_NEW, { notification });
    } catch {
      // Socket may not be initialized in tests
    }

    return notification;
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }

    if (notification.userId !== userId) {
      throw ApiError.forbidden('Cannot modify another user\'s notifications');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { count: result.count };
  }

  async delete(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }

    if (notification.userId !== userId) {
      throw ApiError.forbidden('Cannot delete another user\'s notifications');
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification deleted' };
  }

  async deleteAll(userId: string) {
    const result = await prisma.notification.deleteMany({
      where: { userId },
    });

    return { count: result.count };
  }
}

export const notificationsService = new NotificationsService();
