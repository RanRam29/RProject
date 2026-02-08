import { describe, it, expect } from 'vitest';
import { ApiError } from './api-error.js';

describe('ApiError', () => {
  it('creates error with message and status code', () => {
    const err = new ApiError('test error', 418);
    expect(err.message).toBe('test error');
    expect(err.statusCode).toBe(418);
    expect(err.name).toBe('ApiError');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it('badRequest creates 400 error', () => {
    const err = ApiError.badRequest('bad');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('bad');
  });

  it('badRequest uses default message', () => {
    const err = ApiError.badRequest();
    expect(err.message).toBe('Bad request');
  });

  it('unauthorized creates 401 error', () => {
    const err = ApiError.unauthorized('not auth');
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('not auth');
  });

  it('forbidden creates 403 error', () => {
    const err = ApiError.forbidden();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Forbidden');
  });

  it('notFound creates 404 error', () => {
    const err = ApiError.notFound('missing');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('missing');
  });

  it('conflict creates 409 error', () => {
    const err = ApiError.conflict('duplicate');
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('duplicate');
  });

  it('preserves prototype chain for instanceof checks', () => {
    const err = ApiError.badRequest();
    expect(err instanceof ApiError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });
});
