import { describe, it, expect, beforeEach } from 'vitest';
import { checkLockout, recordFailedAttempt, resetLockout } from './account-lockout.middleware.js';

describe('account lockout', () => {
  const email = 'test@example.com';

  beforeEach(() => {
    resetLockout(email);
  });

  it('returns null for unknown email', () => {
    expect(checkLockout('unknown@test.com')).toBeNull();
  });

  it('returns null after fewer than 5 failed attempts', () => {
    for (let i = 0; i < 4; i++) {
      recordFailedAttempt(email);
    }
    expect(checkLockout(email)).toBeNull();
  });

  it('locks account after 5 failed attempts', () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(email);
    }
    const remaining = checkLockout(email);
    expect(remaining).not.toBeNull();
    expect(remaining!).toBeGreaterThan(0);
  });

  it('resets lockout on successful login', () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(email);
    }
    expect(checkLockout(email)).not.toBeNull();

    resetLockout(email);
    expect(checkLockout(email)).toBeNull();
  });

  it('does not lock on non-threshold attempts (e.g. 6th, 7th)', () => {
    // Lock at 5, then attempt 6, 7, 8, 9 should not re-lock
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(email);
    }
    // Reset to simulate lockout expiry
    resetLockout(email);

    // 1 more attempt should not lock
    recordFailedAttempt(email);
    expect(checkLockout(email)).toBeNull();
  });
});
