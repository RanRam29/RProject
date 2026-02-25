import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./logger.js', () => ({
  default: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { fireAndForget } from './fire-and-forget.js';
import logger from './logger.js';

describe('fireAndForget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not throw when the promise resolves', async () => {
    fireAndForget(Promise.resolve('ok'), 'test.resolve');

    // Allow microtask to flush
    await new Promise((r) => setTimeout(r, 10));

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs a warning when the promise rejects with an Error', async () => {
    fireAndForget(Promise.reject(new Error('boom')), 'activity.log');

    await new Promise((r) => setTimeout(r, 10));

    expect(logger.warn).toHaveBeenCalledWith(
      'fire-and-forget [activity.log]: boom',
    );
  });

  it('logs a warning when the promise rejects with a non-Error value', async () => {
    fireAndForget(Promise.reject('string-error'), 'notification.create');

    await new Promise((r) => setTimeout(r, 10));

    expect(logger.warn).toHaveBeenCalledWith(
      'fire-and-forget [notification.create]: string-error',
    );
  });

  it('returns void (not a promise)', () => {
    const result = fireAndForget(Promise.resolve(), 'test');
    expect(result).toBeUndefined();
  });
});
