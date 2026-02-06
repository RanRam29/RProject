import { Request, Response, NextFunction } from 'express';
import { projectsService } from './projects.service';
import { sendSuccess, sendPaginated } from '../../utils/api-response';

export class ProjectsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await projectsService.list(userId, page, limit);

      sendPaginated(res, result.data, result.total, result.page, result.limit);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;

      const project = await projectsService.getById(projectId);

      sendSuccess(res, project);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { name, description } = req.body;

      const project = await projectsService.create(userId, name, description);

      sendSuccess(res, project, 201);
    } catch (error) {
      next(error);
    }
  }

  async instantiate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { templateId, name, description } = req.body;

      const project = await projectsService.instantiate(
        userId,
        templateId,
        name,
        description,
      );

      sendSuccess(res, project, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const { name, description } = req.body;

      const project = await projectsService.update(projectId, { name, description });

      sendSuccess(res, project);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const { status } = req.body;

      const project = await projectsService.updateStatus(projectId, status);

      sendSuccess(res, project);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;

      const result = await projectsService.delete(projectId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async saveAsTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      const template = await projectsService.saveAsTemplate(projectId, userId);

      sendSuccess(res, template, 201);
    } catch (error) {
      next(error);
    }
  }
}

export const projectsController = new ProjectsController();
