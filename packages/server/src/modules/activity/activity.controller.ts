import { Request, Response, NextFunction } from 'express';
import { activityService } from './activity.service';
import { sendPaginated } from '../../utils/api-response';

export const activityController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const { page, limit } = req.query;

      const result = await activityService.list(
        projectId,
        page ? parseInt(page as string) : 1,
        limit ? parseInt(limit as string) : 30
      );

      sendPaginated(res, result.data, result.total, result.page, result.limit);
    } catch (error) {
      next(error);
    }
  },
};
