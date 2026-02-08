import { Router } from 'express';
import { tasksController } from './tasks.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireProjectRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  reorderTaskSchema,
  createDependencySchema,
  bulkTaskOperationSchema,
  startTimerSchema,
  manualTimeEntrySchema,
  updateTimeEntrySchema,
} from '@pm/shared';

const router = Router({ mergeParams: true });

// POST /bulk - Bulk operations on tasks
router.post(
  '/bulk',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(bulkTaskOperationSchema),
  tasksController.bulkOperation.bind(tasksController),
);

// GET / - List all tasks for a project
router.get(
  '/',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  tasksController.list.bind(tasksController),
);

// POST / - Create a new task
router.post(
  '/',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(createTaskSchema),
  tasksController.create.bind(tasksController),
);

// GET /:taskId - Get task by ID
router.get(
  '/:taskId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  tasksController.getById.bind(tasksController),
);

// PATCH /:taskId - Update task fields
router.patch(
  '/:taskId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(updateTaskSchema),
  tasksController.update.bind(tasksController),
);

// PATCH /:taskId/status - Update task status (move between columns)
router.patch(
  '/:taskId/status',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(updateTaskStatusSchema),
  tasksController.updateStatus.bind(tasksController),
);

// PATCH /:taskId/reorder - Reorder task within a status column
router.patch(
  '/:taskId/reorder',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(reorderTaskSchema),
  tasksController.reorder.bind(tasksController),
);

// DELETE /:taskId - Delete a task
router.delete(
  '/:taskId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  tasksController.delete.bind(tasksController),
);

// POST /:taskId/subtasks - Create a subtask
router.post(
  '/:taskId/subtasks',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(createTaskSchema),
  tasksController.createSubtask.bind(tasksController),
);

// POST /:taskId/dependencies - Add a dependency
router.post(
  '/:taskId/dependencies',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(createDependencySchema),
  tasksController.addDependency.bind(tasksController),
);

// DELETE /dependencies/:depId - Remove a dependency
router.delete(
  '/dependencies/:depId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  tasksController.removeDependency.bind(tasksController),
);

// ════════════════════════════════════════════════
// TASK HISTORY
// ════════════════════════════════════════════════

// GET /:taskId/history - Get task change history
router.get(
  '/:taskId/history',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  tasksController.getHistory.bind(tasksController),
);

// ════════════════════════════════════════════════
// TIME TRACKING
// ════════════════════════════════════════════════

// POST /:taskId/time/start - Start timer
router.post(
  '/:taskId/time/start',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(startTimerSchema),
  tasksController.startTimer.bind(tasksController),
);

// POST /:taskId/time/stop - Stop timer
router.post(
  '/:taskId/time/stop',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  tasksController.stopTimer.bind(tasksController),
);

// POST /:taskId/time/manual - Add manual time entry
router.post(
  '/:taskId/time/manual',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(manualTimeEntrySchema),
  tasksController.addManualTimeEntry.bind(tasksController),
);

// GET /:taskId/time - List time entries for task
router.get(
  '/:taskId/time',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  tasksController.listTimeEntries.bind(tasksController),
);

// GET /:taskId/time/total - Get total time for task
router.get(
  '/:taskId/time/total',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  tasksController.getTaskTotalTime.bind(tasksController),
);

// DELETE /time/:entryId - Delete a time entry
router.delete(
  '/time/:entryId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  tasksController.deleteTimeEntry.bind(tasksController),
);

// PATCH /time/:entryId - Update a time entry
router.patch(
  '/time/:entryId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(updateTimeEntrySchema),
  tasksController.updateTimeEntry.bind(tasksController),
);

export default router;
