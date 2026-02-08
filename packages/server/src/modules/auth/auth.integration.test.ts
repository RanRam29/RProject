import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Prisma ──────────────────────────────────────────────────────────────
const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockRefreshTokenFindUnique = vi.fn();
const mockRefreshTokenCreate = vi.fn();
const mockRefreshTokenDelete = vi.fn();
const mockRefreshTokenDeleteMany = vi.fn();
const mockAuditLogCreate = vi.fn().mockResolvedValue({});

vi.mock('../../config/db.js', () => ({
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
    },
    refreshToken: {
      findUnique: (...args: unknown[]) => mockRefreshTokenFindUnique(...args),
      create: (...args: unknown[]) => mockRefreshTokenCreate(...args),
      delete: (...args: unknown[]) => mockRefreshTokenDelete(...args),
      deleteMany: (...args: unknown[]) => mockRefreshTokenDeleteMany(...args),
    },
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
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn(),
  },
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import createApp from '../../app.js';
import { describe as _d } from 'vitest';

// Inline supertest-like HTTP testing using the app
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

  const chain = {
    set(key: string, value: string) {
      _headers[key] = value;
      return chain;
    },
    send(body: unknown) {
      _body = body;
      return chain;
    },
    then(resolve: (value: { status: number; body: unknown }) => void, reject: (err: unknown) => void) {
      const http = require('http');
      const addr = server.listen(0).address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;

      const options = {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: _headers,
      };

      const req = http.request(options, (res: { statusCode: number; on: (event: string, cb: (data?: Buffer) => void) => void }) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => {
          server.close();
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });

      req.on('error', (err: unknown) => {
        server.close();
        reject(err);
      });

      if (_body) {
        req.write(JSON.stringify(_body));
      }
      req.end();
    },
  };

  return chain;
}

