import prisma from '../../config/db.js';
import { ApiError } from '../../utils/api-error.js';
import { getIO } from '../../ws/ws.server.js';
import { WS_EVENTS } from '../../ws/ws.events.js';
import { emailService } from '../emails/email.service.js';
import logger from '../../utils/logger.js';
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

    // Send email notification (fire-and-forget)
    this.sendEmailForNotification(input).catch((err) => {
      logger.error(`Failed to send email notification: ${err instanceof Error ? err.message : err}`);
    });

    return notification;
  }

  private async sendEmailForNotification(input: CreateNotificationInput) {
    // Fetch the target user to check email preference
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, displayName: true, emailNotifications: true },
    });

    if (!user || !user.emailNotifications) return;

    // Fetch actor name if available
    let actorName = 'Someone';
    if (input.actorId) {
      const actor = await prisma.user.findUnique({
        where: { id: input.actorId },
        select: { displayName: true },
      });
      if (actor) actorName = actor.displayName;
    }

    // Fetch project name if available
    let projectName = 'a project';
    if (input.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        select: { name: true },
      });
      if (project) projectName = project.name;
    }

    // Fetch task title if available
    let taskTitle = '';
    if (input.taskId) {
      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
        select: { title: true },
      });
      if (task) taskTitle = task.title;
    }

    switch (input.type) {
      case 'TASK_ASSIGNED':
        if (input.taskId && input.projectId) {
          await emailService.sendTaskAssignment(
            user.email,
            user.displayName,
            actorName,
            taskTitle || 'Untitled task',
            projectName,
            input.projectId,
            input.taskId,
          );
        }
        break;

      case 'PROJECT_INVITED':
        if (input.projectId) {
          await emailService.sendProjectInvite(
            user.email,
            user.displayName,
            actorName,
            projectName,
            input.projectId,
          );
        }
        break;

      case 'TASK_UPDATED':
        if (input.taskId && input.projectId) {
          await emailService.sendTaskUpdated(
            user.email,
            user.displayName,
            actorName,
            taskTitle || 'Untitled task',
            projectName,
            input.projectId,
            input.taskId,
          );
        }
        break;

      case 'TASK_COMMENTED':
        if (input.taskId && input.projectId) {
          await emailService.sendTaskCommented(
            user.email,
            user.displayName,
            actorName,
            taskTitle || 'Untitled task',
            projectName,
            input.projectId,
            input.taskId,
            input.body || '',
          );
        }
        break;

      default:
        // No email for other notification types (PERMISSION_CHANGED, MENTION, etc.)
        break;
    }
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
