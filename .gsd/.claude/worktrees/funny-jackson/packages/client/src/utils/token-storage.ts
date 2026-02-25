// ── Token storage ─────────────────────────────────────────────
// Both access and refresh tokens are stored client-side.
// "Remember me" controls whether they go to localStorage (persistent
// across sessions) or sessionStorage (cleared on tab/window close).
// A flag in localStorage records which storage is active so tokens
// can be found on page reload regardless of which storage was used.

const STORAGE_KEY  = 'tokenStorageType';  // 'local' | 'session'
const ACCESS_KEY   = 'accessToken';
const REFRESH_KEY  = 'refreshToken';

function activeStorage(): Storage {
  return localStorage.getItem(STORAGE_KEY) === 'session'
    ? sessionStorage
    : localStorage;
}

/** Read the current access token. */
export function getAccessToken(): string | null {
  return activeStorage().getItem(ACCESS_KEY);
}

/** Read the current refresh token. */
export function getRefreshToken(): string | null {
  return activeStorage().getItem(REFRESH_KEY);
}

/** Persist both tokens. `remember` controls which storage is used. */
export function setTokens(
  accessToken: string,
  refreshToken: string,
  remember?: boolean,
): void {
  if (remember !== undefined) {
    localStorage.setItem(STORAGE_KEY, remember ? 'local' : 'session');
  }
  const storage = activeStorage();
  storage.setItem(ACCESS_KEY, accessToken);
  storage.setItem(REFRESH_KEY, refreshToken);
}

/** Convenience: update only the access token (e.g. after silent refresh). */
export function setAccessToken(accessToken: string): void {
  activeStorage().setItem(ACCESS_KEY, accessToken);
}

/** Remove both tokens from both storages and clear the flag. */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

/** Returns true if an access token exists in the active storage. */
export function hasToken(): boolean {
  return getAccessToken() !== null;
}
