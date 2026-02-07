import prisma from '../../config/db.js';

export class AdminService {
  async getLogs(filters: { projectId?: string; userId?: string; action?: string; page?: number; limit?: number }) {
    const { projectId, userId, action, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action };

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: { select: { id: true, displayName: true, email: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStats() {
    const [users, projects, tasks] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.task.count(),
    ]);
    return { users, projects, tasks };
  }
}

export const adminService = new AdminService();
