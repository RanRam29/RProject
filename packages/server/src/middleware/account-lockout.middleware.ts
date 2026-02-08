import { logger } from '../utils/logger.js';

interface LockoutEntry {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

const LOCKOUT_THRESHOLDS = [
  { attempts: 5, lockoutMs: 15 * 60 * 1000 },   // 5 fails  → 15 min
  { attempts: 10, lockoutMs: 30 * 60 * 1000 },   // 10 fails → 30 min
  { attempts: 15, lockoutMs: 60 * 60 * 1000 },   // 15 fails → 1 hour
];

const IP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15-minute window for IP-based limiting
const IP_RATE_LIMIT_MAX_ATTEMPTS = 20;           // Max 20 failed attempts per IP in window

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // Clean stale entries every 10 min
const ENTRY_TTL_MS = 2 * 60 * 60 * 1000;    // Remove entries after 2 hours of inactivity

// In-memory stores. For horizontal scaling, replace with Redis.
const lockoutStore = new Map<string, LockoutEntry>();
const ipStore = new Map<string, { attempts: number; windowStart: number }>();

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of lockoutStore) {
    if (now - entry.lastAttempt > ENTRY_TTL_MS) {
      lockoutStore.delete(key);
    }
  }
  for (const [key, entry] of ipStore) {
    if (now - entry.windowStart > IP_RATE_LIMIT_WINDOW_MS) {
      ipStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Check if an IP address is rate-limited due to too many failed login attempts.
 * Returns null if not limited, or the remaining wait time in seconds.
 */
export function checkIpRateLimit(ip: string): number | null {
  const entry = ipStore.get(ip);
  if (!entry) return null;

  const now = Date.now();
  const windowEnd = entry.windowStart + IP_RATE_LIMIT_WINDOW_MS;

  if (now >= windowEnd) {
    ipStore.delete(ip);
    return null;
  }

  if (entry.attempts >= IP_RATE_LIMIT_MAX_ATTEMPTS) {
    return Math.ceil((windowEnd - now) / 1000);
  }

  return null;
}

/**
 * Record a failed login attempt from an IP address.
 */
export function recordIpFailedAttempt(ip: string): void {
  const now = Date.now();
  let entry = ipStore.get(ip);

  if (!entry || now - entry.windowStart > IP_RATE_LIMIT_WINDOW_MS) {
    entry = { attempts: 0, windowStart: now };
    ipStore.set(ip, entry);
  }

  entry.attempts += 1;

  if (entry.attempts >= IP_RATE_LIMIT_MAX_ATTEMPTS) {
    logger.warn(`IP rate limited: ${ip} after ${entry.attempts} failed login attempts in window`);
  }
}

/**
 * Check if an account (by email) is currently locked out.
 * Returns null if not locked, or the remaining lock time in seconds.
 */
export function checkLockout(email: string): number | null {
  const key = email.toLowerCase();
  const entry = lockoutStore.get(key);

  if (!entry || !entry.lockedUntil) {
    return null;
  }

  const now = Date.now();
  if (now >= entry.lockedUntil) {
    // Lockout expired — don't reset attempts (they accumulate for escalation)
    entry.lockedUntil = null;
    return null;
  }

  return Math.ceil((entry.lockedUntil - now) / 1000);
}

/**
 * Record a failed login attempt. Returns lockout duration if account is now locked.
 */
export function recordFailedAttempt(email: string): number | null {
  const key = email.toLowerCase();
  const now = Date.now();

  let entry = lockoutStore.get(key);
  if (!entry) {
    entry = { failedAttempts: 0, lockedUntil: null, lastAttempt: now };
    lockoutStore.set(key, entry);
  }

  entry.failedAttempts += 1;
  entry.lastAttempt = now;

  // Determine lockout duration based on cumulative failures
  let lockoutMs: number | null = null;
  for (const threshold of LOCKOUT_THRESHOLDS) {
    if (entry.failedAttempts >= threshold.attempts) {
      lockoutMs = threshold.lockoutMs;
    }
  }

  if (lockoutMs && entry.failedAttempts % 5 === 0) {
    entry.lockedUntil = now + lockoutMs;
    const lockoutSec = Math.ceil(lockoutMs / 1000);
    logger.warn(`Account locked: ${email} after ${entry.failedAttempts} failed attempts (${lockoutSec}s)`);
    return lockoutSec;
  }

  return null;
}

/**
 * Reset failed attempts on successful login.
 */
export function resetLockout(email: string): void {
  lockoutStore.delete(email.toLowerCase());
}
