import prisma from '../../config/db.js';
import { WidgetType, Prisma } from '@prisma/client';
import { ApiError } from '../../utils/api-error.js';
import { DEFAULT_TASK_STATUSES } from '@pm/shared';
import { getIO } from '../../ws/ws.server.js';
import { WS_EVENTS } from '../../ws/ws.events.js';

export class ProjectsService {
  async list(userId: string, page = 1, limit = 20, status?: string) {
    try {
      const skip = (page - 1) * limit;

      const where: Prisma.ProjectWhereInput = {
        permissions: {
          some: { userId },
        },
        ...(status && { status: status as 'ACTIVE' | 'ARCHIVED' }),
      };

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          include: {
            owner: {
              select: { id: true, displayName: true, email: true },
            },
            _count: {
              select: { tasks: true, permissions: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.project.count({ where }),
      ]);

      return { data: projects, total, page, limit };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to list projects');
    }
  }

  async getById(projectId: string) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          owner: {
            select: { id: true, displayName: true, email: true },
          },
          taskStatuses: { orderBy: { sortOrder: 'asc' } },
          _count: {
            select: { tasks: true, permissions: true, widgets: true },
          },
        },
      });

      if (!project) {
        throw ApiError.notFound('Project not found');
      }

      return project;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to get project');
    }
  }

  async create(userId: string, name: string, description?: string) {
    try {
      const project = await prisma.project.create({
        data: {
          name,
          description: description || null,
          ownerId: userId,
          permissions: {
            create: {
              userId,
              role: 'OWNER',
            },
          },
          taskStatuses: {
            create: DEFAULT_TASK_STATUSES.map((status, index) => ({
              name: status.name,
              color: status.color,
              sortOrder: index,
            })),
          },
        },
        include: {
          owner: {
            select: { id: true, displayName: true, email: true },
          },
          taskStatuses: { orderBy: { sortOrder: 'asc' } },
          permissions: true,
        },
      });

      return project;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to create project');
    }
  }

  async instantiate(
    userId: string,
    templateId: string,
    name: string,
    description?: string,
  ) {
    try {
      const template = await prisma.template.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw ApiError.notFound('Template not found');
      }

      // Verify user can access this template (public or owned by user)
      if (!template.isPublic && template.createdById !== userId) {
        throw ApiError.forbidden('No access to this template');
      }

      const config = template.configJson as {
        statuses?: Array<{ name: string; color: string; sortOrder: number }>;
        widgets?: Array<{
          type: string;
          title: string;
          configJson: Record<string, unknown>;
          sortOrder: number;
        }>;
      };

      const statuses = config.statuses || DEFAULT_TASK_STATUSES.map((s, i) => ({
        name: s.name,
        color: s.color,
        sortOrder: i,
      }));

      const widgets = config.widgets || [];

      const project = await prisma.project.create({
        data: {
          name,
          description: description || null,
          ownerId: userId,
          permissions: {
            create: {
              userId,
              role: 'OWNER',
            },
          },
          taskStatuses: {
            create: statuses.map((status) => ({
              name: status.name,
              color: status.color,
              sortOrder: status.sortOrder,
            })),
          },
          widgets: {
            create: widgets.map((widget) => ({
              type: widget.type as WidgetType,
              title: widget.title,
              configJson: (widget.configJson || {}) as Prisma.InputJsonValue,
              sortOrder: widget.sortOrder,
            })),
          },
        },
        include: {
          owner: {
            select: { id: true, displayName: true, email: true },
          },
          taskStatuses: { orderBy: { sortOrder: 'asc' } },
          widgets: { orderBy: { sortOrder: 'asc' } },
          permissions: true,
        },
      });

      return project;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to instantiate project from template');
    }
  }

  async update(projectId: string, data: { name?: string; description?: string }) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw ApiError.notFound('Project not found');
      }

      const updated = await prisma.project.update({
        where: { id: projectId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
        },
        include: {
          owner: {
            select: { id: true, displayName: true, email: true },
          },
        },
      });

      getIO().to(projectId).emit(WS_EVENTS.PROJECT_UPDATED, { projectId, changes: data });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to update project');
    }
  }

  async updateStatus(projectId: string, status: 'ACTIVE' | 'ARCHIVED') {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw ApiError.notFound('Project not found');
      }

      if (!['ACTIVE', 'ARCHIVED'].includes(status)) {
        throw ApiError.badRequest('Status must be ACTIVE or ARCHIVED');
      }

      const updated = await prisma.project.update({
        where: { id: projectId },
        data: { status },
      });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to update project status');
    }
  }

  async delete(projectId: string) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw ApiError.notFound('Project not found');
      }

      await prisma.project.delete({
        where: { id: projectId },
      });

      return { message: 'Project deleted successfully' };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to delete project');
    }
  }

  async saveAsTemplate(projectId: string, userId: string) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          taskStatuses: { orderBy: { sortOrder: 'asc' } },
          widgets: { orderBy: { sortOrder: 'asc' } },
        },
      });

      if (!project) {
        throw ApiError.notFound('Project not found');
      }

      const configJson = {
        statuses: project.taskStatuses.map((s) => ({
          name: s.name,
          color: s.color,
          sortOrder: s.sortOrder,
        })),
        widgets: project.widgets.map((w) => ({
          type: w.type,
          title: w.title,
          configJson: w.configJson,
          sortOrder: w.sortOrder,
        })),
      };

      const template = await prisma.template.create({
        data: {
          name: `${project.name} - Template`,
          description: `Template created from project "${project.name}"`,
          configJson,
          isPublic: false,
          createdById: userId,
        },
      });

      return template;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to save project as template');
    }
  }
}

export const projectsService = new ProjectsService();
