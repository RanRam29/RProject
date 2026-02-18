import { z } from 'zod';
import { dateString } from './common.validator.js';

/** POST /tasks/:taskId/time/start */
export const startTimerSchema = z.object({
  description: z.string().max(500).optional(),
});

/** POST /tasks/:taskId/time/manual */
export const manualTimeEntrySchema = z.object({
  startedAt: dateString,
  stoppedAt: dateString,
  description: z.string().max(500).optional(),
});

/** PATCH /tasks/time/:entryId */
export const updateTimeEntrySchema = z.object({
  description: z.string().max(500).optional(),
});
