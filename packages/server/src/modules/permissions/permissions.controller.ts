import { Request, Response, NextFunction } from 'express';
import { permissionsService } from './permissions.service';
import { sendSuccess } from '../../utils/api-response';

export class PermissionsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;

      const permissions = await permissionsService.list(projectId);

      sendSuccess(res, permissions);
    } catch (error) {
      next(error);
    }
  }

  async invite(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const { userId, role, customRoleId } = req.body;

      const permission = await permissionsService.invite(
        projectId,
        userId,
        role,
        customRoleId,
      );

      sendSuccess(res, permission, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { permId } = req.params;
      const { role, customRoleId, capabilities } = req.body;

      const permission = await permissionsService.update(
        permId,
        role,
        customRoleId,
        capabilities,
      );

      sendSuccess(res, permission);
    } catch (error) {
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { permId } = req.params;

      const result = await permissionsService.remove(permId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async listCustomRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;

      const roles = await permissionsService.listCustomRoles(projectId);

      sendSuccess(res, roles);
    } catch (error) {
      next(error);
    }
  }

  async createCustomRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
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
      const { roleId } = req.params;
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
      const { roleId } = req.params;

      const result = await permissionsService.deleteCustomRole(roleId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const permissionsController = new PermissionsController();
