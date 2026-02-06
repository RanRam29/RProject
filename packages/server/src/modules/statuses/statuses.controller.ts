import { Request, Response, NextFunction } from 'express';
import { statusesService } from './statuses.service';
import { sendSuccess } from '../../utils/api-response';

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

      sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const statusId = req.params.statusId as string;

      const result = await statusesService.delete(statusId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const statusesController = new StatusesController();
