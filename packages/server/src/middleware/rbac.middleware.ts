import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { ApiError } from '../utils/api-error';

export function requireProjectRole(...roles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = req.params.projectId as string;
      const userId = req.user?.sub;

      if (!projectId || !userId) {
        return next(ApiError.badRequest('Missing project ID or user'));
      }

      const permission = await prisma.projectPermission.findUnique({
        where: {
          projectId_userId: { projectId, userId },
        },
        include: {
          customRole: true,
        },
      });

      if (!permission) {
        return next(ApiError.forbidden('No access to this project'));
      }

      // Extract included customRole relation with proper typing
      const customRole = (permission as Record<string, unknown>).customRole as
        | { id: string; name: string; capabilities: unknown }
        | null;

      if (!roles.includes(permission.role)) {
        if (permission.role === 'CUSTOM' && roles.includes('CUSTOM') && customRole) {
          req.projectCapabilities = customRole.capabilities as Record<string, boolean>;
        } else {
          return next(ApiError.forbidden('Insufficient project permissions'));
        }
      }

      req.projectPermission = {
        id: permission.id,
        projectId: permission.projectId,
        userId: permission.userId,
        role: permission.role,
        capabilities: permission.capabilities as Record<string, boolean>,
        customRole: customRole
          ? {
              id: customRole.id,
              name: customRole.name,
              capabilities: customRole.capabilities as Record<string, boolean>,
            }
          : null,
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireCapability(capability: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const permission = req.projectPermission;

    if (!permission) {
      return next(ApiError.forbidden('No project permission found'));
    }

    // OWNER has all capabilities
    if (permission.role === 'OWNER') {
      return next();
    }

    // EDITOR has standard capabilities
    if (permission.role === 'EDITOR') {
      const editorCaps = [
        'task.create', 'task.editAny', 'task.delete', 'task.changeStatus',
        'file.upload', 'file.deleteOwn',
      ];
      if (editorCaps.includes(capability)) {
        return next();
      }
    }

    // Check custom role capabilities
    if (req.projectCapabilities && req.projectCapabilities[capability] === true) {
      return next();
    }

    // Check permission-level capability overrides
    if (permission.capabilities && permission.capabilities[capability] === true) {
      return next();
    }

    next(ApiError.forbidden(`Missing capability: ${capability}`));
  };
}
