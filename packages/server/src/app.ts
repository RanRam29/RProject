import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { corsOptions } from './config/cors.js';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { defaultLimiter } from './middleware/rate-limit.middleware.js';
import { csrfProtection } from './middleware/csrf.middleware.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import projectRoutes from './modules/projects/projects.routes.js';
import widgetRoutes from './modules/widgets/widgets.routes.js';
import statusRoutes from './modules/statuses/statuses.routes.js';
import taskRoutes from './modules/tasks/tasks.routes.js';
import permissionRoutes from './modules/permissions/permissions.routes.js';
import fileRoutes from './modules/files/files.routes.js';
import templateRoutes from './modules/templates/templates.routes.js';
import userRoutes from './modules/users/users.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import labelRoutes from './modules/labels/labels.routes.js';
import commentRoutes from './modules/comments/comments.routes.js';
import activityRoutes from './modules/activity/activity.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';

const createApp = (): express.Application => {
  const app = express();

  // ------------------------------------
  // Security & parsing middleware
  // ------------------------------------
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    next();
  });
  app.use(cors(corsOptions));
  app.use(csrfProtection);
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));
  }
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
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/templates', templateRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // ------------------------------------
  // Error handling (must be registered last)
  // ------------------------------------
  app.use(errorHandler);

  return app;
};

export default createApp;