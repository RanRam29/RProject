import prisma from '../../config/db';
import { WidgetType, Prisma } from '@prisma/client';
import { ApiError } from '../../utils/api-error';
import { getIO } from '../../ws/ws.server';
import { WS_EVENTS } from '../../ws/ws.events';

export class WidgetsService {
  async list(projectId: string) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw ApiError.notFound('Project not found');
      }

      const widgets = await prisma.projectWidget.findMany({
        where: { projectId },
        orderBy: { sortOrder: 'asc' },
      });

      return widgets;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to list widgets');
    }
  }

  async create(
    projectId: string,
    data: {
      type: string;
      title: string;
      configJson?: Record<string, unknown>;
      sortOrder?: number;
      positionX?: number;
      positionY?: number;
      width?: number;
      height?: number;
    },
  ) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw ApiError.notFound('Project not found');
      }

      // If no sortOrder provided, place at end
      let sortOrder = data.sortOrder;
      if (sortOrder === undefined) {
        const lastWidget = await prisma.projectWidget.findFirst({
          where: { projectId },
          orderBy: { sortOrder: 'desc' },
        });
        sortOrder = lastWidget ? lastWidget.sortOrder + 1 : 0;
      }

      const widget = await prisma.projectWidget.create({
        data: {
          projectId,
          type: data.type as WidgetType,
          title: data.title,
          configJson: (data.configJson || {}) as Prisma.InputJsonValue,
          sortOrder,
          ...(data.positionX !== undefined && { positionX: data.positionX }),
          ...(data.positionY !== undefined && { positionY: data.positionY }),
          ...(data.width !== undefined && { width: data.width }),
          ...(data.height !== undefined && { height: data.height }),
        },
      });

      getIO().to(projectId).emit(WS_EVENTS.WIDGET_ADDED, { projectId, widget });

      return widget;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to create widget');
    }
  }

  async update(
    widgetId: string,
    data: {
      title?: string;
      configJson?: Record<string, unknown>;
      sortOrder?: number;
      positionX?: number;
      positionY?: number;
      width?: number;
      height?: number;
    },
  ) {
    try {
      const widget = await prisma.projectWidget.findUnique({
        where: { id: widgetId },
      });

      if (!widget) {
        throw ApiError.notFound('Widget not found');
      }

      const updated = await prisma.projectWidget.update({
        where: { id: widgetId },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.configJson !== undefined && { configJson: data.configJson as Prisma.InputJsonValue }),
          ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
          ...(data.positionX !== undefined && { positionX: data.positionX }),
          ...(data.positionY !== undefined && { positionY: data.positionY }),
          ...(data.width !== undefined && { width: data.width }),
          ...(data.height !== undefined && { height: data.height }),
        },
      });

      return updated;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to update widget');
    }
  }

  async reorder(widgets: Array<{ id: string; sortOrder: number }>) {
    try {
      const updatePromises = widgets.map((widget) =>
        prisma.projectWidget.update({
          where: { id: widget.id },
          data: { sortOrder: widget.sortOrder },
        }),
      );

      await prisma.$transaction(updatePromises);

      return { message: 'Widgets reordered successfully' };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to reorder widgets');
    }
  }

  async delete(widgetId: string) {
    try {
      const widget = await prisma.projectWidget.findUnique({
        where: { id: widgetId },
      });

      if (!widget) {
        throw ApiError.notFound('Widget not found');
      }

      const projectId = widget.projectId;

      await prisma.projectWidget.delete({
        where: { id: widgetId },
      });

      getIO().to(projectId).emit(WS_EVENTS.WIDGET_REMOVED, { projectId, widgetId });

      return { message: 'Widget deleted successfully' };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to delete widget');
    }
  }
}

export const widgetsService = new WidgetsService();
