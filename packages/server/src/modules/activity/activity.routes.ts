import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { activityController } from './activity.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', activityController.list);

export default router;
