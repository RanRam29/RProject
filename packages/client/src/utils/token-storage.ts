// ── Access token storage ──────────────────────────────────────
// The refresh token lives exclusively in an httpOnly cookie set by the server,
// so it is never accessible from JavaScript and survives page refreshes
// automatically. Only the short-lived access token is managed here.
//
// "Remember me" controls whether the access token persists across browser
// sessions (localStorage) or clears on tab/window close (sessionStorage).

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
export function setAccessToken(accessToken: string, remember?: boolean): void {
  if (remember !== undefined) {
    localStorage.setItem(STORAGE_KEY, remember ? 'local' : 'session');
  }
  activeStorage().setItem(ACCESS_KEY, accessToken);
}

/** Remove the access token from both storages and clear the flag. */
export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

/** Returns true if an access token exists in the active storage. */
export function hasToken(): boolean {
  return getAccessToken() !== null;
}
