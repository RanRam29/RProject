import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authLimiter, defaultLimiter } from '../../middleware/rate-limit.middleware.js'; // shared 10 req/15min window across register, login, refresh per IP
import { registerSchema, loginSchema, refreshTokenSchema } from '@pm/shared';

const router = Router();

router.get('/setup-check', defaultLimiter, authController.checkSetup);
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, validate(refreshTokenSchema), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
