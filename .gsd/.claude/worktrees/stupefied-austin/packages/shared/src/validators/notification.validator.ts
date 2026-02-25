import { z } from 'zod';

export const notificationPreferencesSchema = z.object({
  taskAssigned: z.boolean().optional(),
  taskUpdated: z.boolean().optional(),
  taskCommented: z.boolean().optional(),
  projectInvited: z.boolean().optional(),
  permissionChanged: z.boolean().optional(),
  mentions: z.boolean().optional(),
});
