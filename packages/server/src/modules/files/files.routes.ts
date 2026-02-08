import { Router } from 'express';
import multer from 'multer';
import { filesController } from './files.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireProjectRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { registerFileSchema, requestUploadUrlSchema } from '@pm/shared';

const router = Router({ mergeParams: true });

// Multer config: store in memory buffer, 10 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// GET / - List all files for a project
router.get(
  '/',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  filesController.list.bind(filesController),
);

// POST /upload - Direct file upload (multipart/form-data)
router.post(
  '/upload',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  upload.single('file'),
  filesController.upload.bind(filesController),
);

// POST /upload-url - Request a presigned upload URL (legacy)
router.post(
  '/upload-url',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(requestUploadUrlSchema),
  filesController.requestUploadUrl.bind(filesController),
);

// POST /register - Register an uploaded file (legacy)
router.post(
  '/register',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR'),
  validate(registerFileSchema),
  filesController.registerFile.bind(filesController),
);

// GET /:fileId/serve - Serve the actual file content
router.get(
  '/:fileId/serve',
  authenticate,
  requireProjectRole('OWNER', 'EDITOR', 'VIEWER', 'CUSTOM'),
  filesController.serveFile.bind(filesController),
);

// GET /:fileId/download - Get a download URL
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
