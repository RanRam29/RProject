import { useEffect } from 'react';
import { AppRouter } from './router';
import { ToastContainer } from './components/ui/Toast';
import { useUIStore } from './stores/ui.store';
import { useAuthStore } from './stores/auth.store';
import { authApi } from './api/auth.api';
import { hasToken } from './utils/token-storage';

// ── Auth hydration singleton ─────────────────────────────────────────────────
// Called exactly once at app startup. If a token exists in storage, fetch the
// current user profile to rehydrate the auth store without requiring re-login.
// Using a module-level flag ensures this runs only once even in React StrictMode
// (which double-invokes effects in development).
let _hydrationStarted = false;

function useAppHydration() {
  useEffect(() => {
    if (_hydrationStarted) return;
    _hydrationStarted = true;

    const { setUser, logout, setHydrated, setLoading } = useAuthStore.getState();

    if (!hasToken()) {
      // No token at all — mark as hydrated immediately so ProtectedRoute can redirect
      setLoading(false);
      setHydrated();
      return;
    }

    // Token exists — fetch user profile (access token may refresh automatically
    // via the axios interceptor if it has expired)
    authApi
      .me()
      .then((user) => {
        setUser(user);
      })
      .catch(() => {
        // Refresh also failed — clear stale tokens and go to login
        logout();
      });
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
