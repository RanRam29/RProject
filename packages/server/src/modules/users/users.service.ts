import bcrypt from 'bcryptjs';
import prisma from '../../config/db.js';
import { ApiError } from '../../utils/api-error.js';

const SALT_ROUNDS = 12;

export class UsersService {
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
        systemRole: true, isActive: true, createdAt: true, updatedAt: true,
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
        systemRole: true, isActive: true, createdAt: true, updatedAt: true,
      },
    });
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  async update(id: string, data: { displayName?: string; avatarUrl?: string }) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, displayName: true, avatarUrl: true,
        systemRole: true, isActive: true, createdAt: true, updatedAt: true,
      },
    });
  }

  async updateRole(id: string, role: string) {
    return prisma.user.update({
      where: { id },
      data: { systemRole: role as 'SYS_ADMIN' | 'PROJECT_CREATOR' | 'TEMPLATE_MANAGER' | 'VIEWER_ONLY' },
      select: {
        id: true, email: true, displayName: true, avatarUrl: true,
        systemRole: true, isActive: true, createdAt: true, updatedAt: true,
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
