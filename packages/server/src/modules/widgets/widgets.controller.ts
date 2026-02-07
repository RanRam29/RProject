import { Request, Response, NextFunction } from 'express';
import { widgetsService } from './widgets.service.js';
import { sendSuccess } from '../../utils/api-response.js';

export class WidgetsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;

      const widgets = await widgetsService.list(projectId);

      sendSuccess(res, widgets);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const { type, title, configJson, sortOrder, positionX, positionY, width, height } = req.body;

      const widget = await widgetsService.create(projectId, {
        type,
        title,
        configJson,
        sortOrder,
        positionX,
        positionY,
        width,
        height,
      });

      sendSuccess(res, widget, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const widgetId = req.params.widgetId as string;
      const { title, configJson, sortOrder, positionX, positionY, width, height } = req.body;

      const widget = await widgetsService.update(widgetId, {
        title,
        configJson,
        sortOrder,
        positionX,
        positionY,
        width,
        height,
      });

      sendSuccess(res, widget);
    } catch (error) {
      next(error);
    }
  }

  async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      const { widgets } = req.body;

      const result = await widgetsService.reorder(widgets);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const widgetId = req.params.widgetId as string;

      const result = await widgetsService.delete(widgetId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const widgetsController = new WidgetsController();
