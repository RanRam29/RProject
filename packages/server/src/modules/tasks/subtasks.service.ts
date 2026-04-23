import prisma from '../../config/db.js';
import { TaskPriority, Prisma } from '@prisma/client';
import { ApiError } from '../../utils/api-error.js';
import { emitToProject } from '../../utils/ws-emitter.js';
import { USER_SELECT_STANDARD } from '../../utils/prisma-selects.js';
import { WS_EVENTS } from '../../ws/ws.events.js';

export class SubtasksService {
  async createSubtask(
    parentTaskId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      statusId: string;
      assigneeId?: string;
      priority?: string;
      startDate?: Date;
      dueDate?: Date;
    },
  ) {
    try {
      const parentTask = await prisma.task.findUnique({
        where: { id: parentTaskId },
      });

      if (!parentTask) {
        throw ApiError.notFound('Parent task not found');
      }

      // Parallelize independent validation queries
      const [status, assigneePermission, lastSubtask] = await Promise.all([
        prisma.taskStatus.findFirst({
          where: { id: data.statusId, projectId: parentTask.projectId },
        }),
        data.assigneeId
          ? prisma.projectPermission.findFirst({
              where: { projectId: parentTask.projectId, userId: data.assigneeId },
            })
          : Promise.resolve(null),
        prisma.task.findFirst({
          where: { parentTaskId },
          orderBy: { sortOrder: 'desc' },
        }),
      ]);

      if (!status) {
        throw ApiError.badRequest('Invalid status for this project');
      }

      if (data.assigneeId && !assigneePermission) {
        throw ApiError.badRequest('Assignee is not a member of this project');
      }

      const sortOrder = lastSubtask ? lastSubtask.sortOrder + 1 : 0;

      const subtask = await prisma.task.create({
        data: {
          projectId: parentTask.projectId,
          parentTaskId,
          creatorId: userId,
          title: data.title,
          description: data.description ? (data.description as Prisma.InputJsonValue) : Prisma.JsonNull,
          statusId: data.statusId,
          assigneeId: data.assigneeId || null,
          priority: (data.priority || 'NONE') as TaskPriority,
          startDate: data.startDate || null,
          dueDate: data.dueDate || null,
          sortOrder,
        },
        include: {
          status: true,
          assignee: {
            select: USER_SELECT_STANDARD,
          },
          creator: {
            select: USER_SELECT_STANDARD,
          },
          parentTask: {
            select: { id: true, title: true },
          },
          labels: {
            include: { label: true },
          },
          comments: {
            select: { id: true },
          },
        },
      });

      emitToProject(parentTask.projectId, WS_EVENTS.SUBTASK_CREATED, { projectId: parentTask.projectId, taskId: parentTaskId, subtask });

      return subtask;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to create subtask');
    }
  }
}

export const subtasksService = new SubtasksService();
