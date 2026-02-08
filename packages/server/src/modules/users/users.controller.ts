import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service.js';
import { sendSuccess } from '../../utils/api-response.js';
import { audit } from '../../middleware/audit.middleware.js';
import prisma from '../../config/db.js';

export const usersController = {
  async getMyTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { limit, priority, overdue } = req.query;

      const where: Record<string, unknown> = { assigneeId: userId };

      if (priority) {
        where.priority = priority;
      }

      if (overdue === 'true') {
        where.dueDate = { lt: new Date() };
        where.status = { isFinal: false };
      }

      const tasks = await prisma.task.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          status: true,
          assignee: { select: { id: true, displayName: true, email: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
        take: Number(limit) || 20,
      });

      sendSuccess(res, tasks);
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
      await usersService.deactivate(req.params.id as string);
      audit(req, 'admin.user_deactivated', { targetId: req.params.id as string });
      sendSuccess(res, { message: 'User deactivated' });
    } catch (err) { next(err); }
  },
};
