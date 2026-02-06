import { randomUUID } from 'crypto';
import prisma from '../../config/db';
import { ApiError } from '../../utils/api-error';
import { getIO } from '../../ws/ws.server';
import { WS_EVENTS } from '../../ws/ws.events';

export class FilesService {
  async list(projectId: string) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw ApiError.notFound('Project not found');
      }

      const files = await prisma.file.findMany({
        where: { projectId },
        include: {
          uploadedBy: {
            select: { id: true, displayName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return files;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to list files');
    }
  }

  async requestUploadUrl(
    projectId: string,
    fileName: string,
    mimeType: string,
  ) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw ApiError.notFound('Project not found');
      }

      // Generate a unique file key for S3-like storage
      const fileKey = `projects/${projectId}/${randomUUID()}-${fileName}`;

      // MVP: Return mock presigned URL
      // In production, this would generate an actual S3 presigned URL
      const uploadUrl = `https://storage.example.com/upload?key=${encodeURIComponent(fileKey)}&contentType=${encodeURIComponent(mimeType)}`;

      return {
        uploadUrl,
        fileKey,
        expiresIn: 3600, // 1 hour
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to generate upload URL');
    }
  }

  async registerFile(
    projectId: string,
    userId: string,
    data: {
      name: string;
      fileKey: string;
      mimeType: string;
      size: number;
      taskId?: string;
    },
  ) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw ApiError.notFound('Project not found');
      }

      const file = await prisma.file.create({
        data: {
          projectId,
          uploadedById: userId,
          originalName: data.name,
          storagePath: data.fileKey,
          mimeType: data.mimeType,
          sizeBytes: data.size,
        },
        include: {
          uploadedBy: {
            select: { id: true, displayName: true, email: true },
          },
        },
      });

      getIO().to(projectId).emit(WS_EVENTS.FILE_UPLOADED, { projectId, file });

      return file;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to register file');
    }
  }

  async getDownloadUrl(fileId: string) {
    try {
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw ApiError.notFound('File not found');
      }

      // MVP: Return mock signed download URL
      // In production, this would generate an actual S3 presigned GET URL
      const downloadUrl = `https://storage.example.com/download?key=${encodeURIComponent(file.storagePath)}&expires=${Date.now() + 3600000}`;

      return {
        downloadUrl,
        fileName: file.originalName,
        mimeType: file.mimeType,
        size: Number(file.sizeBytes),
        expiresIn: 3600,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to generate download URL');
    }
  }

  async delete(fileId: string) {
    try {
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw ApiError.notFound('File not found');
      }

      const projectId = file.projectId;

      // In production, also delete from S3 here
      await prisma.file.delete({
        where: { id: fileId },
      });

      getIO().to(projectId).emit(WS_EVENTS.FILE_DELETED, { projectId, fileId });

      return { message: 'File deleted successfully' };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to delete file');
    }
  }
}

export const filesService = new FilesService();
