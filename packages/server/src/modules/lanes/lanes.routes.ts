import { Router } from 'express';
import { lanesController } from './lanes.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireProjectRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createLaneSchema, updateLaneSchema } from '@pm/shared';

const router = Router({ mergeParams: true });

router.get(
  '/',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  lanesController.list.bind(lanesController),
);

router.post(
  '/',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(createLaneSchema),
  lanesController.create.bind(lanesController),
);

router.patch(
  '/:laneId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(updateLaneSchema),
  lanesController.update.bind(lanesController),
);

router.delete(
  '/:laneId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  lanesController.delete.bind(lanesController),
);

export default router;
