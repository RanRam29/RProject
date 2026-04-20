import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireProjectRole } from '../../middleware/rbac.middleware.js';
import { activityController } from './activity.controller.js';

const router = Router({ mergeParams: true });

router.get(
  '/',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  activityController.list,
);

export default router;
