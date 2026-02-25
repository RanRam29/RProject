import { Request, Response, NextFunction } from 'express';
import { systemDefaultsService } from './system-defaults.service.js';
import { sendSuccess } from '../../utils/api-response.js';

export class SystemDefaultsController {
  async get(_req: Request, res: Response, next: NextFunction) {
    try {
      const defaults = await systemDefaultsService.get();
      sendSuccess(res, defaults);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { statuses, labels } = req.body;
      const defaults = await systemDefaultsService.update({ statuses, labels });
      sendSuccess(res, defaults);
    } catch (error) {
      next(error);
    }
  }
}

export const systemDefaultsController = new SystemDefaultsController();
