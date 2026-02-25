import { z } from 'zod';
import { dateString } from './common.validator.js';

export const updateTimelineSchema = z.object({
  startDate: dateString.nullable().optional(),
  endDate:   dateString.nullable().optional(),
  autoSchedule: z.boolean().default(false),
});
