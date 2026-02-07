import prisma from '../../config/db.js';
import { Prisma } from '@prisma/client';
import { ApiError } from '../../utils/api-error.js';

export class TemplatesService {
  async list(userId: string) {
    try {
      const templates = await prisma.template.findMany({
        where: {
          OR: [
            { isPublic: true },
            { createdById: userId },
          ],
        },
        include: {
          createdBy: {
            select: { id: true, displayName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return templates;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to list templates');
    }
  }

  async getById(templateId: string) {
    try {
      const template = await prisma.template.findUnique({
        where: { id: templateId },
        include: {
          createdBy: {
            select: { id: true, displayName: true, email: true },
          },
        },
      });

      if (!template) {
        throw ApiError.notFound('Template not found');
      }

      return template;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to get template');
    }
  }

  async create(
    userId: string,
    data: {
      name: string;
      description?: string;
      configJson: Record<string, unknown>;
      isPublic?: boolean;
    },
  ) {
    try {
      // Check for duplicate name for this user
      const existing = await prisma.template.findFirst({
        where: { createdById: userId, name: data.name },
      });

      if (existing) {
        throw ApiError.conflict(`Template "${data.name}" already exists`);
      }

      const template = await prisma.template.create({
        data: {
          name: data.name,
          description: data.description || null,
          configJson: data.configJson as Prisma.InputJsonValue,
          isPublic: data.isPublic ?? false,
          createdById: userId,
        },
        include: {
          createdBy: {
            select: { id: true, displayName: true, email: true },
          },
        },
      });

      return template;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to create template');
    }
  }

  async update(
    templateId: string,
    data: {
      name?: string;
      description?: string;
      configJson?: Record<string, unknown>;
      isPublic?: boolean;
    },
  ) {
    try {
      const template = await prisma.template.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw ApiError.notFound('Template not found');
      }

      // Check for duplicate name if renaming
      if (data.name && data.name !== template.name) {
        const existing = await prisma.template.findFirst({
          where: {
            createdById: template.createdById,
            name: data.name,
            id: { not: templateId },
          },
        });

        if (existing) {
          throw ApiError.conflict(`Template "${data.name}" already exists`);
        }
      }

      const updated = await prisma.template.update({
        where: { id: templateId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.configJson !== undefined && { configJson: data.configJson as Prisma.InputJsonValue }),
          ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        },
        include: {
          createdBy: {
            select: { id: true, displayName: true, email: true },
          },
        },
      });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to update template');
    }
  }

  async delete(templateId: string) {
    try {
      const template = await prisma.template.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw ApiError.notFound('Template not found');
      }

      await prisma.template.delete({
        where: { id: templateId },
      });

      return { message: 'Template deleted successfully' };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to delete template');
    }
  }
}

export const templatesService = new TemplatesService();
