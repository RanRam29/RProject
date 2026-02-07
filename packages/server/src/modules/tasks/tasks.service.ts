import prisma from '../../config/db.js';
import { TaskPriority, Prisma } from '@prisma/client';
import { ApiError } from '../../utils/api-error.js';
import { getIO } from '../../ws/ws.server.js';
import { WS_EVENTS } from '../../ws/ws.events.js';
import { activityService } from '../activity/activity.service.js';

interface TaskFilters {
  statusId?: string;
  assigneeId?: string;
  parentTaskId?: string | null;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class TasksService {
  async list(projectId: string, filters: TaskFilters = {}) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = { projectId };

      if (filters.statusId) {
        where.statusId = filters.statusId;
      }

      if (filters.assigneeId) {
        where.assigneeId = filters.assigneeId;
      }

      if (filters.parentTaskId !== undefined) {
        where.parentTaskId = filters.parentTaskId;
      }

      if (filters.priority) {
        where.priority = filters.priority;
      }

      if (filters.search) {
        where.title = { contains: filters.search, mode: 'insensitive' };
      }

      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where,
          include: {
            status: true,
            assignee: {
              select: { id: true, displayName: true, email: true },
            },
            subtasks: {
              include: {
                status: true,
                assignee: {
                  select: { id: true, displayName: true, email: true },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
            blockedBy: {
              include: {
                blockingTask: {
                  select: { id: true, title: true, statusId: true },
                },
              },
            },
            blocking: {
              include: {
                blockedTask: {
                  select: { id: true, title: true, statusId: true },
                },
              },
            },
            labels: {
              include: { label: true },
            },
            comments: {
              select: { id: true },
            },
            _count: {
              select: { subtasks: true },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        prisma.task.count({ where }),
      ]);

      return { data: tasks, total, page, limit };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to list tasks');
    }
  }

  async getById(taskId: string) {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          status: true,
          project: {
            select: { id: true, name: true },
          },
          assignee: {
            select: { id: true, displayName: true, email: true },
          },
          creator: {
            select: { id: true, displayName: true, email: true },
          },
          parentTask: {
            select: { id: true, title: true },
          },
          subtasks: {
            include: {
              status: true,
              assignee: {
                select: { id: true, displayName: true, email: true },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
          blockedBy: {
            include: {
              blockingTask: {
                include: {
                  status: true,
                },
              },
            },
          },
          blocking: {
            include: {
              blockedTask: {
                include: {
                  status: true,
                },
              },
            },
          },
          labels: {
            include: { label: true },
          },
          comments: {
            include: {
              author: {
                select: { id: true, displayName: true, email: true, avatarUrl: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!task) {
        throw ApiError.notFound('Task not found');
      }

      return task;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to get task');
    }
  }

  async create(
    projectId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      statusId: string;
      assigneeId?: string;
      priority?: string;
      startDate?: Date;
      dueDate?: Date;
      sortOrder?: number;
    },
  ) {
    try {
      // Validate status belongs to project
      const status = await prisma.taskStatus.findFirst({
        where: { id: data.statusId, projectId },
      });

      if (!status) {
        throw ApiError.badRequest('Invalid status for this project');
      }

      // Validate assignee has permission if provided
      if (data.assigneeId) {
        const permission = await prisma.projectPermission.findFirst({
          where: { projectId, userId: data.assigneeId },
        });

        if (!permission) {
          throw ApiError.badRequest('Assignee is not a member of this project');
        }
      }

      // Determine sort order
      let sortOrder = data.sortOrder;
      if (sortOrder === undefined) {
        const lastTask = await prisma.task.findFirst({
          where: { projectId, statusId: data.statusId },
          orderBy: { sortOrder: 'desc' },
        });
        sortOrder = lastTask ? lastTask.sortOrder + 1 : 0;
      }

      const task = await prisma.task.create({
        data: {
          projectId,
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
            select: { id: true, displayName: true, email: true },
          },
          creator: {
            select: { id: true, displayName: true, email: true },
          },
        },
      });

      getIO().to(projectId).emit(WS_EVENTS.TASK_CREATED, { projectId, task });
      activityService.log(projectId, userId, 'task.created', { taskId: task.id, title: task.title }).catch(() => {});

      return task;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to create task');
    }
  }

  async update(
    taskId: string,
    data: {
      title?: string;
      description?: string;
      assigneeId?: string | null;
      priority?: string;
      startDate?: Date | null;
      dueDate?: Date | null;
    },
  ) {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw ApiError.notFound('Task not found');
      }

      // Validate assignee if changing
      if (data.assigneeId !== undefined && data.assigneeId !== null) {
        const permission = await prisma.projectPermission.findFirst({
          where: { projectId: task.projectId, userId: data.assigneeId },
        });

        if (!permission) {
          throw ApiError.badRequest('Assignee is not a member of this project');
        }
      }

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
          ...(data.priority !== undefined && { priority: data.priority as TaskPriority }),
          ...(data.startDate !== undefined && { startDate: data.startDate }),
          ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        },
        include: {
          status: true,
          assignee: {
            select: { id: true, displayName: true, email: true },
          },
        },
      });

      getIO().to(task.projectId).emit(WS_EVENTS.TASK_UPDATED, { projectId: task.projectId, taskId, changes: data });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to update task');
    }
  }

  async updateStatus(taskId: string, statusId: string, sortOrder?: number) {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw ApiError.notFound('Task not found');
      }

      // Validate status belongs to same project
      const status = await prisma.taskStatus.findFirst({
        where: { id: statusId, projectId: task.projectId },
      });

