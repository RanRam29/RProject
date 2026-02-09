import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Prisma ──────────────────────────────────────────────────────────────
const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockUserUpdate = vi.fn();
const mockPasswordResetTokenFindUnique = vi.fn();
const mockPasswordResetTokenCreate = vi.fn();
const mockPasswordResetTokenUpdateMany = vi.fn();
const mockPasswordResetTokenUpdate = vi.fn();
const mockEmailVerificationTokenFindUnique = vi.fn();
const mockEmailVerificationTokenCreate = vi.fn();
const mockEmailVerificationTokenUpdate = vi.fn();
const mockEmailVerificationTokenFindFirst = vi.fn();
const mockRefreshTokenDeleteMany = vi.fn();
const mockRefreshTokenCreate = vi.fn();
const mockTransaction = vi.fn();
const mockAuditLogCreate = vi.fn().mockResolvedValue({});

vi.mock('../../config/db.js', () => ({
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    passwordResetToken: {
      findUnique: (...args: unknown[]) => mockPasswordResetTokenFindUnique(...args),
      create: (...args: unknown[]) => mockPasswordResetTokenCreate(...args),
      updateMany: (...args: unknown[]) => mockPasswordResetTokenUpdateMany(...args),
      update: (...args: unknown[]) => mockPasswordResetTokenUpdate(...args),
    },
    emailVerificationToken: {
      findUnique: (...args: unknown[]) => mockEmailVerificationTokenFindUnique(...args),
      create: (...args: unknown[]) => mockEmailVerificationTokenCreate(...args),
      update: (...args: unknown[]) => mockEmailVerificationTokenUpdate(...args),
      findFirst: (...args: unknown[]) => mockEmailVerificationTokenFindFirst(...args),
    },
    refreshToken: {
      deleteMany: (...args: unknown[]) => mockRefreshTokenDeleteMany(...args),
      create: (...args: unknown[]) => mockRefreshTokenCreate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    auditLog: {
      create: (...args: unknown[]) => mockAuditLogCreate(...args),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

vi.mock('../../config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-for-integration-tests',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    CLIENT_URL: 'http://localhost:5173',
    PORT: 3001,
    DATABASE_URL: 'postgresql://test',
    AWS_REGION: '',
    AWS_ACCESS_KEY_ID: '',
    AWS_SECRET_ACCESS_KEY: '',
    S3_BUCKET_NAME: '',
    RESEND_API_KEY: '',
    EMAIL_FROM: 'GSD <noreply@gsd.app>',
  },
  default: {
    JWT_SECRET: 'test-secret-key-for-integration-tests',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    CLIENT_URL: 'http://localhost:5173',
    PORT: 3001,
    DATABASE_URL: 'postgresql://test',
    AWS_REGION: '',
    AWS_ACCESS_KEY_ID: '',
    AWS_SECRET_ACCESS_KEY: '',
    S3_BUCKET_NAME: '',
    RESEND_API_KEY: '',
    EMAIL_FROM: 'GSD <noreply@gsd.app>',
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('new-hashed-password'),
    compare: vi.fn(),
  },
}));

import createApp from '../../app.js';

// ── Inline HTTP request helper ───────────────────────────────────────────────
async function request(app: ReturnType<typeof createApp>) {
  const http = await import('http');
  const server = http.createServer(app);

  return {
    post: (path: string) => makeRequest(server, 'POST', path),
    get: (path: string) => makeRequest(server, 'GET', path),
    _server: server,
  };
}

function makeRequest(server: ReturnType<typeof import('http').createServer>, method: string, path: string) {
  let _body: unknown = undefined;
  let _headers: Record<string, string> = { 'content-type': 'application/json' };

  const chain: {
    set(key: string, value: string): typeof chain;
    send(body: unknown): typeof chain;
    then<T = { status: number; body: unknown }, R = never>(
      resolve?: ((value: { status: number; body: unknown }) => T | PromiseLike<T>) | null,
      reject?: ((err: unknown) => R | PromiseLike<R>) | null,
    ): Promise<T | R>;
  } = {
    set(key: string, value: string) {
      _headers[key] = value;
      return chain;
    },
    send(body: unknown) {
      _body = body;
      return chain;
    },
    then(resolve?, reject?) {
      return new Promise<{ status: number; body: unknown }>((res, rej) => {
        const http = require('http');
        const addr = server.listen(0).address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;

        const req = http.request(
          { hostname: '127.0.0.1', port, path, method, headers: _headers },
          (response: { statusCode: number; on: (event: string, cb: (data?: Buffer) => void) => void }) => {
            let data = '';
            response.on('data', (chunk?: Buffer) => { if (chunk) data += chunk.toString(); });
            response.on('end', () => {
              server.close();
              try {
                res({ status: response.statusCode, body: JSON.parse(data) });
              } catch {
                res({ status: response.statusCode, body: data });
              }
            });
          },
        );

        req.on('error', (err: unknown) => { server.close(); rej(err); });
        if (_body) req.write(JSON.stringify(_body));
        req.end();
      }).then(resolve, reject);
    },
  };

  return chain;
}

// ── Test Data ────────────────────────────────────────────────────────────────

const testUser = {
  id: '00000000-0000-4000-a000-000000000001',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  displayName: 'Test User',
  avatarUrl: null,
  systemRole: 'VIEWER_ONLY',
  isActive: true,
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validResetToken = {
  id: '00000000-0000-4000-a000-000000000010',
  token: 'valid-reset-token-uuid',
  userId: testUser.id,
  user: testUser,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
  usedAt: null,
  createdAt: new Date(),
};

const expiredResetToken = {
  id: '00000000-0000-4000-a000-000000000011',
  token: 'expired-reset-token-uuid',
  userId: testUser.id,
  user: testUser,
  expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
  usedAt: null,
  createdAt: new Date(),
};

const usedResetToken = {
  id: '00000000-0000-4000-a000-000000000012',
  token: 'used-reset-token-uuid',
  userId: testUser.id,
  user: testUser,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  usedAt: new Date(),
  createdAt: new Date(),
};

const validVerificationToken = {
  id: '00000000-0000-4000-a000-000000000020',
  token: 'valid-verify-token-uuid',
  userId: testUser.id,
  user: testUser,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  usedAt: null,
  createdAt: new Date(),
};

const expiredVerificationToken = {
  id: '00000000-0000-4000-a000-000000000021',
  token: 'expired-verify-token-uuid',
  userId: testUser.id,
  user: testUser,
  expiresAt: new Date(Date.now() - 60 * 60 * 1000),
  usedAt: null,
  createdAt: new Date(),
};

const usedVerificationToken = {
  id: '00000000-0000-4000-a000-000000000022',
  token: 'used-verify-token-uuid',
  userId: testUser.id,
  user: testUser,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  usedAt: new Date(),
  createdAt: new Date(),
};

const ORIGIN = 'http://localhost:5173';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Email Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockResolvedValue([]);
    mockPasswordResetTokenCreate.mockResolvedValue({});
    mockPasswordResetTokenUpdateMany.mockResolvedValue({ count: 0 });
    mockEmailVerificationTokenCreate.mockResolvedValue({});
  });

  // ════════════════════════════════════════════════
  // FORGOT PASSWORD
  // ════════════════════════════════════════════════

  describe('POST /api/v1/auth/forgot-password', () => {
    it('returns 200 with success message for valid email', async () => {
      mockUserFindUnique.mockResolvedValue(testUser);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/forgot-password')
          .set('Origin', ORIGIN)
          .send({ email: 'test@example.com' }),
      );

      expect(res.status).toBe(200);
      expect((res.body as { success: boolean }).success).toBe(true);
      expect((res.body as { data: { message: string } }).data.message).toContain('password reset link has been sent');
      expect(mockPasswordResetTokenCreate).toHaveBeenCalled();
    });

    it('returns 200 even for non-existent email (prevents enumeration)', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/forgot-password')
          .set('Origin', ORIGIN)
          .send({ email: 'nonexistent@example.com' }),
      );

      expect(res.status).toBe(200);
      expect((res.body as { success: boolean }).success).toBe(true);
      expect((res.body as { data: { message: string } }).data.message).toContain('password reset link has been sent');
      // Should NOT create a token for non-existent user
      expect(mockPasswordResetTokenCreate).not.toHaveBeenCalled();
    });

    it('returns 200 for deactivated account (prevents enumeration)', async () => {
      mockUserFindUnique.mockResolvedValue({ ...testUser, isActive: false });

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/forgot-password')
          .set('Origin', ORIGIN)
          .send({ email: 'test@example.com' }),
      );

      expect(res.status).toBe(200);
      expect(mockPasswordResetTokenCreate).not.toHaveBeenCalled();
    });

    it('invalidates existing tokens before creating new one', async () => {
      mockUserFindUnique.mockResolvedValue(testUser);

      const app = createApp();
      await request(app).then((r) =>
        r.post('/api/v1/auth/forgot-password')
          .set('Origin', ORIGIN)
          .send({ email: 'test@example.com' }),
      );

      expect(mockPasswordResetTokenUpdateMany).toHaveBeenCalledWith({
        where: {
          userId: testUser.id,
          usedAt: null,
        },
        data: {
          usedAt: expect.any(Date),
        },
      });
    });

    it('returns 400 for invalid email format', async () => {
      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/forgot-password')
          .set('Origin', ORIGIN)
          .send({ email: 'not-an-email' }),
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing email', async () => {
      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/forgot-password')
          .set('Origin', ORIGIN)
          .send({}),
      );

      expect(res.status).toBe(400);
    });
  });

  // ════════════════════════════════════════════════
  // RESET PASSWORD
  // ════════════════════════════════════════════════

  describe('POST /api/v1/auth/reset-password', () => {
    it('resets password with valid token', async () => {
      mockPasswordResetTokenFindUnique.mockResolvedValue(validResetToken);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/reset-password')
          .set('Origin', ORIGIN)
          .send({ token: 'valid-reset-token-uuid', password: 'NewPass123!' }),
      );

      expect(res.status).toBe(200);
      expect((res.body as { success: boolean }).success).toBe(true);
      expect((res.body as { data: { message: string } }).data.message).toContain('Password has been reset');
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('returns 400 for invalid token', async () => {
      mockPasswordResetTokenFindUnique.mockResolvedValue(null);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/reset-password')
          .set('Origin', ORIGIN)
          .send({ token: 'nonexistent-token', password: 'NewPass123!' }),
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 for expired token', async () => {
      mockPasswordResetTokenFindUnique.mockResolvedValue(expiredResetToken);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/reset-password')
          .set('Origin', ORIGIN)
          .send({ token: 'expired-reset-token-uuid', password: 'NewPass123!' }),
      );

      expect(res.status).toBe(400);
      expect((res.body as { error: string }).error).toContain('expired');
    });

    it('returns 400 for already-used token', async () => {
      mockPasswordResetTokenFindUnique.mockResolvedValue(usedResetToken);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/reset-password')
          .set('Origin', ORIGIN)
          .send({ token: 'used-reset-token-uuid', password: 'NewPass123!' }),
      );

      expect(res.status).toBe(400);
      expect((res.body as { error: string }).error).toContain('already been used');
    });

    it('returns 400 for weak password', async () => {
      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/reset-password')
          .set('Origin', ORIGIN)
          .send({ token: 'valid-reset-token-uuid', password: 'weak' }),
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing token', async () => {
      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/reset-password')
          .set('Origin', ORIGIN)
          .send({ password: 'NewPass123!' }),
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing password', async () => {
      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/reset-password')
          .set('Origin', ORIGIN)
          .send({ token: 'valid-reset-token-uuid' }),
      );

      expect(res.status).toBe(400);
    });
  });

  // ════════════════════════════════════════════════
  // VERIFY EMAIL
  // ════════════════════════════════════════════════

  describe('POST /api/v1/auth/verify-email', () => {
    it('verifies email with valid token', async () => {
      mockEmailVerificationTokenFindUnique.mockResolvedValue(validVerificationToken);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/verify-email')
          .set('Origin', ORIGIN)
          .send({ token: 'valid-verify-token-uuid' }),
      );

      expect(res.status).toBe(200);
      expect((res.body as { success: boolean }).success).toBe(true);
      expect((res.body as { data: { message: string } }).data.message).toContain('verified successfully');
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('returns 200 for already-verified user', async () => {
      const alreadyVerifiedUser = { ...testUser, emailVerified: true };
      const tokenWithVerifiedUser = {
        ...validVerificationToken,
        user: alreadyVerifiedUser,
      };
      mockEmailVerificationTokenFindUnique.mockResolvedValue(tokenWithVerifiedUser);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/verify-email')
          .set('Origin', ORIGIN)
          .send({ token: 'valid-verify-token-uuid' }),
      );

      expect(res.status).toBe(200);
      expect((res.body as { data: { message: string } }).data.message).toContain('already verified');
      // Should NOT run transaction if already verified
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid token', async () => {
      mockEmailVerificationTokenFindUnique.mockResolvedValue(null);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/verify-email')
          .set('Origin', ORIGIN)
          .send({ token: 'nonexistent-token' }),
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 for expired token', async () => {
      mockEmailVerificationTokenFindUnique.mockResolvedValue(expiredVerificationToken);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/verify-email')
          .set('Origin', ORIGIN)
          .send({ token: 'expired-verify-token-uuid' }),
      );

      expect(res.status).toBe(400);
      expect((res.body as { error: string }).error).toContain('expired');
    });

    it('returns 400 for already-used token', async () => {
      mockEmailVerificationTokenFindUnique.mockResolvedValue(usedVerificationToken);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/verify-email')
          .set('Origin', ORIGIN)
          .send({ token: 'used-verify-token-uuid' }),
      );

      expect(res.status).toBe(400);
      expect((res.body as { error: string }).error).toContain('already been used');
    });

    it('returns 400 for missing token', async () => {
      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/verify-email')
          .set('Origin', ORIGIN)
          .send({}),
      );

      expect(res.status).toBe(400);
    });
  });

  // ════════════════════════════════════════════════
  // RESEND VERIFICATION
  // ════════════════════════════════════════════════

  describe('POST /api/v1/auth/resend-verification', () => {
    it('sends verification email for unverified user', async () => {
      mockUserFindUnique.mockResolvedValue(testUser);
      mockEmailVerificationTokenFindFirst.mockResolvedValue(null); // No recent token

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/resend-verification')
          .set('Origin', ORIGIN)
          .send({ email: 'test@example.com' }),
      );

      expect(res.status).toBe(200);
      expect((res.body as { success: boolean }).success).toBe(true);
      expect((res.body as { data: { message: string } }).data.message).toContain('verification link has been sent');
      expect(mockEmailVerificationTokenCreate).toHaveBeenCalled();
    });

    it('returns 200 for non-existent email (prevents enumeration)', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/resend-verification')
          .set('Origin', ORIGIN)
          .send({ email: 'nonexistent@example.com' }),
      );

      expect(res.status).toBe(200);
      expect(mockEmailVerificationTokenCreate).not.toHaveBeenCalled();
    });

    it('returns 200 for already-verified email (prevents enumeration)', async () => {
      mockUserFindUnique.mockResolvedValue({ ...testUser, emailVerified: true });

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/resend-verification')
          .set('Origin', ORIGIN)
          .send({ email: 'test@example.com' }),
      );

      expect(res.status).toBe(200);
      expect(mockEmailVerificationTokenCreate).not.toHaveBeenCalled();
    });

    it('returns 429 when cooldown is active', async () => {
      mockUserFindUnique.mockResolvedValue(testUser);
      mockEmailVerificationTokenFindFirst.mockResolvedValue({
        id: 'recent-token',
        token: 'recent-token-value',
        userId: testUser.id,
        createdAt: new Date(), // Just created
      });

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/resend-verification')
          .set('Origin', ORIGIN)
          .send({ email: 'test@example.com' }),
      );

      expect(res.status).toBe(429);
    });

    it('returns 400 for invalid email format', async () => {
      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/resend-verification')
          .set('Origin', ORIGIN)
          .send({ email: 'not-valid' }),
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing email', async () => {
      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/resend-verification')
          .set('Origin', ORIGIN)
          .send({}),
      );

      expect(res.status).toBe(400);
    });
  });
});
