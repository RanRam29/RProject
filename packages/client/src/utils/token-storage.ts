// ── Token storage ─────────────────────────────────────────────
// Only the access token is stored client-side.
// The refresh token is kept exclusively in the httpOnly cookie set by
// the server (scoped to /api/v1/auth) — it is never written to
// localStorage or sessionStorage so XSS cannot exfiltrate it.
// "Remember me" controls whether the access token goes to localStorage
// (persistent across sessions) or sessionStorage (cleared on tab close).
// A flag in localStorage records which storage is active so the token
// can be found on page reload regardless of which storage was used.

const STORAGE_KEY  = 'tokenStorageType';  // 'local' | 'session'
const ACCESS_KEY   = 'accessToken';

function activeStorage(): Storage {
  return localStorage.getItem(STORAGE_KEY) === 'session'
    ? sessionStorage
    : localStorage;
}

/** Read the current access token. */
export function getAccessToken(): string | null {
  return activeStorage().getItem(ACCESS_KEY);
}

/** Persist the access token. `remember` controls which storage is used. */
export function setTokens(
  accessToken: string,
  remember?: boolean,
): void {
  if (remember !== undefined) {
    localStorage.setItem(STORAGE_KEY, remember ? 'local' : 'session');
  }
  activeStorage().setItem(ACCESS_KEY, accessToken);
}

/** Convenience: update only the access token (e.g. after silent refresh). */
export function setAccessToken(accessToken: string): void {
  activeStorage().setItem(ACCESS_KEY, accessToken);
}

/** Remove the access token from both storages and clear the flag. */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

/** Returns true if an access token exists in the active storage. */
export function hasToken(): boolean {
  return getAccessToken() !== null;
}
