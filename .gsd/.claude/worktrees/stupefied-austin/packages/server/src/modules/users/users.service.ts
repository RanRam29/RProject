import bcrypt from 'bcryptjs';
import prisma from '../../config/db.js';
import { ApiError } from '../../utils/api-error.js';

const SALT_ROUNDS = 12;

interface MyTasksFilters {
  priority?: string;
  overdue?: boolean;
  dueAfter?: string;
  dueBefore?: string;
  limit?: number;
}

export class UsersService {
  async getMyTasks(userId: string, filters: MyTasksFilters) {
    const where: Record<string, unknown> = { assigneeId: userId };

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.overdue) {
      where.dueDate = { lt: new Date() };
      where.status = { isFinal: false };
    } else if (filters.dueAfter || filters.dueBefore) {
      const dateCond: Record<string, Date> = {};

      if (filters.dueAfter) {
        const afterDate = new Date(filters.dueAfter);
        if (isNaN(afterDate.getTime())) {
          throw ApiError.badRequest('Invalid dueAfter date format');
        }
        dateCond.gte = afterDate;
      }

      if (filters.dueBefore) {
        const beforeDate = new Date(filters.dueBefore);
        if (isNaN(beforeDate.getTime())) {
          throw ApiError.badRequest('Invalid dueBefore date format');
        }
        dateCond.lte = beforeDate;
      }

      where.dueDate = dateCond;
      where.status = { isFinal: false };
    }

    return prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        status: true,
        assignee: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
      take: filters.limit || 20,
    });
  }

  async getMyStats(userId: string) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalTasks, overdueTasks, completedThisWeek, projectIds] = await Promise.all([
      prisma.task.count({
        where: { assigneeId: userId, status: { isFinal: false } },
      }),
      prisma.task.count({
        where: { assigneeId: userId, dueDate: { lt: now }, status: { isFinal: false } },
      }),
      prisma.task.count({
        where: { assigneeId: userId, status: { isFinal: true }, completedAt: { gte: weekAgo } },
      }),
      prisma.projectPermission.findMany({
        where: { userId },
        select: { projectId: true },
      }),
    ]);

    const teamMembers = projectIds.length > 0
      ? await prisma.projectPermission.groupBy({
          by: ['userId'],
          where: { projectId: { in: projectIds.map((p) => p.projectId) } },
        }).then((rows) => rows.length)
      : 0;

    return { totalTasks, overdueTasks, completedThisWeek, teamMembers };
  }

  async getMyActivity(userId: string, limit: number) {
    const projectIds = await prisma.projectPermission.findMany({
      where: { userId },
      select: { projectId: true },
    });

    if (projectIds.length === 0) {
      return [];
    }

    return prisma.activityLog.findMany({
      where: { projectId: { in: projectIds.map((p) => p.projectId) } },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async create(data: { email: string; password: string; displayName: string; systemRole?: string }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw ApiError.conflict('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
        ...(data.systemRole && {
          systemRole: data.systemRole as 'SYS_ADMIN' | 'PROJECT_CREATOR' | 'TEMPLATE_MANAGER' | 'VIEWER_ONLY',
        }),
      },
      select: {
        id: true, email: true, displayName: true, avatarUrl: true,
        systemRole: true, isActive: true, emailNotifications: true, createdAt: true, updatedAt: true,
      },
    });

    return user;
  }

  async list(search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { displayName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, displayName: true, avatarUrl: true,
          systemRole: true, isActive: true, createdAt: true, updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, displayName: true, avatarUrl: true,
        systemRole: true, isActive: true, emailNotifications: true, createdAt: true, updatedAt: true,
      },
    });
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  async update(id: string, data: { displayName?: string; avatarUrl?: string; emailNotifications?: boolean }) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, displayName: true, avatarUrl: true,
        systemRole: true, isActive: true, emailNotifications: true, createdAt: true, updatedAt: true,
      },
    });
  }

  async updateRole(id: string, role: string) {
    return prisma.user.update({
      where: { id },
      data: { systemRole: role as 'SYS_ADMIN' | 'PROJECT_CREATOR' | 'TEMPLATE_MANAGER' | 'VIEWER_ONLY' },
      select: {
        id: true, email: true, displayName: true, avatarUrl: true,
        systemRole: true, isActive: true, emailNotifications: true, createdAt: true, updatedAt: true,
      },
    });
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw ApiError.notFound('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw ApiError.badRequest('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({ where: { id }, data: { passwordHash } });

    return { message: 'Password changed successfully' };
  }

  async deactivate(id: string) {
    return prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const usersService = new UsersService();