const testUser = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  displayName: 'Test User',
  avatarUrl: null,
  systemRole: 'VIEWER_ONLY',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshTokenCreate.mockResolvedValue({});
  });

  describe('POST /api/v1/auth/register', () => {
    it('returns 400 for missing fields', async () => {
      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/register')
          .set('Origin', 'http://localhost:5173')
          .send({ email: 'test@example.com' }),
      );

      expect(res.status).toBe(400);
      expect((res.body as { success: boolean }).success).toBe(false);
    });

    it('returns 400 for weak password', async () => {
      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/register')
          .set('Origin', 'http://localhost:5173')
          .send({
            email: 'test@example.com',
            password: 'weak',
            displayName: 'Test User',
          }),
      );

      expect(res.status).toBe(400);
    });

    it('returns 201 for valid registration', async () => {
      mockUserFindUnique.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue(testUser);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/register')
          .set('Origin', 'http://localhost:5173')
          .send({
            email: 'test@example.com',
            password: 'Str0ng!Pass',
            displayName: 'Test User',
          }),
      );

      expect(res.status).toBe(201);
      const body = res.body as { success: boolean; data: { user: { email: string }; tokens: { accessToken: string } } };
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('test@example.com');
      expect(body.data.tokens.accessToken).toBeDefined();
    });

    it('returns 409 for duplicate email', async () => {
      mockUserFindUnique.mockResolvedValue(testUser);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/register')
          .set('Origin', 'http://localhost:5173')
          .send({
            email: 'test@example.com',
            password: 'Str0ng!Pass',
            displayName: 'Test User',
          }),
      );

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 401 for invalid credentials', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/login')
          .set('Origin', 'http://localhost:5173')
          .send({ email: 'test@example.com', password: 'wrong' }),
      );

      expect(res.status).toBe(401);
    });

    it('returns 200 for valid login', async () => {
      mockUserFindUnique.mockResolvedValue(testUser);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/login')
          .set('Origin', 'http://localhost:5173')
          .send({ email: 'test@example.com', password: 'Str0ng!Pass' }),
      );

      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; data: { user: { email: string }; tokens: { accessToken: string; refreshToken: string } } };
      expect(body.success).toBe(true);
      expect(body.data.tokens.accessToken).toBeDefined();
      expect(body.data.tokens.refreshToken).toBeDefined();
    });

    it('returns 401 for deactivated account', async () => {
      mockUserFindUnique.mockResolvedValue({ ...testUser, isActive: false });

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/login')
          .set('Origin', 'http://localhost:5173')
          .send({ email: 'test@example.com', password: 'Str0ng!Pass' }),
      );

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('returns 401 for invalid refresh token', async () => {
      mockRefreshTokenFindUnique.mockResolvedValue(null);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/refresh')
          .set('Origin', 'http://localhost:5173')
          .send({ refreshToken: 'invalid-token' }),
      );

      expect(res.status).toBe(401);
    });

    it('returns 200 with new tokens for valid refresh', async () => {
      mockRefreshTokenFindUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'valid-refresh-token',
        userId: testUser.id,
        user: testUser,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      mockRefreshTokenDelete.mockResolvedValue({});

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/refresh')
          .set('Origin', 'http://localhost:5173')
          .send({ refreshToken: 'valid-refresh-token' }),
      );

      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; data: { accessToken: string; refreshToken: string } };
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
    });

    it('returns 401 for expired refresh token', async () => {
      mockRefreshTokenFindUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'expired-token',
        userId: testUser.id,
        user: testUser,
        expiresAt: new Date(Date.now() - 1000), // expired
      });
      mockRefreshTokenDelete.mockResolvedValue({});

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/refresh')
          .set('Origin', 'http://localhost:5173')
          .send({ refreshToken: 'expired-token' }),
      );

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('returns 401 without auth token', async () => {
      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/logout')
          .set('Origin', 'http://localhost:5173')
          .send({}),
      );

      expect(res.status).toBe(401);
    });

    it('returns 200 for valid logout', async () => {
      const token = jwt.sign(
        { sub: testUser.id, email: testUser.email, systemRole: testUser.systemRole, jti: 'test-jti' },
        'test-secret-key-for-integration-tests',
        { expiresIn: '15m' },
      );
      mockRefreshTokenDeleteMany.mockResolvedValue({ count: 1 });

      const app = createApp();
      const res = await request(app).then((r) =>
        r.post('/api/v1/auth/logout')
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${token}`)
          .send({}),
      );

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 without auth token', async () => {
      const app = createApp();
      const res = await request(app).then((r) =>
        r.get('/api/v1/auth/me')
          .set('Origin', 'http://localhost:5173'),
      );

      expect(res.status).toBe(401);
    });

    it('returns user for valid token', async () => {
      const token = jwt.sign(
        { sub: testUser.id, email: testUser.email, systemRole: testUser.systemRole, jti: 'test-jti' },
        'test-secret-key-for-integration-tests',
        { expiresIn: '15m' },
      );
      mockUserFindUnique.mockResolvedValue(testUser);

      const app = createApp();
      const res = await request(app).then((r) =>
        r.get('/api/v1/auth/me')
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${token}`),
      );

      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; data: { email: string } };
      expect(body.data.email).toBe(testUser.email);
    });

    it('returns 401 for expired token', async () => {
      const token = jwt.sign(
        { sub: testUser.id, email: testUser.email, systemRole: testUser.systemRole },
        'test-secret-key-for-integration-tests',
        { expiresIn: '-1s' },
      );

      const app = createApp();
      const res = await request(app).then((r) =>
        r.get('/api/v1/auth/me')
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${token}`),
      );

      expect(res.status).toBe(401);
    });
  });
});

describe('Error Handling Integration', () => {
  it('returns 404 for unknown routes', async () => {
    const app = createApp();
    const res = await request(app).then((r) =>
      r.get('/api/v1/nonexistent')
        .set('Origin', 'http://localhost:5173'),
    );

    // Express returns 404 implicitly for unmatched routes
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('health check returns 200', async () => {
    const app = createApp();
    const res = await request(app).then((r) =>
      r.get('/api/health'),
    );

    expect(res.status).toBe(200);
    const body = res.body as { status: string };
    expect(body.status).toBe('ok');
  });
});
