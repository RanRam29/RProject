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
import laneRoutes from './modules/lanes/lanes.routes.js';
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
import emailRoutes from './modules/emails/email.routes.js';
import systemDefaultsRoutes from './modules/system-defaults/system-defaults.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';

const createApp = (): express.Application => {
  const app = express();

  // Trust the reverse proxy (e.g. Render Load Balancer) to ensure rate limiters use the real client IPs.
  app.set('trust proxy', 1);

  // ------------------------------------
  // Security & parsing middleware
  // ------------------------------------
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'wss:'],
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

  // ------------------------------------
  // Health check (Exempt from rate limits)
  // ------------------------------------
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/health/db', async (_req, res) => {
    try {
      const { default: prisma } = await import('./config/db.js');
      await prisma.$queryRaw`SELECT 1`;
      const dbUrl = process.env.DATABASE_URL ?? '';
      try {
        const userCount = await prisma.user.count();
        res.json({ status: 'ok', db: dbUrl.substring(0, 40) + '...', userCount });
      } catch (e2: unknown) {
        const msg = e2 instanceof Error ? e2.message : String(e2);
        res.json({ status: 'connected_no_schema', db: dbUrl.substring(0, 40) + '...', tableError: msg.substring(0, 300) });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ status: 'error', error: msg.substring(0, 200) });
    }
  });

  app.get('/api/debug/migrate', async (_req, res) => {
    const { execSync } = await import('child_process');
    const { fileURLToPath } = await import('url');
    const pathMod = await import('path');
    const url = new URL(import.meta.url);
    const dir = pathMod.default.dirname(fileURLToPath(url));
    const serverRoot = pathMod.default.resolve(dir, '..');
    const prismaBin = pathMod.default.join(serverRoot, 'node_modules', '.bin', 'prisma');
    try {
      const out = execSync(`"${prismaBin}" migrate deploy`, {
        cwd: serverRoot, env: process.env, encoding: 'utf8', timeout: 60000,
      });
      res.json({ status: 'ok', output: out.substring(0, 2000), cwd: serverRoot, bin: prismaBin });
    } catch (e: unknown) {
      const err = e as { message?: string; stdout?: string; stderr?: string };
      res.status(500).json({
        status: 'error', cwd: serverRoot, bin: prismaBin,
        message: err.message?.substring(0, 500),
        stdout: String(err.stdout ?? '').substring(0, 1000),
        stderr: String(err.stderr ?? '').substring(0, 1000),
      });
    }
  });

  app.use(defaultLimiter);

  // ------------------------------------
  // API routes (v1)
  // ------------------------------------
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/auth', emailRoutes); // Password reset & email verification
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/projects', projectRoutes);
  app.use('/api/v1/projects/:projectId/widgets', widgetRoutes);
  app.use('/api/v1/projects/:projectId/statuses', statusRoutes);
  app.use('/api/v1/projects/:projectId/lanes', laneRoutes);
  app.use('/api/v1/projects/:projectId/tasks', taskRoutes);
  app.use('/api/v1/projects/:projectId/permissions', permissionRoutes);
  app.use('/api/v1/projects/:projectId/files', fileRoutes);
  app.use('/api/v1/projects/:projectId/labels', labelRoutes);
  app.use('/api/v1/projects/:projectId/tasks/:taskId/comments', commentRoutes);
  app.use('/api/v1/projects/:projectId/activity', activityRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/templates', templateRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/system-defaults', systemDefaultsRoutes);
  app.use('/api/v1/projects/:projectId/ai', aiRoutes);

  // ------------------------------------
  // Error handling (must be registered last)
  // ------------------------------------
  app.use(errorHandler);

  return app;
};

export default createApp;