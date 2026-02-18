// ── Centralised token storage ────────────────────────────────
// When "Remember me" is checked, tokens go to localStorage (persistent).
// When unchecked, tokens go to sessionStorage (cleared on browser close).
// A flag in localStorage records which storage is active so that the app
// can find tokens on page reload.

const STORAGE_KEY = 'tokenStorageType';   // 'local' | 'session'
const ACCESS_KEY  = 'accessToken';
const REFRESH_KEY = 'refreshToken';

function activeStorage(): Storage {
  return localStorage.getItem(STORAGE_KEY) === 'session'
    ? sessionStorage
    : localStorage;
}

/** Read the current access token (checks the active storage). */
export function getAccessToken(): string | null {
  return activeStorage().getItem(ACCESS_KEY);
}

/** Read the current refresh token (checks the active storage). */
export function getRefreshToken(): string | null {
  return activeStorage().getItem(REFRESH_KEY);
}

/** Persist both tokens.  `remember` controls which storage is used. */
export function setTokens(
  accessToken: string,
  refreshToken: string,
  remember?: boolean,
): void {
  // If `remember` is explicitly provided, update the flag.
  // Otherwise keep whatever was already stored (used during token refresh).
  if (remember !== undefined) {
    localStorage.setItem(STORAGE_KEY, remember ? 'local' : 'session');
  }

  const storage = activeStorage();
  storage.setItem(ACCESS_KEY, accessToken);
  storage.setItem(REFRESH_KEY, refreshToken);
}

/** Remove tokens from BOTH storages and clear the storage-type flag. */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

/** Returns true if any stored access token exists. */
export function hasToken(): boolean {
  return getAccessToken() !== null;
}
