import { Router } from 'express';
import { filesController } from './files.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireProjectRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { registerFileSchema, requestUploadUrlSchema } from '@pm/shared';

const router = Router({ mergeParams: true });

// GET / - List all files for a project
router.get(
  '/',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  filesController.list.bind(filesController),
);

// POST /upload-url - Request a presigned upload URL
router.post(
  '/upload-url',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(requestUploadUrlSchema),
  filesController.requestUploadUrl.bind(filesController),
);

// POST /register - Register an uploaded file
router.post(
  '/register',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(registerFileSchema),
  filesController.registerFile.bind(filesController),
);

// GET /:fileId/download - Get a presigned download URL
router.get(
  '/:fileId/download',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  filesController.getDownloadUrl.bind(filesController),
);

// DELETE /:fileId - Delete a file
router.delete(
  '/:fileId',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  filesController.delete.bind(filesController),
);

export default router;
