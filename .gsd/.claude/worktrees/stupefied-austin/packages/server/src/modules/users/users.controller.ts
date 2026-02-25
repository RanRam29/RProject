import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service.js';
import { sendSuccess } from '../../utils/api-response.js';
import { ApiError } from '../../utils/api-error.js';
import { audit } from '../../middleware/audit.middleware.js';

export const usersController = {
  async getMyTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { limit, priority, overdue, dueAfter, dueBefore } = req.query;

      const tasks = await usersService.getMyTasks(userId, {
        priority: priority as string | undefined,
        overdue: overdue === 'true',
        dueAfter: dueAfter as string | undefined,
        dueBefore: dueBefore as string | undefined,
        limit: Number(limit) || 20,
      });

      sendSuccess(res, tasks);
    } catch (err) { next(err); }
  },

  async getMyStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await usersService.getMyStats(req.user!.id);
      sendSuccess(res, stats);
    } catch (err) { next(err); }
  },

  async getMyActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const limit = Math.max(1, Math.min(Number(req.query.limit) || 15, 100));

      const logs = await usersService.getMyActivity(userId, limit);
      sendSuccess(res, logs);
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, displayName, systemRole } = req.body;
      const user = await usersService.create({ email, password, displayName, systemRole });
      audit(req, 'admin.user_created', { targetId: user.id, metadata: { email, systemRole } });
      sendSuccess(res, user, 201);
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, page, limit } = req.query;
      const result = await usersService.list(
        search as string | undefined,
        Number(page) || 1,
        Number(limit) || 20
      );
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.getById(req.params.id as string);
      sendSuccess(res, user);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.update(req.params.id as string, req.body);
      sendSuccess(res, user);
    } catch (err) { next(err); }
  },

  async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user!.id === req.params.id) {
        throw ApiError.forbidden('Cannot change your own role');
      }
      const user = await usersService.updateRole(req.params.id as string, req.body.role);
      audit(req, 'admin.user_role_changed', { targetId: req.params.id as string, metadata: { newRole: req.body.role } });
      sendSuccess(res, user);
    } catch (err) { next(err); }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.changePassword(
        req.params.id as string,
        req.body.currentPassword,
        req.body.newPassword
      );
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user!.id === req.params.id) {
        throw ApiError.forbidden('Cannot deactivate yourself');
      }
      await usersService.deactivate(req.params.id as string);
      audit(req, 'admin.user_deactivated', { targetId: req.params.id as string });
      sendSuccess(res, { message: 'User deactivated' });
    } catch (err) { next(err); }
  },
};
