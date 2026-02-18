import { z } from 'zod';
import { SystemRole } from '../enums/index.js';
import { passwordPolicy } from './common.validator.js';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordPolicy,
  displayName: z.string().min(1, 'Display name is required').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordPolicy,
  displayName: z.string().min(1, 'Display name is required').max(100),
  systemRole: z.nativeEnum(SystemRole).optional(),
});

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url('Invalid URL').max(500).nullable().optional(),
  emailNotifications: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordPolicy,
});

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(SystemRole),
});
