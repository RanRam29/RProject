import { Request, Response, NextFunction } from 'express';
import { statusesService } from './statuses.service.js';
import { sendSuccess } from '../../utils/api-response.js';
import { activityService } from '../activity/activity.service.js';

export class StatusesController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;

      const statuses = await statusesService.list(projectId);

      sendSuccess(res, statuses);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const { name, color, sortOrder } = req.body;

      const status = await statusesService.create(projectId, {
        name,
        color,
        sortOrder,
      });

      activityService.log(projectId, req.user!.id, 'status.created', { name }).catch(() => {});

      sendSuccess(res, status, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const statusId = req.params.statusId as string;
      const { name, color, sortOrder } = req.body;

      const status = await statusesService.update(statusId, {
        name,
        color,
        sortOrder,
      });

      activityService.log(status.projectId, req.user!.id, 'status.updated', { name: status.name }).catch(() => {});

      sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const statusId = req.params.statusId as string;

      const result = await statusesService.delete(statusId);

      activityService.log(result.projectId, req.user!.id, 'status.deleted', { name: result.name }).catch(() => {});

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const statusesController = new StatusesController();
