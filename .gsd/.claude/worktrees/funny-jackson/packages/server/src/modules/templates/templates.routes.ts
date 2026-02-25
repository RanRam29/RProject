import { Router } from 'express';
import { templatesController } from './templates.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireSystemRole } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createTemplateSchema, updateTemplateSchema } from '@pm/shared';

const router = Router({ mergeParams: true });

// GET / - List templates (public + user's own)
router.get(
  '/',
  authenticate,
  templatesController.list.bind(templatesController),
);

// GET /:templateId - Get template by ID
router.get(
  '/:templateId',
  authenticate,
  templatesController.getById.bind(templatesController),
);

// POST / - Create a new template
router.post(
  '/',
  authenticate,
  requireSystemRole('SYS_ADMIN', 'TEMPLATE_MANAGER'),
  validate(createTemplateSchema),
  templatesController.create.bind(templatesController),
);

// PATCH /:templateId - Update a template
router.patch(
  '/:templateId',
  authenticate,
  requireSystemRole('SYS_ADMIN', 'TEMPLATE_MANAGER'),
  validate(updateTemplateSchema),
  templatesController.update.bind(templatesController),
);

// DELETE /:templateId - Delete a template
router.delete(
  '/:templateId',
  authenticate,
  requireSystemRole('SYS_ADMIN', 'TEMPLATE_MANAGER'),
  templatesController.delete.bind(templatesController),
);

export default router;
