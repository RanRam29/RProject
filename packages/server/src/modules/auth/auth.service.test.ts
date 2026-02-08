import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock functions ──────────────────────────────────────────────────────────
const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockRefreshTokenFindUnique = vi.fn();
const mockRefreshTokenCreate = vi.fn();
const mockRefreshTokenDelete = vi.fn();
const mockRefreshTokenDeleteMany = vi.fn();

const mockHash = vi.fn();
const mockCompare = vi.fn();
const mockSign = vi.fn();

const mockCheckLockout = vi.fn();
const mockRecordFailedAttempt = vi.fn();
const mockResetLockout = vi.fn();

// ── Mock modules (before any service import) ────────────────────────────────

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
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: (...args: unknown[]) => mockHash(...args),
    compare: (...args: unknown[]) => mockCompare(...args),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: (...args: unknown[]) => mockSign(...args),
  },
}));

vi.mock('../../config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
  },
}));

vi.mock('../../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('crypto', () => ({
  randomUUID: () => 'mock-uuid-refresh-token',
}));

vi.mock('../../middleware/account-lockout.middleware.js', () => ({
  checkLockout: (...args: unknown[]) => mockCheckLockout(...args),
  recordFailedAttempt: (...args: unknown[]) => mockRecordFailedAttempt(...args),
  resetLockout: (...args: unknown[]) => mockResetLockout(...args),
}));

// ── Import the service under test (after mocks) ────────────────────────────
import { authService } from './auth.service.js';

// ── Test data ───────────────────────────────────────────────────────────────
const NOW = new Date('2025-06-01T00:00:00Z');

const mockUser = {
  id: 'user-id-1',
  email: 'test@example.com',
  passwordHash: '$2a$12$hashedpassword',
  displayName: 'Test User',
  avatarUrl: null,
  systemRole: 'PROJECT_CREATOR',
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const mockUserWithoutPassword = {
  id: mockUser.id,
  email: mockUser.email,
  displayName: mockUser.displayName,
  avatarUrl: mockUser.avatarUrl,
  systemRole: mockUser.systemRole,
  isActive: mockUser.isActive,
  createdAt: mockUser.createdAt,
  updatedAt: mockUser.updatedAt,
};

// ── Reset mocks before each test ────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  // Default return for jwt.sign so generateTokens works
  mockSign.mockReturnValue('mock-access-token');
  // Default return for refreshToken.create so generateTokens works
  mockRefreshTokenCreate.mockResolvedValue({ id: 'rt-id-1' });
});

