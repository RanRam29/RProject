import { Router } from 'express';
import { projectsController } from './projects.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireSystemRole } from '../../middleware/auth.middleware';
import { requireProjectRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createProjectSchema,
  instantiateProjectSchema,
  updateProjectSchema,
  updateProjectStatusSchema,
} from '@pm/shared';

const router = Router({ mergeParams: true });

// POST / - Create a new project
router.post(
  '/',
  authenticate,
  requireSystemRole('SYS_ADMIN', 'PROJECT_CREATOR'),
  validate(createProjectSchema),
  projectsController.create.bind(projectsController),
);

// POST /instantiate - Create project from template
router.post(
  '/instantiate',
  authenticate,
  requireSystemRole('SYS_ADMIN', 'PROJECT_CREATOR'),
  validate(instantiateProjectSchema),
  projectsController.instantiate.bind(projectsController),
);

// GET / - List user's projects
router.get(
  '/',
  authenticate,
  projectsController.list.bind(projectsController),
);

// GET /:projectId - Get project by ID
router.get(
  '/:projectId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  projectsController.getById.bind(projectsController),
);

// PATCH /:projectId - Update project
router.patch(
  '/:projectId',
  authenticate,
  requireProjectRole('OWNER'),
  validate(updateProjectSchema),
  projectsController.update.bind(projectsController),
);

// PATCH /:projectId/status - Update project status
router.patch(
  '/:projectId/status',
  authenticate,
  requireProjectRole('OWNER'),
  validate(updateProjectStatusSchema),
  projectsController.updateStatus.bind(projectsController),
);

// DELETE /:projectId - Delete project
router.delete(
  '/:projectId',
  authenticate,
  requireProjectRole('OWNER'),
  projectsController.delete.bind(projectsController),
);

// POST /:projectId/save-as-template - Save project as template
router.post(
  '/:projectId/save-as-template',
  authenticate,
  requireProjectRole('OWNER'),
  projectsController.saveAsTemplate.bind(projectsController),
);

export default router;
