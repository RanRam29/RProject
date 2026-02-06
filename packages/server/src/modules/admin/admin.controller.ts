import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { sendSuccess } from '../../utils/api-response';

export const adminController = {
  async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId, userId, action, page, limit } = req.query;
      const result = await adminService.getLogs({
        projectId: projectId as string,
        userId: userId as string,
        action: action as string,
        page: Number(page) || 1,
        limit: Number(limit) || 50,
      });
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getStats();
      sendSuccess(res, stats);
    } catch (err) { next(err); }
  },
};
