import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  description: z.string().max(2000).optional(),
});

export const instantiateProjectSchema = z.object({
  templateId: z.string().uuid('Invalid template ID'),
  name: z.string().min(1, 'Project name is required').max(200),
  description: z.string().max(2000).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

export const updateProjectStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'ARCHIVED', 'COMPLETED']),
});

export const addWidgetSchema = z.object({
  type: z.enum(['TASK_LIST', 'KANBAN', 'TIMELINE', 'FILES', 'AI_ASSISTANT', 'DEPENDENCY_GRAPH', 'ACTIVITY_FEED']),
  title: z.string().min(1).max(100),
  configJson: z.record(z.unknown()).optional().default({}),
  positionX: z.number().int().min(0).default(0),
  positionY: z.number().int().min(0).default(0),
  width: z.number().int().min(100).default(400),
  height: z.number().int().min(100).default(300),
});

export const updateWidgetSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  configJson: z.record(z.unknown()).optional(),
  positionX: z.number().int().min(0).optional(),
  positionY: z.number().int().min(0).optional(),
  width: z.number().int().min(100).optional(),
  height: z.number().int().min(100).optional(),
});

export const reorderWidgetsSchema = z.object({
  widgets: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    })
  ),
});
