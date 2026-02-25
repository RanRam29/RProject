import { Router } from 'express';
import { emailController } from './email.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '@pm/shared';

const router = Router();

// Password reset
router.post('/forgot-password', validate(forgotPasswordSchema), emailController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), emailController.resetPassword);

// Email verification
router.post('/verify-email', validate(verifyEmailSchema), emailController.verifyEmail);
router.post('/resend-verification', validate(resendVerificationSchema), emailController.resendVerification);

export default router;
