import { describe, it, expect, vi } from 'vitest';
import { ZodError } from 'zod';
import { errorHandler } from './error-handler.middleware.js';
import { ApiError } from '../utils/api-error.js';
import type { Request, Response, NextFunction } from 'express';

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

const mockReq = {} as Request;
const mockNext = vi.fn() as NextFunction;

describe('errorHandler middleware', () => {
  it('handles ApiError with correct status and message', () => {
    const res = mockRes();
    const err = ApiError.badRequest('Invalid input');

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid input',
    });
  });

  it('handles 409 conflict error', () => {
    const res = mockRes();
    const err = ApiError.conflict('A user with this email already exists');

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'A user with this email already exists',
    });
  });

  it('handles ZodError with validation details', () => {
    const res = mockRes();
    const err = new ZodError([
      { message: 'Invalid email', path: ['email'], code: 'invalid_string' as const, validation: 'email' },
      { message: 'Too short', path: ['password'], code: 'too_small' as const, minimum: 8, type: 'string', inclusive: true, exact: false },
    ]);

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.success).toBe(false);
    expect(jsonCall.error).toContain('Invalid email');
  });

  it('handles unknown errors as 500', () => {
    const res = mockRes();
    const err = new Error('something broke');

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Internal server error',
    });
  });
});
