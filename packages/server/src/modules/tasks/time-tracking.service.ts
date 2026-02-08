import prisma from '../../config/db.js';
import { ApiError } from '../../utils/api-error.js';
import { getIO } from '../../ws/ws.server.js';
import { WS_EVENTS } from '../../ws/ws.events.js';
import logger from '../../utils/logger.js';

export class TimeTrackingService {
  /**
   * Start a timer on a task. Only one active timer per user per task.
   */
  async startTimer(taskId: string, userId: string, description?: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true },
    });

    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    // Check if user already has a running timer on this task
    const activeEntry = await prisma.timeEntry.findFirst({
      where: { taskId, userId, stoppedAt: null },
    });

    if (activeEntry) {
      throw ApiError.conflict('You already have a running timer on this task');
    }

    const entry = await prisma.timeEntry.create({
      data: {
        taskId,
        userId,
        description: description || null,
        startedAt: new Date(),
        isManual: false,
      },
      include: {
        user: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    try {
      getIO().to(task.projectId).emit(WS_EVENTS.TASK_UPDATED, {
        projectId: task.projectId,
        taskId,
        changes: { timerStarted: true, userId },
      });
    } catch { /* socket may not be initialized */ }

    logger.info(`Timer started: task=${taskId}, user=${userId}`);
    return entry;
  }

  /**
   * Stop the active timer on a task and compute duration.
   */
  async stopTimer(taskId: string, userId: string) {
    const activeEntry = await prisma.timeEntry.findFirst({
      where: { taskId, userId, stoppedAt: null },
    });

    if (!activeEntry) {
      throw ApiError.notFound('No active timer found for this task');
    }

    const stoppedAt = new Date();
    const durationMs = stoppedAt.getTime() - activeEntry.startedAt.getTime();

    const entry = await prisma.timeEntry.update({
      where: { id: activeEntry.id },
      data: {
        stoppedAt,
        durationMs,
      },
      include: {
        user: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });

    if (task) {
      try {
        getIO().to(task.projectId).emit(WS_EVENTS.TASK_UPDATED, {
          projectId: task.projectId,
          taskId,
          changes: { timerStopped: true, userId, durationMs },
        });
      } catch { /* socket may not be initialized */ }
    }

    logger.info(`Timer stopped: task=${taskId}, user=${userId}, duration=${durationMs}ms`);
    return entry;
  }

  /**
   * Add a manual time entry (no live timer).
   */
  async addManualEntry(
    taskId: string,
    userId: string,
    data: {
      startedAt: Date;
      stoppedAt: Date;
      description?: string;
    },
  ) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true },
    });

    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    if (data.stoppedAt <= data.startedAt) {
      throw ApiError.badRequest('End time must be after start time');
    }

    const durationMs = data.stoppedAt.getTime() - data.startedAt.getTime();

    const entry = await prisma.timeEntry.create({
      data: {
        taskId,
        userId,
        description: data.description || null,
        startedAt: data.startedAt,
        stoppedAt: data.stoppedAt,
        durationMs,
        isManual: true,
      },
      include: {
        user: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    logger.info(`Manual time entry: task=${taskId}, user=${userId}, duration=${durationMs}ms`);
    return entry;
  }

  /**
   * List time entries for a task.
   */
  async listForTask(taskId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where: { taskId },
        include: {
          user: {
            select: { id: true, displayName: true, email: true },
          },
        },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.timeEntry.count({ where: { taskId } }),
    ]);

    return { data: entries, total, page, limit };
  }

  /**
   * Get total time spent on a task (across all users).
   */
  async getTaskTotalTime(taskId: string) {
    const result = await prisma.timeEntry.aggregate({
      where: {
        taskId,
        durationMs: { not: null },
      },
      _sum: { durationMs: true },
      _count: true,
    });

    return {
      totalMs: result._sum.durationMs || 0,
      entryCount: result._count,
    };
  }

  /**
   * Get the user's active timer (if any) across all tasks.
   */
  async getActiveTimer(userId: string) {
    const entry = await prisma.timeEntry.findFirst({
      where: { userId, stoppedAt: null },
      include: {
        task: {
          select: { id: true, title: true, projectId: true },
        },
      },
    });

    return entry;
  }

  /**
   * Delete a time entry. Only the owner or a project OWNER can delete.
   */
  async deleteEntry(entryId: string, userId: string) {
    const entry = await prisma.timeEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw ApiError.notFound('Time entry not found');
    }

    if (entry.userId !== userId) {
      throw ApiError.forbidden('You can only delete your own time entries');
    }

    await prisma.timeEntry.delete({
      where: { id: entryId },
    });

    return { message: 'Time entry deleted' };
  }

  /**
   * Update a time entry's description.
   */
  async updateEntry(
    entryId: string,
    userId: string,
    data: { description?: string },
  ) {
    const entry = await prisma.timeEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw ApiError.notFound('Time entry not found');
    }

    if (entry.userId !== userId) {
      throw ApiError.forbidden('You can only update your own time entries');
    }

    const updated = await prisma.timeEntry.update({
      where: { id: entryId },
      data: {
        ...(data.description !== undefined && { description: data.description }),
      },
      include: {
        user: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    return updated;
  }
}

export const timeTrackingService = new TimeTrackingService();
