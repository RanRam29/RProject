import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { activityController } from './activity.controller';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', activityController.list);

export default router;
