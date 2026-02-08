import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';
import prisma from '../config/db.js';

export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.register'
  | 'auth.logout'
  | 'auth.token_refresh'
  | 'auth.account_locked'
  | 'admin.user_created'
  | 'admin.user_deactivated'
  | 'admin.user_role_changed'
  | 'permission.invited'
  | 'permission.updated'
  | 'permission.removed';

interface AuditEntry {
  action: AuditAction;
  actorId: string | null;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip: string;
  userAgent: string;
  timestamp: string;
}

// Retention: auto-delete audit logs older than 90 days
const AUDIT_RETENTION_DAYS = 90;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run daily

// Start periodic cleanup
setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      logger.info(`AUDIT CLEANUP: Deleted ${result.count} audit logs older than ${AUDIT_RETENTION_DAYS} days`);
    }
  } catch (err) {
    logger.error('AUDIT CLEANUP failed:', String(err));
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Log an audit event for security-sensitive operations.
 * Persists to database and writes to structured log.
 */
export function audit(req: Request, action: AuditAction, details?: {
  targetId?: string;
  metadata?: Record<string, unknown>;
}): void {
  const entry: AuditEntry = {
    action,
    actorId: req.user?.sub ?? null,
    targetId: details?.targetId,
    metadata: details?.metadata,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    timestamp: new Date().toISOString(),
  };

  // Write to structured log immediately (synchronous)
  logger.info(`AUDIT: ${JSON.stringify(entry)}`);

  // Persist to database asynchronously (fire-and-forget, don't block the request)
  prisma.auditLog.create({
    data: {
      action: entry.action,
      actorId: entry.actorId,
      targetId: entry.targetId,
      metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
      ip: entry.ip,
      userAgent: entry.userAgent,
    },
  }).catch((err) => {
    logger.error('Failed to persist audit log:', String(err));
  });
}
