import { Request, Response, NextFunction } from 'express';
import { labelsService } from './labels.service.js';
import { sendSuccess } from '../../utils/api-response.js';
import { fireAndForget } from '../../utils/fire-and-forget.js';
import { activityService } from '../activity/activity.service.js';

export class LabelsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;

      const labels = await labelsService.list(projectId);

      sendSuccess(res, labels);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const { name, color } = req.body;

      const label = await labelsService.create(projectId, { name, color });

      fireAndForget(activityService.log(projectId, req.user!.id, 'label.created', { name }), 'activity.log');

      sendSuccess(res, label, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const labelId = req.params.labelId as string;
      const { name, color } = req.body;

      const label = await labelsService.update(labelId, { name, color });

      sendSuccess(res, label);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const labelId = req.params.labelId as string;

      const result = await labelsService.delete(labelId);

      fireAndForget(activityService.log(result.projectId, req.user!.id, 'label.deleted', { name: result.name }), 'activity.log');

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async assignToTask(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;
      const labelId = req.params.labelId as string;

      const taskLabel = await labelsService.assignToTask(taskId, labelId);

      const projectId = req.params.projectId as string;
      fireAndForget(activityService.log(projectId, req.user!.id, 'label.assigned', { taskId, labelId }), 'activity.log');

      sendSuccess(res, taskLabel, 201);
    } catch (error) {
      next(error);
    }
  }

  async removeFromTask(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;
      const labelId = req.params.labelId as string;

      const result = await labelsService.removeFromTask(taskId, labelId);

      fireAndForget(activityService.log(result.projectId, req.user!.id, 'label.unassigned', { taskId, labelId }), 'activity.log');

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const labelsController = new LabelsController();
