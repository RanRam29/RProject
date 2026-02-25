import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../config/env.js', () => ({
  env: { CLIENT_URL: 'https://app.example.com,https://staging.example.com' },
  default: { CLIENT_URL: 'https://app.example.com,https://staging.example.com' },
}));

import { csrfProtection } from './csrf.middleware.js';

function createMocks(method: string, headers: Record<string, string> = {}) {
  const req = { method, headers } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('csrfProtection middleware', () => {
  it('allows GET requests without origin check', () => {
    const { req, res, next } = createMocks('GET');
    csrfProtection(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows HEAD requests without origin check', () => {
    const { req, res, next } = createMocks('HEAD');
    csrfProtection(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows OPTIONS requests without origin check', () => {
    const { req, res, next } = createMocks('OPTIONS');
    csrfProtection(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows POST with valid origin', () => {
    const { req, res, next } = createMocks('POST', { origin: 'https://app.example.com' });
    csrfProtection(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows POST with secondary allowed origin', () => {
    const { req, res, next } = createMocks('POST', { origin: 'https://staging.example.com' });
    csrfProtection(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks POST with invalid origin', () => {
    const { req, res, next } = createMocks('POST', { origin: 'https://evil.com' });
    csrfProtection(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows POST with valid referer when no origin', () => {
    const { req, res, next } = createMocks('POST', { referer: 'https://app.example.com/some/page' });
    csrfProtection(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks POST with invalid referer when no origin', () => {
    const { req, res, next } = createMocks('POST', { referer: 'https://evil.com/attack' });
    csrfProtection(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows POST with no origin or referer (non-browser client)', () => {
    const { req, res, next } = createMocks('POST');
    csrfProtection(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks DELETE with invalid origin', () => {
    const { req, res, next } = createMocks('DELETE', { origin: 'https://attacker.com' });
    csrfProtection(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('blocks PATCH with invalid origin', () => {
    const { req, res, next } = createMocks('PATCH', { origin: 'https://phishing.com' });
    csrfProtection(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
