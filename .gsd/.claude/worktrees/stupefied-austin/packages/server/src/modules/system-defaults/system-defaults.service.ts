import prisma from '../../config/db.js';
import { ApiError } from '../../utils/api-error.js';
import { DEFAULT_TASK_STATUSES } from '@pm/shared';
import type { SystemDefaultsDTO, DefaultStatusConfig, DefaultLabelConfig } from '@pm/shared';

export class SystemDefaultsService {
  async get(): Promise<SystemDefaultsDTO> {
    try {
      const row = await prisma.systemDefaults.findUnique({
        where: { id: 'singleton' },
      });

      if (!row) {
        // Return hardcoded defaults if no row exists
        return {
          statuses: DEFAULT_TASK_STATUSES.map((s) => ({
            name: s.name,
            color: s.color,
            sortOrder: s.sortOrder,
            isFinal: s.isFinal,
          })),
          labels: [],
        };
      }

      return {
        statuses: (row.statuses as unknown as DefaultStatusConfig[]) || [],
        labels: (row.labels as unknown as DefaultLabelConfig[]) || [],
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to get system defaults');
    }
  }

  async update(data: SystemDefaultsDTO): Promise<SystemDefaultsDTO> {
    try {
      // Validate statuses
      if (!data.statuses || data.statuses.length === 0) {
        throw ApiError.badRequest('At least one default status is required');
      }

      // Ensure at least one final status
      const hasFinal = data.statuses.some((s) => s.isFinal);
      if (!hasFinal) {
        throw ApiError.badRequest('At least one status must be marked as final (done)');
      }

      // Ensure unique status names
      const statusNames = new Set(data.statuses.map((s) => s.name.toLowerCase()));
      if (statusNames.size !== data.statuses.length) {
        throw ApiError.badRequest('Status names must be unique');
      }

      // Ensure unique label names
      if (data.labels.length > 0) {
        const labelNames = new Set(data.labels.map((l) => l.name.toLowerCase()));
        if (labelNames.size !== data.labels.length) {
          throw ApiError.badRequest('Label names must be unique');
        }
      }

      const row = await prisma.systemDefaults.upsert({
        where: { id: 'singleton' },
        create: {
          id: 'singleton',
          statuses: data.statuses as any,
          labels: data.labels as any,
        },
        update: {
          statuses: data.statuses as any,
          labels: data.labels as any,
        },
      });

      return {
        statuses: row.statuses as unknown as DefaultStatusConfig[],
        labels: row.labels as unknown as DefaultLabelConfig[],
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest('Failed to update system defaults');
    }
  }

  /**
   * Used during project creation to get the default statuses.
   * Falls back to hardcoded defaults if no system defaults exist.
   */
  async getDefaultStatuses(): Promise<DefaultStatusConfig[]> {
    const defaults = await this.get();
    if (defaults.statuses.length === 0) {
      return DEFAULT_TASK_STATUSES.map((s) => ({
        name: s.name,
        color: s.color,
        sortOrder: s.sortOrder,
        isFinal: s.isFinal,
      }));
    }
    return defaults.statuses;
  }

  /**
   * Used during project creation to get the default labels.
   */
  async getDefaultLabels(): Promise<DefaultLabelConfig[]> {
    const defaults = await this.get();
    return defaults.labels;
  }
}

export const systemDefaultsService = new SystemDefaultsService();
