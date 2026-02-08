import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service.js';
import { sendSuccess, sendPaginated } from '../../utils/api-response.js';

export const notificationsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { page, limit, unreadOnly } = req.query;

      const result = await notificationsService.list(
        userId,
        page ? parseInt(page as string) : 1,
        limit ? parseInt(limit as string) : 20,
        unreadOnly === 'true',
      );

      sendPaginated(res, result.data, result.total, result.page, result.limit);
    } catch (error) {
      next(error);
    }
  },

  async unreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const count = await notificationsService.getUnreadCount(userId);
      sendSuccess(res, { count });
    } catch (error) {
      next(error);
    }
  },

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const notificationId = req.params.notificationId as string;

      const notification = await notificationsService.markAsRead(notificationId, userId);
      sendSuccess(res, notification);
    } catch (error) {
      next(error);
    }
  },

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await notificationsService.markAllAsRead(userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const notificationId = req.params.notificationId as string;

      const result = await notificationsService.delete(notificationId, userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async deleteAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await notificationsService.deleteAll(userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },
};
