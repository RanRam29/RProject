import { useEffect } from 'react';
import { AppRouter } from './router';
import { ToastContainer } from './components/ui/Toast';
import { useUIStore } from './stores/ui.store';
import { useAuthStore } from './stores/auth.store';
import { authApi } from './api/auth.api';
import { hasToken, getRefreshToken, setTokens } from './utils/token-storage';

// ── Auth hydration singleton ─────────────────────────────────────────────────
// Called exactly once at app startup.
//
// Strategy:
//  1. If an access token exists → call /auth/me. The axios interceptor will
//     silently refresh it (using the stored refresh token) if it has expired.
//  2. If no access token but a refresh token exists → exchange it for new
//     tokens, then call /auth/me. Covers the "Remember me = off" case where
//     the access token was stored in sessionStorage and is gone after a
//     tab close, but the refresh token was in localStorage.
//  3. Neither token → go to login.
//
// A module-level flag ensures this runs exactly once even in React StrictMode.
let _hydrationStarted = false;

function useAppHydration() {
  useEffect(() => {
    if (_hydrationStarted) return;
    _hydrationStarted = true;

    const { setUser, logout, setHydrated, setLoading } = useAuthStore.getState();

    if (hasToken()) {
      // Access token present — /auth/me auto-refreshes via interceptor if expired
      authApi
        .me()
        .then((user) => setUser(user))
        .catch(() => logout());
      return;
    }

    const refreshToken = getRefreshToken();
    if (refreshToken) {
      // No access token but refresh token exists — do a silent refresh first
      authApi
        .refresh(refreshToken)
        .then((tokens) => {
          setTokens(tokens.accessToken, tokens.refreshToken);
          return authApi.me();
        })
        .then((user) => setUser(user))
        .catch(() => logout());
      return;
    }

    // No tokens at all — go straight to login
    setLoading(false);
    setHydrated();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function App() {
  const theme = useUIStore((s) => s.theme);

  useAppHydration();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      <AppRouter />
      <ToastContainer />
    </>
  );
}
