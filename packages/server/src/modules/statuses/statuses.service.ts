import prisma from '../../config/db.js';
import { ApiError } from '../../utils/api-error.js';
import { getIO } from '../../ws/ws.server.js';
import { WS_EVENTS } from '../../ws/ws.events.js';

export class StatusesService {
  async list(projectId: string) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw ApiError.notFound('Project not found');
      }

      const statuses = await prisma.taskStatus.findMany({
        where: { projectId },
        include: {
          _count: {
            select: { tasks: true },
          },
        },
        orderBy: { sortOrder: 'asc' },
      });

      return statuses;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to list task statuses');
    }
  }

  async create(
    projectId: string,
    data: { name: string; color?: string; sortOrder?: number },
  ) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw ApiError.notFound('Project not found');
      }

      // Check for duplicate name in same project
      const existing = await prisma.taskStatus.findFirst({
        where: { projectId, name: data.name },
      });

      if (existing) {
        throw ApiError.conflict(`Status "${data.name}" already exists in this project`);
      }

      // Determine sort order if not provided
      let sortOrder = data.sortOrder;
      if (sortOrder === undefined) {
        const lastStatus = await prisma.taskStatus.findFirst({
          where: { projectId },
          orderBy: { sortOrder: 'desc' },
        });
        sortOrder = lastStatus ? lastStatus.sortOrder + 1 : 0;
      }

      const status = await prisma.taskStatus.create({
        data: {
          projectId,
          name: data.name,
          color: data.color || '#6B7280',
          sortOrder,
        },
      });

      getIO().to(projectId).emit(WS_EVENTS.STATUS_CREATED, { projectId, status });

      return status;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to create task status');
    }
  }

  async update(
    statusId: string,
    data: { name?: string; color?: string; sortOrder?: number },
  ) {
    try {
      const status = await prisma.taskStatus.findUnique({
        where: { id: statusId },
      });

      if (!status) {
        throw ApiError.notFound('Task status not found');
      }

      // If renaming, check for duplicates
      if (data.name && data.name !== status.name) {
        const existing = await prisma.taskStatus.findFirst({
          where: {
            projectId: status.projectId,
            name: data.name,
            id: { not: statusId },
          },
        });

        if (existing) {
          throw ApiError.conflict(`Status "${data.name}" already exists in this project`);
        }
      }

      const updated = await prisma.taskStatus.update({
        where: { id: statusId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        },
      });

      getIO().to(status.projectId).emit(WS_EVENTS.STATUS_UPDATED, { projectId: status.projectId, statusId, changes: data });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to update task status');
    }
  }

  async delete(statusId: string) {
    try {
      const status = await prisma.taskStatus.findUnique({
        where: { id: statusId },
        include: {
          _count: {
            select: { tasks: true },
          },
        },
      });

      if (!status) {
        throw ApiError.notFound('Task status not found');
      }

      if (status._count.tasks > 0) {
        throw ApiError.badRequest(
          `Cannot delete status "${status.name}" because ${status._count.tasks} task(s) are using it. ` +
          'Move or delete those tasks first.',
        );
      }

      const projectId = status.projectId;

      await prisma.taskStatus.delete({
        where: { id: statusId },
      });

      getIO().to(projectId).emit(WS_EVENTS.STATUS_DELETED, { projectId, statusId });

      return { message: 'Task status deleted successfully' };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to delete task status');
    }
  }
}

export const statusesService = new StatusesService();
