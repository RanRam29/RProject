import { z } from 'zod';

const widgetConfigSchema = z.object({
  type: z.enum(['TASK_LIST', 'KANBAN', 'TIMELINE', 'FILES', 'AI_ASSISTANT', 'DEPENDENCY_GRAPH', 'ACTIVITY_FEED', 'ANALYTICS', 'CALENDAR']),
  title: z.string().min(1).max(100),
  positionX: z.number().int().min(0),
  positionY: z.number().int().min(0),
  width: z.number().int().min(100),
  height: z.number().int().min(100),
  config: z.record(z.unknown()).default({}),
});

const taskStatusConfigSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  sortOrder: z.number().int().min(0),
  isFinal: z.boolean(),
});

const templateConfigSchema = z.object({
  widgets: z.array(widgetConfigSchema),
  taskStatuses: z.array(taskStatusConfigSchema),
  defaultPermissions: z.record(z.record(z.boolean())).default({}),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200),
  description: z.string().max(2000).optional(),
  configJson: templateConfigSchema,
  isPublic: z.boolean().default(false),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  configJson: templateConfigSchema.optional(),
  isPublic: z.boolean().optional(),
});
