import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock env before importing auth middleware
vi.mock('../config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-for-testing',
  },
  default: {
    JWT_SECRET: 'test-secret-key-for-testing',
  },
}));

import { authenticate, requireSystemRole } from './auth.middleware.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-key-for-testing';

function createMocks(authHeader?: string) {
  const req = {
    headers: { authorization: authHeader },
    user: undefined,
  } as unknown as Request;
  const res = {} as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('authenticate middleware', () => {
  it('rejects request with no authorization header', () => {
    const { req, res, next } = createMocks();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: 'No token provided',
      })
    );
  });

  it('rejects request with non-Bearer token', () => {
    const { req, res, next } = createMocks('Basic abc123');

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 })
    );
  });

  it('rejects invalid JWT token', () => {
    const { req, res, next } = createMocks('Bearer invalid.token.here');

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: 'Invalid or expired token',
      })
    );
  });

  it('accepts valid JWT and sets req.user', () => {
    const token = jwt.sign(
      { sub: 'user-id-123', email: 'test@test.com', systemRole: 'SYS_ADMIN' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    const { req, res, next } = createMocks(`Bearer ${token}`);

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeDefined();
    expect(req.user!.id).toBe('user-id-123');
    expect(req.user!.email).toBe('test@test.com');
    expect(req.user!.systemRole).toBe('SYS_ADMIN');
  });

  it('rejects expired JWT', () => {
    const token = jwt.sign(
      { sub: 'user-id-123', email: 'test@test.com', systemRole: 'SYS_ADMIN' },
      JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const { req, res, next } = createMocks(`Bearer ${token}`);

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 })
    );
  });
});

describe('requireSystemRole middleware', () => {
  it('passes when user has required role', () => {
    const req = {
      user: { id: '1', systemRole: 'SYS_ADMIN', email: 'a@b.com' },
    } as unknown as Request;
    const next = vi.fn();

    requireSystemRole('SYS_ADMIN')(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects when user lacks required role', () => {
    const req = {
      user: { id: '1', systemRole: 'VIEWER_ONLY', email: 'a@b.com' },
    } as unknown as Request;
    const next = vi.fn();

    requireSystemRole('SYS_ADMIN')(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'Insufficient system permissions',
      })
    );
  });

  it('rejects when no user is set', () => {
    const req = { user: undefined } as unknown as Request;
    const next = vi.fn();

    requireSystemRole('SYS_ADMIN')(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 })
    );
  });

  it('accepts any of multiple allowed roles', () => {
    const req = {
      user: { id: '1', systemRole: 'PROJECT_CREATOR', email: 'a@b.com' },
    } as unknown as Request;
    const next = vi.fn();

    requireSystemRole('SYS_ADMIN', 'PROJECT_CREATOR')(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });
});
