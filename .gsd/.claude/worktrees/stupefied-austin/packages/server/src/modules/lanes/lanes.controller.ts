import type { Request, Response, NextFunction } from 'express';
import { lanesService } from './lanes.service.js';

export class LanesController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const lanes = await lanesService.list(projectId);
      res.json({ success: true, data: lanes });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const lane = await lanesService.create(projectId, req.body);
      res.status(201).json({ success: true, data: lane });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const laneId = req.params.laneId as string;
      const lane = await lanesService.update(projectId, laneId, req.body);
      res.json({ success: true, data: lane });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const laneId = req.params.laneId as string;
      await lanesService.delete(projectId, laneId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

export const lanesController = new LanesController();
