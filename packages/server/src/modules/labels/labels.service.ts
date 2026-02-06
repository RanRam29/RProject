import prisma from '../../config/db';
import { ApiError } from '../../utils/api-error';
import { getIO } from '../../ws/ws.server';
import { WS_EVENTS } from '../../ws/ws.events';

export class LabelsService {
  async list(projectId: string) {
    try {
      const labels = await prisma.label.findMany({
        where: { projectId },
        orderBy: { name: 'asc' },
      });

      return labels;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to list labels');
    }
  }

  async create(projectId: string, data: { name: string; color?: string }) {
    try {
      // Check for duplicate name in project
      const existing = await prisma.label.findFirst({
        where: { projectId, name: data.name },
      });

      if (existing) {
        throw ApiError.conflict('A label with this name already exists in the project');
      }

      const label = await prisma.label.create({
        data: {
          projectId,
          name: data.name,
          color: data.color || '#6B7280',
        },
      });

      getIO().to(projectId).emit(WS_EVENTS.LABEL_CREATED, { projectId, label });

      return label;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to create label');
    }
  }

  async update(labelId: string, data: { name?: string; color?: string }) {
    try {
      const label = await prisma.label.findUnique({
        where: { id: labelId },
      });

      if (!label) {
        throw ApiError.notFound('Label not found');
      }

      // Check for duplicate name if changing
      if (data.name && data.name !== label.name) {
        const existing = await prisma.label.findFirst({
          where: { projectId: label.projectId, name: data.name },
        });

        if (existing) {
          throw ApiError.conflict('A label with this name already exists in the project');
        }
      }

      const updated = await prisma.label.update({
        where: { id: labelId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.color !== undefined && { color: data.color }),
        },
      });

      getIO().to(label.projectId).emit(WS_EVENTS.LABEL_UPDATED, { projectId: label.projectId, labelId, changes: data });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to update label');
    }
  }

  async delete(labelId: string) {
    try {
      const label = await prisma.label.findUnique({
        where: { id: labelId },
      });

      if (!label) {
        throw ApiError.notFound('Label not found');
      }

      const projectId = label.projectId;

      await prisma.label.delete({
        where: { id: labelId },
      });

      getIO().to(projectId).emit(WS_EVENTS.LABEL_DELETED, { projectId, labelId });

      return { message: 'Label deleted successfully' };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to delete label');
    }
  }

  async assignToTask(taskId: string, labelId: string) {
    try {
      const [task, label] = await Promise.all([
        prisma.task.findUnique({ where: { id: taskId } }),
        prisma.label.findUnique({ where: { id: labelId } }),
      ]);

      if (!task) {
        throw ApiError.notFound('Task not found');
      }

      if (!label) {
        throw ApiError.notFound('Label not found');
      }

      if (task.projectId !== label.projectId) {
        throw ApiError.badRequest('Label does not belong to the same project as the task');
      }

      // Check for duplicate assignment
      const existing = await prisma.taskLabel.findFirst({
        where: { taskId, labelId },
      });

      if (existing) {
        throw ApiError.conflict('Label is already assigned to this task');
      }

      const taskLabel = await prisma.taskLabel.create({
        data: { taskId, labelId },
        include: {
          label: true,
        },
      });

      getIO().to(task.projectId).emit(WS_EVENTS.LABEL_ASSIGNED, { projectId: task.projectId, taskId, labelId });

      return taskLabel;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to assign label');
    }
  }

  async removeFromTask(taskId: string, labelId: string) {
    try {
      const taskLabel = await prisma.taskLabel.findFirst({
        where: { taskId, labelId },
        include: { task: { select: { projectId: true } } },
      });

      if (!taskLabel) {
        throw ApiError.notFound('Label assignment not found');
      }

      await prisma.taskLabel.delete({
        where: { id: taskLabel.id },
      });

      getIO().to(taskLabel.task.projectId).emit(WS_EVENTS.LABEL_UNASSIGNED, { projectId: taskLabel.task.projectId, taskId, labelId });

      return { message: 'Label removed from task' };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to remove label from task');
    }
  }
}

export const labelsService = new LabelsService();
