import { Router } from 'express';
import { widgetsController } from './widgets.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireProjectRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { addWidgetSchema, updateWidgetSchema, reorderWidgetsSchema } from '@pm/shared';

const router = Router({ mergeParams: true });

// GET / - List all widgets for a project
router.get(
  '/',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  widgetsController.list.bind(widgetsController),
);

// POST / - Create a new widget
router.post(
  '/',
  authenticate,
  requireProjectRole('OWNER'),
  validate(addWidgetSchema),
  widgetsController.create.bind(widgetsController),
);

// PATCH /reorder - Reorder widgets
router.patch(
  '/reorder',
  authenticate,
  requireProjectRole('OWNER'),
  validate(reorderWidgetsSchema),
  widgetsController.reorder.bind(widgetsController),
);

// PATCH /:widgetId - Update a widget
router.patch(
  '/:widgetId',
  authenticate,
  requireProjectRole('OWNER'),
  validate(updateWidgetSchema),
  widgetsController.update.bind(widgetsController),
);

// DELETE /:widgetId - Delete a widget
router.delete(
  '/:widgetId',
  authenticate,
  requireProjectRole('OWNER'),
  widgetsController.delete.bind(widgetsController),
);

export default router;
