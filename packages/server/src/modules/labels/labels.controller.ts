import { Request, Response, NextFunction } from 'express';
import { labelsService } from './labels.service';
import { sendSuccess } from '../../utils/api-response';

export class LabelsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;

      const labels = await labelsService.list(projectId);

      sendSuccess(res, labels);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const { name, color } = req.body;

      const label = await labelsService.create(projectId, { name, color });

      sendSuccess(res, label, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { labelId } = req.params;
      const { name, color } = req.body;

      const label = await labelsService.update(labelId, { name, color });

      sendSuccess(res, label);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { labelId } = req.params;

      const result = await labelsService.delete(labelId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async assignToTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId, labelId } = req.params;

      const taskLabel = await labelsService.assignToTask(taskId, labelId);

      sendSuccess(res, taskLabel, 201);
    } catch (error) {
      next(error);
    }
  }

  async removeFromTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId, labelId } = req.params;

      const result = await labelsService.removeFromTask(taskId, labelId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const labelsController = new LabelsController();
