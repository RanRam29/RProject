import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import prisma from '../../config/db.js';
import { ApiError } from '../../utils/api-error.js';
import { getIO } from '../../ws/ws.server.js';
import { WS_EVENTS } from '../../ws/ws.events.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Local storage directory (relative to server cwd)
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

async function ensureUploadsDir(subDir?: string): Promise<string> {
  const dir = subDir ? path.join(UPLOADS_DIR, subDir) : UPLOADS_DIR;
  if (!existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
  return dir;
}

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

  async uploadFile(
    projectId: string,
    userId: string,
    fileData: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw ApiError.notFound('Project not found');
      }

      if (fileData.size > MAX_FILE_SIZE) {
        throw ApiError.badRequest(`File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)} MB`);
      }

      // Create project subdirectory
      const projectDir = await ensureUploadsDir(projectId);

      // Generate unique filename to avoid collisions
      const ext = path.extname(fileData.originalname);
      const uniqueName = `${randomUUID()}${ext}`;
      const filePath = path.join(projectDir, uniqueName);
      const storagePath = `${projectId}/${uniqueName}`;

      // Write file to disk
      await fs.writeFile(filePath, fileData.buffer);

      // Register in database
      const file = await prisma.file.create({
        data: {
          projectId,
          uploadedById: userId,
          originalName: fileData.originalname,
          storagePath,
          mimeType: fileData.mimetype,
          sizeBytes: fileData.size,
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
      throw ApiError.badRequest('Failed to upload file');
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

      // Generate a unique file key for storage
      const fileKey = `${projectId}/${randomUUID()}-${fileName}`;

      // Return the direct upload URL pointing to our server
      const uploadUrl = `/api/projects/${projectId}/files/upload`;

      return {
        uploadUrl,
        fileKey,
        expiresIn: 3600,
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

      if (data.size > MAX_FILE_SIZE) {
        throw ApiError.badRequest(`File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)} MB`);
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

      // Point to our own serve endpoint
      const downloadUrl = `/api/projects/${file.projectId}/files/${fileId}/serve`;

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

  async serveFile(fileId: string) {
    try {
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw ApiError.notFound('File not found');
      }

      const filePath = path.join(UPLOADS_DIR, file.storagePath);

      if (!existsSync(filePath)) {
        throw ApiError.notFound('File not found on disk');
      }

      return {
        stream: createReadStream(filePath),
        fileName: file.originalName,
        mimeType: file.mimeType,
        size: Number(file.sizeBytes),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to serve file');
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

      // Delete from disk
      const filePath = path.join(UPLOADS_DIR, file.storagePath);
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
      }

      // Delete from database
      await prisma.file.delete({
        where: { id: fileId },
      });

      getIO().to(projectId).emit(WS_EVENTS.FILE_DELETED, { projectId, fileId });

      return { message: 'File deleted successfully', projectId, fileName: file.originalName };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to delete file');
    }
  }
}

export const filesService = new FilesService();
