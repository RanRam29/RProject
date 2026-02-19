import { useEffect } from 'react';
import { AppRouter } from './router';
import { ToastContainer } from './components/ui/Toast';
import { useUIStore } from './stores/ui.store';
import { useAuthStore } from './stores/auth.store';
import { authApi } from './api/auth.api';
import { hasToken, setAccessToken } from './utils/token-storage';

// ── Auth hydration singleton ─────────────────────────────────────────────────
// Called exactly once at app startup.
//
// Strategy:
//  1. If an access token exists in storage → call /auth/me directly.
//     The axios interceptor will transparently refresh it via the httpOnly
//     cookie if the token has expired.
//  2. If no access token exists (e.g. "Remember me" off + tab was closed, or
//     the token was cleared) → attempt a silent refresh via the cookie before
//     redirecting to login.
//
// A module-level flag ensures this runs exactly once even in React StrictMode.
let _hydrationStarted = false;

function useAppHydration() {
  useEffect(() => {
    if (_hydrationStarted) return;
    _hydrationStarted = true;

    const { setUser, logout, setHydrated, setLoading } = useAuthStore.getState();

    if (hasToken()) {
      // Access token present — /auth/me will auto-refresh via interceptor if expired
      authApi
        .me()
        .then((user) => setUser(user))
        .catch(() => logout());
    } else {
      // No access token — attempt a silent refresh using the httpOnly cookie.
      // If the cookie is present and valid the server returns a new access token.
      authApi
        .refresh()
        .then((tokens) => {
          setAccessToken(tokens.accessToken);
          return authApi.me();
        })
        .then((user) => setUser(user))
        .catch(() => {
          // No valid cookie — go to login
          setLoading(false);
          setHydrated();
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function App() {
  const theme = useUIStore((s) => s.theme);

  // Hydrate auth state once on mount
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
