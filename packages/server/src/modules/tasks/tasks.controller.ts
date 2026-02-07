import { Request, Response, NextFunction } from 'express';
import { tasksService } from './tasks.service.js';
import { sendSuccess, sendPaginated } from '../../utils/api-response.js';
import { activityService } from '../activity/activity.service.js';

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
        startDate: startDate ? new Date(startDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        sortOrder,
      });

      sendSuccess(res, task, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;
      const { title, description, assigneeId, priority, startDate, dueDate } = req.body;

      const task = await tasksService.update(taskId, {
        title,
        description,
        assigneeId,
        priority,
        startDate: startDate !== undefined
          ? (startDate ? new Date(startDate) : null)
          : undefined,
        dueDate: dueDate !== undefined
          ? (dueDate ? new Date(dueDate) : null)
          : undefined,
      });

      activityService.log(task.projectId, req.user!.id, 'task.updated', { taskId, title: task.title }).catch(() => {});
      sendSuccess(res, task);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;
      const { statusId, sortOrder } = req.body;

      const task = await tasksService.updateStatus(taskId, statusId, sortOrder);

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

      activityService.log(projectId, req.user!.id, 'task.deleted', { taskId }).catch(() => {});
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
        startDate: startDate ? new Date(startDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
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
}

export const tasksController = new TasksController();