      if (!status) {
        throw ApiError.badRequest('Invalid status for this project');
      }

      // Determine sort order in new status column
      let newSortOrder = sortOrder;
      if (newSortOrder === undefined) {
        const lastTask = await prisma.task.findFirst({
          where: { projectId: task.projectId, statusId },
          orderBy: { sortOrder: 'desc' },
        });
        newSortOrder = lastTask ? lastTask.sortOrder + 1 : 0;
      }

      const oldStatusId = task.statusId;

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: {
          statusId,
          sortOrder: newSortOrder,
        },
        include: {
          status: true,
          assignee: {
            select: { id: true, displayName: true, email: true },
          },
        },
      });

      getIO().to(task.projectId).emit(WS_EVENTS.TASK_STATUS_CHANGED, { projectId: task.projectId, taskId, oldStatusId, newStatusId: statusId });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to update task status');
    }
  }

  async reorder(taskId: string, sortOrder: number) {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw ApiError.notFound('Task not found');
      }

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: { sortOrder },
      });

      getIO().to(task.projectId).emit(WS_EVENTS.TASK_REORDERED, { projectId: task.projectId, statusId: task.statusId, taskIds: [taskId] });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to reorder task');
    }
  }

  async delete(taskId: string) {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw ApiError.notFound('Task not found');
      }

      const projectId = task.projectId;

      await prisma.task.delete({
        where: { id: taskId },
      });

      getIO().to(projectId).emit(WS_EVENTS.TASK_DELETED, { projectId, taskId });

      return { message: 'Task deleted successfully' };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to delete task');
    }
  }

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

      // Validate status belongs to same project
      const status = await prisma.taskStatus.findFirst({
        where: { id: data.statusId, projectId: parentTask.projectId },
      });

      if (!status) {
        throw ApiError.badRequest('Invalid status for this project');
      }

      // Validate assignee if provided
      if (data.assigneeId) {
        const permission = await prisma.projectPermission.findFirst({
          where: { projectId: parentTask.projectId, userId: data.assigneeId },
        });

        if (!permission) {
          throw ApiError.badRequest('Assignee is not a member of this project');
        }
      }

      // Determine sort order
      const lastSubtask = await prisma.task.findFirst({
        where: { parentTaskId },
        orderBy: { sortOrder: 'desc' },
      });
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
            select: { id: true, displayName: true, email: true },
          },
          creator: {
            select: { id: true, displayName: true, email: true },
          },
          parentTask: {
            select: { id: true, title: true },
          },
        },
      });

      getIO().to(parentTask.projectId).emit(WS_EVENTS.SUBTASK_CREATED, { projectId: parentTask.projectId, taskId: parentTaskId, subtask });

      return subtask;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to create subtask');
    }
  }

  async addDependency(blockedTaskId: string, blockingTaskId: string) {
    try {
      // Validate both tasks exist
      const [blockedTask, blockingTask] = await Promise.all([
        prisma.task.findUnique({ where: { id: blockedTaskId } }),
        prisma.task.findUnique({ where: { id: blockingTaskId } }),
      ]);

      if (!blockedTask) {
        throw ApiError.notFound('Blocked task not found');
      }

      if (!blockingTask) {
        throw ApiError.notFound('Blocking task not found');
      }

      // Prevent self-dependency
      if (blockedTaskId === blockingTaskId) {
        throw ApiError.badRequest('A task cannot depend on itself');
      }

      // Check both tasks are in the same project
      if (blockedTask.projectId !== blockingTask.projectId) {
        throw ApiError.badRequest('Dependencies must be within the same project');
      }

      // Check for duplicate dependency
      const existing = await prisma.taskDependency.findFirst({
        where: { blockedTaskId, blockingTaskId },
      });

      if (existing) {
        throw ApiError.conflict('This dependency already exists');
      }

      // Check for circular dependency (reverse already exists)
      const reverse = await prisma.taskDependency.findFirst({
        where: {
          blockedTaskId: blockingTaskId,
          blockingTaskId: blockedTaskId,
        },
      });

      if (reverse) {
        throw ApiError.badRequest(
          'Cannot create dependency: would create a circular dependency',
        );
      }

      const dependency = await prisma.taskDependency.create({
        data: {
          blockedTaskId,
          blockingTaskId,
        },
        include: {
          blockedTask: {
            select: { id: true, title: true },
          },
          blockingTask: {
            select: { id: true, title: true },
          },
        },
      });

      getIO().to(blockedTask.projectId).emit(WS_EVENTS.DEPENDENCY_ADDED, { projectId: blockedTask.projectId, taskId: blockedTaskId, dependencyTaskId: blockingTaskId, type: 'blockedBy' });

      return dependency;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to add dependency');
    }
  }

  async removeDependency(depId: string) {
    try {
      const dependency = await prisma.taskDependency.findUnique({
        where: { id: depId },
        include: { blockedTask: { select: { projectId: true } } },
      });

      if (!dependency) {
        throw ApiError.notFound('Dependency not found');
      }

      await prisma.taskDependency.delete({
        where: { id: depId },
      });

      getIO().to(dependency.blockedTask.projectId).emit(WS_EVENTS.DEPENDENCY_REMOVED, { projectId: dependency.blockedTask.projectId, taskId: dependency.blockedTaskId, dependencyTaskId: dependency.blockingTaskId });

      return { message: 'Dependency removed successfully' };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to remove dependency');
    }
  }
}

export const tasksService = new TasksService();
