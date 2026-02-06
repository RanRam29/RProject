import { z } from 'zod';

export const inviteUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['EDITOR', 'VIEWER', 'CUSTOM']),
  customRoleId: z.string().uuid().optional(),
});

export const updatePermissionSchema = z.object({
  role: z.enum(['EDITOR', 'VIEWER', 'CUSTOM']),
  customRoleId: z.string().uuid().optional(),
  capabilities: z.record(z.boolean()).optional(),
});

export const createCustomRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50),
  description: z.string().max(500).optional(),
  capabilities: z.record(z.boolean()),
});

export const updateCustomRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  capabilities: z.record(z.boolean()).optional(),
});
