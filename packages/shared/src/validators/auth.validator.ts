import { z } from 'zod';

// Top 100 most common passwords (subset of top 10k list)
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '123456', '12345678', '1234567890',
  'qwerty', 'qwerty123', 'abc123', 'monkey', 'master', 'dragon', 'login',
  'letmein', 'welcome', 'shadow', 'ashley', 'football', 'jesus', 'michael',
  'ninja', 'mustang', 'password1!', 'trustno1', 'iloveyou', 'sunshine',
  'princess', 'admin', 'administrator', 'passw0rd', 'p@ssw0rd', 'p@ssword',
  'baseball', 'starwars', 'access', 'flower', 'hello', 'charlie',
  'donald', '!@#$%^&*', 'nothing', 'batman', 'soccer', 'monkey1',
  'liverpool', 'cheese', 'andrea', 'joshua', 'matthew', 'daniel',
  'thomas', 'george', 'summer', 'winter', 'spring', 'autumn',
  'diamond', 'secret', 'freedom', 'whatever', 'qazwsx', 'computer',
  'thunder', 'ginger', 'hammer', 'silver', 'purple', 'pokemon',
  'pepper', 'jordan', 'hunter', 'ranger', 'buster', 'killer',
  'zxcvbn', 'asdfgh', 'qweasd', '123123', '654321', '111111',
  '121212', '000000', '696969', 'abcdef', 'abcabc', 'abc123!',
  'changeme', 'default', 'test123', 'guest', 'root', 'toor',
  'pass', 'pass123', 'pass1234', 'admin123', 'user', 'user123',
  'welcome1', 'welcome123', 'letmein1', 'opensesame', 'trustno1!',
]);

const passwordPolicy = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')
  .refine(
    (val) => !COMMON_PASSWORDS.has(val.toLowerCase()),
    { message: 'This password is too common. Please choose a more unique password.' },
  );

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
  systemRole: z.enum(['SYS_ADMIN', 'PROJECT_CREATOR', 'TEMPLATE_MANAGER', 'VIEWER_ONLY']).optional(),
});

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url('Invalid URL').max(500).nullable().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordPolicy,
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['SYS_ADMIN', 'PROJECT_CREATOR', 'TEMPLATE_MANAGER', 'VIEWER_ONLY']),
});
