import { Router } from 'express';
import { labelsController } from './labels.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireProjectRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createLabelSchema, updateLabelSchema } from '@pm/shared';

const router = Router({ mergeParams: true });

// GET / - List all labels for a project
router.get(
  '/',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  labelsController.list.bind(labelsController),
);

// POST / - Create a new label
router.post(
  '/',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(createLabelSchema),
  labelsController.create.bind(labelsController),
);

// PATCH /:labelId - Update a label
router.patch(
  '/:labelId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(updateLabelSchema),
  labelsController.update.bind(labelsController),
);

// DELETE /:labelId - Delete a label
router.delete(
  '/:labelId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  labelsController.delete.bind(labelsController),
);

// POST /tasks/:taskId/assign/:labelId - Assign label to task
router.post(
  '/tasks/:taskId/assign/:labelId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  labelsController.assignToTask.bind(labelsController),
);

// DELETE /tasks/:taskId/assign/:labelId - Remove label from task
router.delete(
  '/tasks/:taskId/assign/:labelId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  labelsController.removeFromTask.bind(labelsController),
);

export default router;
