import { Router } from 'express';
import { permissionsController } from './permissions.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireProjectRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  inviteUserSchema,
  updatePermissionSchema,
  createCustomRoleSchema,
  updateCustomRoleSchema,
} from '@pm/shared';

const router = Router({ mergeParams: true });

// ── Permission routes ───────────────────────────────────────────────────

// GET / - List all permissions for a project
router.get(
  '/',
  authenticate,
  requireProjectRole('OWNER'),
  permissionsController.list.bind(permissionsController),
);

// POST /invite - Invite a user to the project
router.post(
  '/invite',
  authenticate,
  requireProjectRole('OWNER'),
  validate(inviteUserSchema),
  permissionsController.invite.bind(permissionsController),
);

// PATCH /:permId - Update a user's permission
router.patch(
  '/:permId',
  authenticate,
  requireProjectRole('OWNER'),
  validate(updatePermissionSchema),
  permissionsController.update.bind(permissionsController),
);

// DELETE /:permId - Remove a user's permission
router.delete(
  '/:permId',
  authenticate,
  requireProjectRole('OWNER'),
  permissionsController.remove.bind(permissionsController),
);

// ── Custom Role routes ──────────────────────────────────────────────────

// GET /custom-roles - List custom roles for a project
router.get(
  '/custom-roles',
  authenticate,
  requireProjectRole('OWNER'),
  permissionsController.listCustomRoles.bind(permissionsController),
);

// POST /custom-roles - Create a custom role
router.post(
  '/custom-roles',
  authenticate,
  requireProjectRole('OWNER'),
  validate(createCustomRoleSchema),
  permissionsController.createCustomRole.bind(permissionsController),
);

// PATCH /custom-roles/:roleId - Update a custom role
router.patch(
  '/custom-roles/:roleId',
  authenticate,
  requireProjectRole('OWNER'),
  validate(updateCustomRoleSchema),
  permissionsController.updateCustomRole.bind(permissionsController),
);

// DELETE /custom-roles/:roleId - Delete a custom role
router.delete(
  '/custom-roles/:roleId',
  authenticate,
  requireProjectRole('OWNER'),
  permissionsController.deleteCustomRole.bind(permissionsController),
);

export default router;
