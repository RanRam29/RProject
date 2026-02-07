import prisma from '../../config/db.js';
import { ProjectRole } from '@prisma/client';
import { ApiError } from '../../utils/api-error.js';

export class PermissionsService {
  async list(projectId: string) {
    try {
      const permissions = await prisma.projectPermission.findMany({
        where: { projectId },
        include: {
          user: {
            select: { id: true, displayName: true, email: true, systemRole: true },
          },
          customRole: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      return permissions;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to list permissions');
    }
  }

  async invite(
    projectId: string,
    userId: string,
    role: string,
    customRoleId?: string,
  ) {
    try {
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw ApiError.notFound('Project not found');
      }

      // Check for duplicate permission
      const existing = await prisma.projectPermission.findFirst({
        where: { projectId, userId },
      });

      if (existing) {
        throw ApiError.conflict('User already has a permission in this project');
      }

      // Validate custom role if provided
      if (role === 'CUSTOM' && customRoleId) {
        const customRole = await prisma.customRole.findFirst({
          where: { id: customRoleId, projectId },
        });

        if (!customRole) {
          throw ApiError.badRequest('Custom role not found in this project');
        }
      }

      const permission = await prisma.projectPermission.create({
        data: {
          projectId,
          userId,
          role: role as ProjectRole,
          customRoleId: role === 'CUSTOM' ? customRoleId : null,
        },
        include: {
          user: {
            select: { id: true, displayName: true, email: true },
          },
          customRole: true,
        },
      });

      return permission;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to invite user');
    }
  }

  async update(
    permId: string,
    role: string,
    customRoleId?: string,
    capabilities?: string[],
  ) {
    try {
      const permission = await prisma.projectPermission.findUnique({
        where: { id: permId },
      });

      if (!permission) {
        throw ApiError.notFound('Permission not found');
      }

      // Prevent changing the last OWNER to a non-OWNER role
      if (permission.role === 'OWNER' && role !== 'OWNER') {
        const ownerCount = await prisma.projectPermission.count({
          where: {
            projectId: permission.projectId,
            role: 'OWNER',
          },
        });

        if (ownerCount <= 1) {
          throw ApiError.badRequest(
            'Cannot change role: project must have at least one owner',
          );
        }
      }

      // Validate custom role if applicable
      if (role === 'CUSTOM' && customRoleId) {
        const customRole = await prisma.customRole.findFirst({
          where: { id: customRoleId, projectId: permission.projectId },
        });

        if (!customRole) {
          throw ApiError.badRequest('Custom role not found in this project');
        }
      }

      const updated = await prisma.projectPermission.update({
        where: { id: permId },
        data: {
          role: role as ProjectRole,
          customRoleId: role === 'CUSTOM' ? customRoleId : null,
          ...(capabilities !== undefined && { capabilities }),
        },
        include: {
          user: {
            select: { id: true, displayName: true, email: true },
          },
          customRole: true,
        },
      });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to update permission');
    }
  }

  async remove(permId: string) {
    try {
      const permission = await prisma.projectPermission.findUnique({
        where: { id: permId },
      });

      if (!permission) {
        throw ApiError.notFound('Permission not found');
      }

      // Prevent removing the last OWNER
      if (permission.role === 'OWNER') {
        const ownerCount = await prisma.projectPermission.count({
          where: {
            projectId: permission.projectId,
            role: 'OWNER',
          },
        });

        if (ownerCount <= 1) {
          throw ApiError.badRequest(
            'Cannot remove the last owner from the project',
          );
        }
      }

      await prisma.projectPermission.delete({
        where: { id: permId },
      });

      return { message: 'Permission removed successfully' };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to remove permission');
    }
  }

  async listCustomRoles(projectId: string) {
    try {
      const roles = await prisma.customRole.findMany({
        where: { projectId },
        include: {
          _count: {
            select: { permissions: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return roles;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to list custom roles');
    }
  }

  async createCustomRole(
    projectId: string,
    data: { name: string; description?: string; capabilities: string[] },
  ) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw ApiError.notFound('Project not found');
      }

      // Check for duplicate role name
      const existing = await prisma.customRole.findFirst({
        where: { projectId, name: data.name },
      });

      if (existing) {
        throw ApiError.conflict(`Custom role "${data.name}" already exists in this project`);
      }

      const role = await prisma.customRole.create({
        data: {
          projectId,
          name: data.name,
          description: data.description || null,
          capabilities: data.capabilities,
        },
      });

      return role;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to create custom role');
    }
  }

  async updateCustomRole(
    roleId: string,
    data: { name?: string; description?: string; capabilities?: string[] },
  ) {
    try {
      const role = await prisma.customRole.findUnique({
        where: { id: roleId },
      });

      if (!role) {
        throw ApiError.notFound('Custom role not found');
      }

      // Check for duplicate name if renaming
      if (data.name && data.name !== role.name) {
        const existing = await prisma.customRole.findFirst({
          where: {
            projectId: role.projectId,
            name: data.name,
            id: { not: roleId },
          },
        });

        if (existing) {
          throw ApiError.conflict(`Custom role "${data.name}" already exists in this project`);
        }
      }

      const updated = await prisma.customRole.update({
        where: { id: roleId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.capabilities !== undefined && { capabilities: data.capabilities }),
        },
      });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to update custom role');
    }
  }

  async deleteCustomRole(roleId: string) {
    try {
      const role = await prisma.customRole.findUnique({
        where: { id: roleId },
        include: {
          _count: {
            select: { permissions: true },
          },
        },
      });

      if (!role) {
        throw ApiError.notFound('Custom role not found');
      }

      if (role._count.permissions > 0) {
        throw ApiError.badRequest(
          `Cannot delete custom role "${role.name}" because ${role._count.permissions} permission(s) are using it. ` +
          'Update those permissions first.',
        );
      }

      await prisma.customRole.delete({
        where: { id: roleId },
      });

      return { message: 'Custom role deleted successfully' };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to delete custom role');
    }
  }
}

export const permissionsService = new PermissionsService();
