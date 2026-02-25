import { describe, it, expect, vi } from 'vitest';
import type { Request } from 'express';
import { audit } from './audit.middleware.js';

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { logger } from '../utils/logger.js';

function createReq(user?: { sub: string }, ip?: string): Request {
  return {
    user: user ? { sub: user.sub } : undefined,
    ip: ip || '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    headers: { 'user-agent': 'test-agent' },
  } as unknown as Request;
}

describe('audit middleware', () => {
  it('logs audit event with actor info', () => {
    const req = createReq({ sub: 'user-1' });

    audit(req, 'auth.login', { targetId: 'user-1' });

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('"action":"auth.login"')
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('"actorId":"user-1"')
    );
  });

  it('logs null actorId when user not set', () => {
    const req = createReq();

    audit(req, 'auth.login_failed');

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('"actorId":null')
    );
  });

  it('includes metadata when provided', () => {
    const req = createReq({ sub: 'admin-1' });

    audit(req, 'admin.user_role_changed', {
      targetId: 'user-2',
      metadata: { newRole: 'SYS_ADMIN' },
    });

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('"newRole":"SYS_ADMIN"')
    );
  });

  it('includes IP and user agent', () => {
    const req = createReq({ sub: 'user-1' }, '192.168.1.1');

    audit(req, 'auth.logout');

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('"ip":"192.168.1.1"')
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('"userAgent":"test-agent"')
    );
  });

  it('includes timestamp', () => {
    const req = createReq({ sub: 'user-1' });

    audit(req, 'auth.register');

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('"timestamp"')
    );
  });
});
