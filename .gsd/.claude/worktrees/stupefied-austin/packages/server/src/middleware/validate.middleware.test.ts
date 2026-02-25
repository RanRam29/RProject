import { describe, it, expect, vi } from 'vitest';
import { validate } from './validate.middleware.js';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

describe('validate middleware', () => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  });

  function createMocks(body: unknown) {
    const req = { body } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;
    return { req, res, next };
  }

  it('passes valid data and replaces body with parsed result', () => {
    const { req, res, next } = createMocks({
      name: 'John',
      email: 'john@test.com',
      extraField: 'stripped',
    });

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'John', email: 'john@test.com' });
    expect(req.body.extraField).toBeUndefined();
  });

  it('calls next with ApiError on invalid data', () => {
    const { req, res, next } = createMocks({
      name: '',
      email: 'bad',
    });

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
      })
    );
  });

  it('uses first error message from Zod', () => {
    const { req, res, next } = createMocks({ name: '', email: 'bad' });

    validate(schema)(req, res, next);

    const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(error.message).toBeTruthy();
    expect(error.statusCode).toBe(400);
  });
});
