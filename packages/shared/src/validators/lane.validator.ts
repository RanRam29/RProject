import { z } from 'zod';

export const createLaneSchema = z.object({
  name: z.string().min(1, 'Lane name is required').max(80),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional()
    .default('#94a3b8'),
});

export const updateLaneSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  sortOrder: z.number().int().optional(),
});
