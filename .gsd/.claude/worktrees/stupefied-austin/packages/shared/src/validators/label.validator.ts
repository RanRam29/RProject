import { z } from 'zod';

export const createLabelSchema = z.object({
  name: z.string().min(1, 'Label name is required').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#6B7280'),
});

export const updateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const assignLabelSchema = z.object({
  labelId: z.string().uuid('Invalid label ID'),
});