// ─────────────────────────────────────────────────────────────────────────────
// register
// ─────────────────────────────────────────────────────────────────────────────
describe('authService.register', () => {
  it('creates user, hashes password, and returns user with tokens', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue('$2a$12$newhashedpassword');
    mockUserCreate.mockResolvedValue({
      ...mockUser,
      passwordHash: '$2a$12$newhashedpassword',
    });

    const result = await authService.register(
      'test@example.com',
      'P@ssw0rd!',
      'Test User',
    );

    // Verified email uniqueness check
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });

    // Verified password was hashed with salt rounds 12
    expect(mockHash).toHaveBeenCalledWith('P@ssw0rd!', 12);

    // Verified user was created with hashed password
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: {
        email: 'test@example.com',
        passwordHash: '$2a$12$newhashedpassword',
        displayName: 'Test User',
      },
    });

    // Verified JWT was signed with correct payload
    expect(mockSign).toHaveBeenCalledWith(
      {
        sub: mockUser.id,
        email: mockUser.email,
        systemRole: mockUser.systemRole,
      },
      'test-secret',
      { expiresIn: '15m' },
    );

    // Verified refresh token was stored
    expect(mockRefreshTokenCreate).toHaveBeenCalledWith({
      data: {
        token: 'mock-uuid-refresh-token',
        userId: mockUser.id,
        expiresAt: expect.any(Date),
      },
    });

    // Verified return shape: user without passwordHash + tokens
    expect(result.user).toEqual(mockUserWithoutPassword);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.tokens).toEqual({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-uuid-refresh-token',
    });
  });

  it('throws 409 conflict when email already exists', async () => {
    mockUserFindUnique.mockResolvedValue(mockUser);

    await expect(
      authService.register('test@example.com', 'P@ssw0rd!', 'Test User'),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'A user with this email already exists',
    });

    // Should not attempt to create user or hash password
    expect(mockHash).not.toHaveBeenCalled();
    expect(mockUserCreate).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// login
// ─────────────────────────────────────────────────────────────────────────────
describe('authService.login', () => {
  it('returns user and tokens on valid credentials', async () => {
    mockCheckLockout.mockReturnValue(null);
    mockUserFindUnique.mockResolvedValue(mockUser);
    mockCompare.mockResolvedValue(true);

    const result = await authService.login('test@example.com', 'P@ssw0rd!');

    // Verified lockout was checked
    expect(mockCheckLockout).toHaveBeenCalledWith('test@example.com');

    // Verified user lookup
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });

    // Verified password comparison
    expect(mockCompare).toHaveBeenCalledWith('P@ssw0rd!', mockUser.passwordHash);

    // Verified lockout was reset on successful login
    expect(mockResetLockout).toHaveBeenCalledWith('test@example.com');

    // Verified return shape
    expect(result.user).toEqual(mockUserWithoutPassword);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.tokens).toEqual({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-uuid-refresh-token',
    });
  });

  it('throws 401 and records failed attempt when email not found', async () => {
    mockCheckLockout.mockReturnValue(null);
    mockUserFindUnique.mockResolvedValue(null);

    await expect(
      authService.login('nonexistent@example.com', 'P@ssw0rd!'),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password',
    });

    expect(mockRecordFailedAttempt).toHaveBeenCalledWith('nonexistent@example.com');
    expect(mockCompare).not.toHaveBeenCalled();
    expect(mockResetLockout).not.toHaveBeenCalled();
  });

  it('throws 401 and records failed attempt when password is invalid', async () => {
    mockCheckLockout.mockReturnValue(null);
    mockUserFindUnique.mockResolvedValue(mockUser);
    mockCompare.mockResolvedValue(false);

    await expect(
      authService.login('test@example.com', 'WrongPassword!'),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password',
    });

    expect(mockRecordFailedAttempt).toHaveBeenCalledWith('test@example.com');
    expect(mockResetLockout).not.toHaveBeenCalled();
  });

  it('throws 401 when account is deactivated', async () => {
    mockCheckLockout.mockReturnValue(null);
    mockUserFindUnique.mockResolvedValue({ ...mockUser, isActive: false });

    await expect(
      authService.login('test@example.com', 'P@ssw0rd!'),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Account is deactivated',
    });

    // Should not attempt password comparison or lockout recording
    expect(mockCompare).not.toHaveBeenCalled();
    expect(mockRecordFailedAttempt).not.toHaveBeenCalled();
    expect(mockResetLockout).not.toHaveBeenCalled();
  });

  it('throws 429 when account is locked out', async () => {
    // Return remaining seconds (e.g. 600 seconds = 10 minutes)
    mockCheckLockout.mockReturnValue(600);

    await expect(
      authService.login('test@example.com', 'P@ssw0rd!'),
    ).rejects.toMatchObject({
      statusCode: 429,
      message: expect.stringContaining('Account temporarily locked'),
    });

    // Should not query the database or attempt password comparison
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockCompare).not.toHaveBeenCalled();
    expect(mockResetLockout).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refreshToken
// ─────────────────────────────────────────────────────────────────────────────
describe('authService.refreshToken', () => {
  const storedRefreshToken = {
    id: 'rt-id-1',
    token: 'existing-refresh-token',
    userId: mockUser.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    user: mockUser,
  };

  it('rotates token: deletes old, creates new, returns new token pair', async () => {
    mockRefreshTokenFindUnique.mockResolvedValue(storedRefreshToken);
    mockRefreshTokenDelete.mockResolvedValue(storedRefreshToken);

    const result = await authService.refreshToken('existing-refresh-token');

    // Verified token was looked up with user included
    expect(mockRefreshTokenFindUnique).toHaveBeenCalledWith({
      where: { token: 'existing-refresh-token' },
      include: { user: true },
    });

    // Verified old token was deleted (rotation)
    expect(mockRefreshTokenDelete).toHaveBeenCalledWith({
      where: { id: 'rt-id-1' },
    });

    // Verified new JWT was signed
    expect(mockSign).toHaveBeenCalledWith(
      {
        sub: mockUser.id,
        email: mockUser.email,
        systemRole: mockUser.systemRole,
      },
      'test-secret',
      { expiresIn: '15m' },
    );

    // Verified new refresh token was stored
    expect(mockRefreshTokenCreate).toHaveBeenCalledWith({
      data: {
        token: 'mock-uuid-refresh-token',
        userId: mockUser.id,
        expiresAt: expect.any(Date),
      },
    });

    // Verified return shape
    expect(result).toEqual({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-uuid-refresh-token',
    });
  });

  it('throws 401 when token does not exist in database', async () => {
    mockRefreshTokenFindUnique.mockResolvedValue(null);

    await expect(
      authService.refreshToken('invalid-token'),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid refresh token',
    });

    // Should not attempt to delete or generate new tokens
    expect(mockRefreshTokenDelete).not.toHaveBeenCalled();
    expect(mockSign).not.toHaveBeenCalled();
    expect(mockRefreshTokenCreate).not.toHaveBeenCalled();
  });

  it('throws 401 and deletes token when expired', async () => {
    const expiredToken = {
      ...storedRefreshToken,
      expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
    };
    mockRefreshTokenFindUnique.mockResolvedValue(expiredToken);
    mockRefreshTokenDelete.mockResolvedValue(expiredToken);

    await expect(
      authService.refreshToken('existing-refresh-token'),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Refresh token has expired',
    });

    // Verified expired token was deleted
    expect(mockRefreshTokenDelete).toHaveBeenCalledWith({
      where: { id: 'rt-id-1' },
    });

    // Should not generate new tokens
    expect(mockSign).not.toHaveBeenCalled();
    expect(mockRefreshTokenCreate).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// logout
// ─────────────────────────────────────────────────────────────────────────────
describe('authService.logout', () => {
  it('deletes all refresh tokens for the user', async () => {
    mockRefreshTokenDeleteMany.mockResolvedValue({ count: 3 });

    await authService.logout('user-id-1');

    expect(mockRefreshTokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-id-1' },
    });
  });

  it('succeeds even when user has no existing tokens', async () => {
    mockRefreshTokenDeleteMany.mockResolvedValue({ count: 0 });

    await expect(authService.logout('user-id-1')).resolves.toBeUndefined();

    expect(mockRefreshTokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-id-1' },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMe
// ─────────────────────────────────────────────────────────────────────────────
describe('authService.getMe', () => {
  it('returns the user without passwordHash', async () => {
    mockUserFindUnique.mockResolvedValue(mockUser);

    const result = await authService.getMe('user-id-1');

    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-id-1' },
    });

    expect(result).toEqual(mockUserWithoutPassword);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws 404 when user is not found', async () => {
    mockUserFindUnique.mockResolvedValue(null);

    await expect(authService.getMe('nonexistent-id')).rejects.toMatchObject({
      statusCode: 404,
      message: 'User not found',
    });
  });
});
