import { Request, Response, NextFunction } from 'express';
import { filesService } from './files.service';
import { sendSuccess } from '../../utils/api-response';

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

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { fileId } = req.params;

      const result = await filesService.delete(fileId);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const filesController = new FilesController();
