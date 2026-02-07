import { Router } from 'express';
import { statusesController } from './statuses.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireProjectRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createTaskStatusSchema, updateTaskStatusFieldsSchema } from '@pm/shared';

const router = Router({ mergeParams: true });

// GET / - List all task statuses for a project
router.get(
  '/',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  statusesController.list.bind(statusesController),
);

// POST / - Create a new task status
router.post(
  '/',
  authenticate,
  requireProjectRole('OWNER'),
  validate(createTaskStatusSchema),
  statusesController.create.bind(statusesController),
);

// PATCH /:statusId - Update a task status
router.patch(
  '/:statusId',
  authenticate,
  requireProjectRole('OWNER'),
  validate(updateTaskStatusFieldsSchema),
  statusesController.update.bind(statusesController),
);

// DELETE /:statusId - Delete a task status
router.delete(
  '/:statusId',
  authenticate,
  requireProjectRole('OWNER'),
  statusesController.delete.bind(statusesController),
);

export default router;
