import { Router } from 'express';
import { authenticate, requireSystemRole } from '../../middleware/auth.middleware.js';
import { systemDefaultsController } from './system-defaults.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireSystemRole('SYS_ADMIN'));

router.get('/', systemDefaultsController.get.bind(systemDefaultsController));
router.put('/', systemDefaultsController.update.bind(systemDefaultsController));

export default router;
