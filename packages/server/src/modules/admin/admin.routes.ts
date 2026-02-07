import { Router } from 'express';
import { authenticate, requireSystemRole } from '../../middleware/auth.middleware.js';
import { adminController } from './admin.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireSystemRole('SYS_ADMIN'));

router.get('/logs', adminController.getLogs);
router.get('/stats', adminController.getStats);

export default router;
