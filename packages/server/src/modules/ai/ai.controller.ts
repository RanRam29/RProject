import type { Request, Response, NextFunction } from 'express';
import { aiService } from './ai.service.js';
import { sendSuccess } from '../../utils/api-response.js';

class AIController {
  async status(_req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, { available: aiService.isAvailable() });
    } catch (error) {
      next(error);
    }
  }

  async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const userId = req.user!.id;
      const { message, history } = req.body;

      const result = await aiService.chat(projectId, userId, message, history);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async chatStream(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const userId = req.user!.id;
      const { message, history } = req.body;

      // SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      res.flushHeaders();

      const stream = aiService.chatStream(projectId, userId, message, history);

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: 'Stream failed. Please try again.' })}\n\n`);
        res.end();
      } else {
        next(error);
      }
    }
  }
}

export const aiController = new AIController();
