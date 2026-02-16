import { z } from 'zod';

const aiChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(10000),
});

export const aiChatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000, 'Message too long'),
  history: z.array(aiChatMessageSchema).max(50, 'Conversation history too long').optional(),
});
