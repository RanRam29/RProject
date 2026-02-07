import { Request, Response, NextFunction } from 'express';
import { commentsService } from './comments.service.js';
import { sendSuccess } from '../../utils/api-response.js';

export class CommentsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;

      const comments = await commentsService.list(taskId);

      sendSuccess(res, comments);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.taskId as string;
      const userId = req.user!.id;
      const { content } = req.body;

      const comment = await commentsService.create(taskId, userId, { content });

      sendSuccess(res, comment, 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const commentId = req.params.commentId as string;
      const userId = req.user!.id;
      const { content } = req.body;

      const comment = await commentsService.update(commentId, userId, { content });

      sendSuccess(res, comment);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const commentId = req.params.commentId as string;
      const userId = req.user!.id;

      const result = await commentsService.delete(commentId, userId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const commentsController = new CommentsController();
