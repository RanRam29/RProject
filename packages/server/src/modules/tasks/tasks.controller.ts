import { Request, Response, NextFunction } from 'express';
import { tasksService } from './tasks.service.js';
import { taskHistoryService } from './task-history.service.js';
import { timeTrackingService } from './time-tracking.service.js';
import { sendSuccess, sendPaginated } from '../../utils/api-response.js';
import { fireAndForget } from '../../utils/fire-and-forget.js';
import { activityService } from '../activity/activity.service.js';
import prisma from '../../config/db.js';
import { ApiError } from '../../utils/api-error.js';

/** Parse a date string safely — only accepts ISO-like formats (YYYY-MM-DD...) */
function safeParseDate(val: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}/.test(val)) {
    throw ApiError.badRequest(`Invalid date format: "${val}". Use YYYY-MM-DD.`);
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    throw ApiError.badRequest(`Invalid date: "${val}"`);
  }
  return d;
}

export class TasksController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const {
        statusId,
        assigneeId,
        parentTaskId,
        priority,
        search,
        page,
        limit,
      } = req.query;

      const filters = {
        statusId: statusId as string | undefined,
        assigneeId: assigneeId as string | undefined,
        parentTaskId: parentTaskId === 'null'
          ? null
          : (parentTaskId as string | undefined),
        priority: priority as string | undefined,
        search: search as string | undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      };

      const result = await tasksService.list(projectId, filters);

      sendPaginated(res, result.data, result.total, result.page, result.limit);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;

      const task = await tasksService.getById(taskId);

      sendSuccess(res, task);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const userId = req.user!.id;
      const { title, description, statusId, assigneeId, priority, startDate, dueDate, sortOrder } = req.body;

      const task = await tasksService.create(projectId, userId, {
        title,
        description,
        statusId,
        assigneeId,
        priority,
        startDate: startDate ? safeParseDate(startDate) : undefined,
        dueDate: dueDate ? safeParseDate(dueDate) : undefined,
        sortOrder,
      });

      // Record creation in history
      fireAndForget(taskHistoryService.recordChange(task.id, userId, 'created', null, task.title), 'task-history.record');

      sendSuccess(res, task, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;
      const userId = req.user!.id;
      const { title, description, assigneeId, priority, startDate, dueDate } = req.body;

      // Fetch old task for change tracking
      const oldTask = await prisma.task.findUnique({ where: { id: taskId } });

      const task = await tasksService.update(taskId, userId, {
        title,
        description,
        assigneeId,
        priority,
        startDate: startDate !== undefined
          ? (startDate ? safeParseDate(startDate) : null)
          : undefined,
        dueDate: dueDate !== undefined
          ? (dueDate ? safeParseDate(dueDate) : null)
          : undefined,
      });

      // Record field-level changes
      if (oldTask) {
        const changes = taskHistoryService.diffTaskFields(
          oldTask as unknown as Record<string, unknown>,
          { title, assigneeId, priority, startDate, dueDate },
        );
        fireAndForget(taskHistoryService.recordChanges(taskId, userId, changes), 'task-history.record');
      }

      fireAndForget(activityService.log(task.projectId, userId, 'task.updated', { taskId, title: task.title }), 'activity.log');

      sendSuccess(res, task);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;
      const userId = req.user!.id;
      const { statusId, sortOrder } = req.body;

      // Fetch old task to record status change
      const oldTask = await prisma.task.findUnique({
        where: { id: taskId },
        include: { status: { select: { name: true } } },
      });

      const task = await tasksService.updateStatus(taskId, statusId, sortOrder);

      // Record status change in history
      if (oldTask) {
        fireAndForget(taskHistoryService.recordChange(
          taskId,
          userId,
          'status',
          oldTask.status.name,
          task.status.name,
        ), 'task-history.record');

        fireAndForget(activityService.log(task.projectId, userId, 'task.status_changed', {
          taskId,
          title: task.title,
          oldStatus: oldTask.status.name,
          newStatus: task.status.name,
        }), 'activity.log');
      }

      sendSuccess(res, task);
    } catch (error) {
      next(error);
    }
  }

  async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;
      const { sortOrder } = req.body;

      const task = await tasksService.reorder(taskId, sortOrder);

      sendSuccess(res, task);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const taskId = req.params.taskId as string;

      const result = await tasksService.delete(taskId);

      fireAndForget(activityService.log(projectId, req.user!.id, 'task.deleted', { taskId }), 'activity.log');
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createSubtask(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;
      const userId = req.user!.id;
      const { title, description, statusId, assigneeId, priority, startDate, dueDate } = req.body;

      const subtask = await tasksService.createSubtask(taskId, userId, {
        title,
        description,
        statusId,
        assigneeId,
        priority,
        startDate: startDate ? safeParseDate(startDate) : undefined,
        dueDate: dueDate ? safeParseDate(dueDate) : undefined,
      });

      sendSuccess(res, subtask, 201);
    } catch (error) {
      next(error);
    }
  }

  async addDependency(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;
      const { blockingTaskId } = req.body;

      const dependency = await tasksService.addDependency(taskId, blockingTaskId);

      sendSuccess(res, dependency, 201);
    } catch (error) {
      next(error);
    }
  }

  async removeDependency(req: Request, res: Response, next: NextFunction) {
    try {
      const depId = req.params.depId as string;

      const result = await tasksService.removeDependency(depId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async bulkOperation(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const userId = req.user!.id;
      const { taskIds, operation, statusId, assigneeId, priority } = req.body;

      const result = await tasksService.bulkOperation(projectId, userId, {
        taskIds,
        operation,
        statusId,
        assigneeId,
        priority,
      });

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  // ════════════════════════════════════════════════
  // TASK HISTORY
  // ════════════════════════════════════════════════

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const result = await taskHistoryService.getTaskHistory(taskId, page, limit);

      sendPaginated(res, result.data, result.total, result.page, result.limit);
    } catch (error) {
      next(error);
    }
  }

  // ════════════════════════════════════════════════
  // TIME TRACKING
  // ════════════════════════════════════════════════

  async startTimer(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;
      const userId = req.user!.id;
      const { description } = req.body;

      const entry = await timeTrackingService.startTimer(taskId, userId, description);

      sendSuccess(res, entry, 201);
    } catch (error) {
      next(error);
    }
  }

  async stopTimer(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;
      const userId = req.user!.id;

      const entry = await timeTrackingService.stopTimer(taskId, userId);

      sendSuccess(res, entry);
    } catch (error) {
      next(error);
    }
  }

  async addManualTimeEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;
      const userId = req.user!.id;
      const { startedAt, stoppedAt, description } = req.body;

      const entry = await timeTrackingService.addManualEntry(taskId, userId, {
        startedAt: new Date(startedAt),
        stoppedAt: new Date(stoppedAt),
        description,
      });

      sendSuccess(res, entry, 201);
    } catch (error) {
      next(error);
    }
  }

  async listTimeEntries(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const result = await timeTrackingService.listForTask(taskId, page, limit);

      sendPaginated(res, result.data, result.total, result.page, result.limit);
    } catch (error) {
      next(error);
    }
  }

  async getTaskTotalTime(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;

      const result = await timeTrackingService.getTaskTotalTime(taskId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getActiveTimer(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      const entry = await timeTrackingService.getActiveTimer(userId);

      sendSuccess(res, entry);
    } catch (error) {
      next(error);
    }
  }

  async deleteTimeEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const entryId = req.params.entryId as string;
      const userId = req.user!.id;

      const result = await timeTrackingService.deleteEntry(entryId, userId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateTimeEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const entryId = req.params.entryId as string;
      const userId = req.user!.id;
      const { description } = req.body;

      const entry = await timeTrackingService.updateEntry(entryId, userId, { description });

      sendSuccess(res, entry);
    } catch (error) {
      next(error);
    }
  }
}

export const tasksController = new TasksController();
