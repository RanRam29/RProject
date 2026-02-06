import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { corsOptions } from './config/cors';
import { errorHandler } from './middleware/error-handler.middleware';
import { defaultLimiter } from './middleware/rate-limit.middleware';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import projectRoutes from './modules/projects/projects.routes';
import widgetRoutes from './modules/widgets/widgets.routes';
import statusRoutes from './modules/statuses/statuses.routes';
import taskRoutes from './modules/tasks/tasks.routes';
import permissionRoutes from './modules/permissions/permissions.routes';
import fileRoutes from './modules/files/files.routes';
import templateRoutes from './modules/templates/templates.routes';
import userRoutes from './modules/users/users.routes';
import adminRoutes from './modules/admin/admin.routes';
import labelRoutes from './modules/labels/labels.routes';
import commentRoutes from './modules/comments/comments.routes';
import activityRoutes from './modules/activity/activity.routes';

const createApp = (): express.Application => {
  const app = express();

  // ------------------------------------
  // Security & parsing middleware
  // ------------------------------------
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));
  app.use(defaultLimiter);

  // ------------------------------------
  // Health check
  // ------------------------------------
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ------------------------------------
  // API routes (v1)
  // ------------------------------------
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/projects', projectRoutes);
  app.use('/api/v1/projects/:projectId/widgets', widgetRoutes);
  app.use('/api/v1/projects/:projectId/statuses', statusRoutes);
  app.use('/api/v1/projects/:projectId/tasks', taskRoutes);
  app.use('/api/v1/projects/:projectId/permissions', permissionRoutes);
  app.use('/api/v1/projects/:projectId/files', fileRoutes);
  app.use('/api/v1/projects/:projectId/labels', labelRoutes);
  app.use('/api/v1/projects/:projectId/tasks/:taskId/comments', commentRoutes);
  app.use('/api/v1/projects/:projectId/activity', activityRoutes);
  app.use('/api/v1/templates', templateRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // ------------------------------------
  // Error handling (must be registered last)
  // ------------------------------------
  app.use(errorHandler);

  return app;
};

export default createApp;
