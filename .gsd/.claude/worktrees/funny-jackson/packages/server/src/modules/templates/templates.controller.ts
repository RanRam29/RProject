import { Request, Response, NextFunction } from 'express';
import { templatesService } from './templates.service.js';
import { sendSuccess } from '../../utils/api-response.js';

export class TemplatesController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      const templates = await templatesService.list(userId);

      sendSuccess(res, templates);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const templateId = req.params.templateId as string;
      const userId = req.user!.id;

      const template = await templatesService.getById(templateId, userId);

      sendSuccess(res, template);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { name, description, configJson, isPublic } = req.body;

      const template = await templatesService.create(userId, {
        name,
        description,
        configJson,
        isPublic,
      });

      sendSuccess(res, template, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const templateId = req.params.templateId as string;
      const { name, description, configJson, isPublic } = req.body;

      const template = await templatesService.update(templateId, {
        name,
        description,
        configJson,
        isPublic,
      });

      sendSuccess(res, template);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const templateId = req.params.templateId as string;

      const result = await templatesService.delete(templateId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const templatesController = new TemplatesController();
