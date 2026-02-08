import prisma from '../../config/db.js';
import logger from '../../utils/logger.js';

export interface FieldChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export class TaskHistoryService {
  /**
   * Record one or more field-level changes for a task.
   * Called automatically when task fields are updated.
   */
  async recordChanges(taskId: string, userId: string, changes: FieldChange[]): Promise<void> {
    if (changes.length === 0) return;

    try {
      await prisma.taskChangeHistory.createMany({
        data: changes.map((change) => ({
          taskId,
          userId,
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
        })),
      });
    } catch (err) {
      // Don't fail the main operation if history recording fails
      logger.error(`Failed to record task history for task ${taskId}: ${err}`);
    }
  }

  /**
   * Record a single field change (convenience wrapper).
   */
  async recordChange(
    taskId: string,
    userId: string,
    field: string,
    oldValue: string | null,
    newValue: string | null,
  ): Promise<void> {
    return this.recordChanges(taskId, userId, [{ field, oldValue, newValue }]);
  }

  /**
   * Get the change history for a specific task.
   */
  async getTaskHistory(taskId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      prisma.taskChangeHistory.findMany({
        where: { taskId },
        include: {
          user: {
            select: { id: true, displayName: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.taskChangeHistory.count({ where: { taskId } }),
    ]);

    return { data: history, total, page, limit };
  }

  /**
   * Compute a diff between old and new task values and return the changes.
   * Used in the update/status change controllers to auto-detect changes.
   */
  diffTaskFields(
    oldTask: Record<string, unknown>,
    newData: Record<string, unknown>,
    fieldMapping?: Record<string, string>,
  ): FieldChange[] {
    const changes: FieldChange[] = [];
    const mapping = fieldMapping || {};

    for (const [key, newValue] of Object.entries(newData)) {
      if (newValue === undefined) continue;

      const oldValue = oldTask[key];
      const displayField = mapping[key] || key;

      // Skip if values are the same
      if (String(oldValue ?? '') === String(newValue ?? '')) continue;

      changes.push({
        field: displayField,
        oldValue: oldValue != null ? String(oldValue) : null,
        newValue: newValue != null ? String(newValue) : null,
      });
    }

    return changes;
  }
}

export const taskHistoryService = new TaskHistoryService();
