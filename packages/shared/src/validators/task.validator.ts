import { z } from 'zod';
import { TaskPriority } from '../enums/task-priority.enum.js';

// Accept ISO datetime (2025-01-15T00:00:00.000Z) or date-only (2025-01-15)
const dateString = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date string' }
);

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(500),
  description: z.unknown().optional(),
  statusId: z.string().uuid('Invalid status ID'),
  assigneeId: z.string().uuid('Invalid assignee ID').optional(),
  parentTaskId: z.string().uuid('Invalid parent task ID').optional(),
  priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.NONE),
  startDate: dateString.optional(),
  dueDate: dateString.optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.unknown().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  startDate: dateString.nullable().optional(),
  dueDate: dateString.nullable().optional(),
});

export const updateTaskStatusSchema = z.object({
  statusId: z.string().uuid('Invalid status ID'),
  sortOrder: z.number().int().min(0).optional(),
});

export const createTaskStatusSchema = z.object({
  name: z.string().min(1, 'Status name is required').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#6B7280'),
  sortOrder: z.number().int().min(0).optional(),
  isFinal: z.boolean().default(false),
});

export const updateTaskStatusFieldsSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isFinal: z.boolean().optional(),
});

export const reorderTaskSchema = z.object({
  sortOrder: z.number().int().min(0),
});

export const createDependencySchema = z.object({
  blockingTaskId: z.string().uuid('Invalid blocking task ID'),
});
