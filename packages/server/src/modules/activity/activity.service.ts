import prisma from '../../config/db.js';
import type { Prisma } from '@prisma/client';

export class ActivityService {
  async log(projectId: string, userId: string, action: string, metadata: Record<string, unknown> = {}) {
    return prisma.activityLog.create({
      data: { projectId, userId, action, metadata: metadata as Prisma.InputJsonValue },
    });
  }

  async list(projectId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { projectId },
        include: {
          user: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where: { projectId } }),
    ]);

    return { data: logs, total, page, limit };
  }
}

export const activityService = new ActivityService();
