import { Router } from 'express';
import { commentsController } from './comments.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireProjectRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createCommentSchema, updateCommentSchema } from '@pm/shared';

const router = Router({ mergeParams: true });

// GET / - List all comments for a task
router.get(
  '/',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  commentsController.list.bind(commentsController),
);

// POST / - Create a new comment
router.post(
  '/',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(createCommentSchema),
  commentsController.create.bind(commentsController),
);

// PATCH /:commentId - Update a comment
router.patch(
  '/:commentId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(updateCommentSchema),
  commentsController.update.bind(commentsController),
);

// DELETE /:commentId - Delete a comment
router.delete(
  '/:commentId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  commentsController.delete.bind(commentsController),
);

export default router;
