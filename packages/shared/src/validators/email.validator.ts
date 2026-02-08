import { z } from 'zod';

// Re-use the same password policy from auth validator
const passwordPolicy = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

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
