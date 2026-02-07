import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service.js';
import { sendSuccess } from '../../utils/api-response.js';

export const usersController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, displayName, systemRole } = req.body;
      const user = await usersService.create({ email, password, displayName, systemRole });
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
      sendSuccess(res, { message: 'User deactivated' });
    } catch (err) { next(err); }
  },
};
