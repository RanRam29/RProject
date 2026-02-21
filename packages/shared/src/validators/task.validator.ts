import { z } from 'zod';
import { TaskPriority } from '../enums/task-priority.enum.js';
import { dateString } from './common.validator.js';

// Limit task description size (JSON rich text) to 100KB
const MAX_DESCRIPTION_BYTES = 100_000;
const boundedDescription = z.unknown().optional().refine(
  (val) => {
    if (val === undefined || val === null) return true;
    return JSON.stringify(val).length <= MAX_DESCRIPTION_BYTES;
  },
  { message: `Description must be under ${MAX_DESCRIPTION_BYTES / 1000}KB` }
);

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(500),
  description: boundedDescription,
  statusId: z.string().uuid('Invalid status ID'),
  assigneeId: z.string().uuid('Invalid assignee ID').optional(),
  parentTaskId: z.string().uuid('Invalid parent task ID').optional(),
  priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.NONE),
  startDate: dateString.optional(),
  dueDate: dateString.optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: boundedDescription,
  assigneeId: z.string().uuid().nullable().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  startDate: dateString.nullable().optional(),
  dueDate: dateString.nullable().optional(),
  isMilestone: z.boolean().optional(),
  estimatedHours: z.number().int().min(0).max(999).optional(),
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

export const bulkTaskOperationSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1, 'At least one task ID is required').max(100),
  operation: z.enum(['move', 'assign', 'delete', 'setPriority']),
  statusId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
});
