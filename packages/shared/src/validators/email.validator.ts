import { z } from 'zod';
import { passwordPolicy } from './common.validator.js';

/** POST /auth/forgot-password */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/** POST /auth/reset-password */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordPolicy,
});

/** POST /auth/verify-email */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

/** POST /auth/resend-verification */
export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});
