import logger from './logger.js';

/**
 * Execute a promise as a fire-and-forget side effect.
 * Errors are logged at warn level with the given label — never thrown or swallowed.
 *
 * Usage:
 *   fireAndForget(activityService.log(...), 'activity.log');
 *
 * Replaces the `.catch(() => {})` anti-pattern across the codebase.
 */
export function fireAndForget(promise: Promise<unknown>, label: string): void {
  promise.catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`fire-and-forget [${label}]: ${message}`);
  });
}
