import { Router } from 'express';
import { authenticate, requireSystemRole } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createUserSchema, updateUserSchema, changePasswordSchema, updateUserRoleSchema } from '@pm/shared';
import { usersController } from './users.controller.js';

const router = Router();

router.use(authenticate);

// Must be before /:id to avoid route conflict
router.get('/me/tasks', usersController.getMyTasks);
router.get('/me/stats', usersController.getMyStats);
router.get('/me/activity', usersController.getMyActivity);

router.post('/', requireSystemRole('SYS_ADMIN'), validate(createUserSchema), usersController.create);
router.get('/', requireSystemRole('SYS_ADMIN'), usersController.list);
router.get('/:id', usersController.getById);
router.patch('/:id', validate(updateUserSchema), usersController.update);
router.patch('/:id/password', validate(changePasswordSchema), usersController.changePassword);
router.patch('/:id/role', requireSystemRole('SYS_ADMIN'), validate(updateUserRoleSchema), usersController.updateRole);
router.delete('/:id', requireSystemRole('SYS_ADMIN'), usersController.deactivate);

export default router;
