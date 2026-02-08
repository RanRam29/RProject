import { Request, Response, NextFunction } from 'express';
import { filesService } from './files.service.js';
import { sendSuccess } from '../../utils/api-response.js';

export class FilesController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;

      const files = await filesService.list(projectId);

      sendSuccess(res, files);
    } catch (error) {
      next(error);
    }
  }

  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const userId = req.user!.id;
      const file = req.file;

      if (!file) {
        res.status(400).json({ status: 'error', error: 'No file provided' });
        return;
      }

      const result = await filesService.uploadFile(projectId, userId, {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      });

      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async requestUploadUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const { fileName, mimeType } = req.body;

      const result = await filesService.requestUploadUrl(
        projectId,
        fileName,
        mimeType,
      );

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async registerFile(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const userId = req.user!.id;
      const { name, fileKey, mimeType, size, taskId } = req.body;

      const file = await filesService.registerFile(projectId, userId, {
        name,
        fileKey,
        mimeType,
        size,
        taskId,
      });

      sendSuccess(res, file, 201);
    } catch (error) {
      next(error);
    }
  }

  async getDownloadUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const fileId = req.params.fileId as string;

      const result = await filesService.getDownloadUrl(fileId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async serveFile(req: Request, res: Response, next: NextFunction) {
    try {
      const fileId = req.params.fileId as string;

      const result = await filesService.serveFile(fileId);

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Length', result.size);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(result.fileName)}"`,
      );

      result.stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const fileId = req.params.fileId as string;

      const result = await filesService.delete(fileId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const filesController = new FilesController();
