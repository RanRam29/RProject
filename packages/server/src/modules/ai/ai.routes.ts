import { Router } from 'express';
import { aiController } from './ai.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireProjectRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { aiLimiter } from '../../middleware/rate-limit.middleware.js';
import { aiChatSchema } from '@pm/shared';

const router = Router({ mergeParams: true });

// Apply AI-specific rate limiter to all AI routes
router.use(aiLimiter);

// GET /status - Check if AI backend is available
router.get(
  '/status',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  aiController.status.bind(aiController),
);

// POST /chat - Send a message (non-streaming)
router.post(
  '/chat',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  validate(aiChatSchema),
  aiController.chat.bind(aiController),
);

// POST /chat/stream - Send a message with streaming response
router.post(
  '/chat/stream',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  validate(aiChatSchema),
  aiController.chatStream.bind(aiController),
);

export default router;
