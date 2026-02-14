import { Request, Response, NextFunction } from 'express';
import { permissionsService } from './permissions.service.js';
import { sendSuccess } from '../../utils/api-response.js';
import { activityService } from '../activity/activity.service.js';

export class PermissionsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;

      const permissions = await permissionsService.list(projectId);

      sendSuccess(res, permissions);
    } catch (error) {
      next(error);
    }
  }

  async invite(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const { userId, role, customRoleId } = req.body;

      const permission = await permissionsService.invite(
        projectId,
        userId,
        role,
        customRoleId,
      );

      activityService.log(projectId, req.user!.id, 'member.invited', { userId: permission.user.id, role }).catch((err) => {
        console.error('Failed to log activity:', err);
      });

      sendSuccess(res, permission, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const permId = req.params.permId as string;
      const { role, customRoleId, capabilities } = req.body;

      const permission = await permissionsService.update(
        permId,
        role,
        customRoleId,
        capabilities,
      );

      const projectId = req.params.projectId as string;
      const newRole = permission.role || permission.customRoleId || role;
      activityService.log(projectId, req.user!.id, 'member.role_changed', { userId: permission.user.id, newRole }).catch(() => {});

      sendSuccess(res, permission);
    } catch (error) {
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const permId = req.params.permId as string;

      const projectId = req.params.projectId as string;
      const result = await permissionsService.remove(permId);

      activityService.log(projectId, req.user!.id, 'member.removed', {}).catch(() => {});

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async listCustomRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;

      const roles = await permissionsService.listCustomRoles(projectId);

      sendSuccess(res, roles);
    } catch (error) {
      next(error);
    }
  }

  async createCustomRole(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const { name, description, capabilities } = req.body;

      const role = await permissionsService.createCustomRole(projectId, {
        name,
        description,
        capabilities,
      });

      sendSuccess(res, role, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateCustomRole(req: Request, res: Response, next: NextFunction) {
    try {
      const roleId = req.params.roleId as string;
      const { name, description, capabilities } = req.body;

      const role = await permissionsService.updateCustomRole(roleId, {
        name,
        description,
        capabilities,
      });

      sendSuccess(res, role);
    } catch (error) {
      next(error);
    }
  }

  async deleteCustomRole(req: Request, res: Response, next: NextFunction) {
    try {
      const roleId = req.params.roleId as string;

      const result = await permissionsService.deleteCustomRole(roleId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const permissionsController = new PermissionsController();
