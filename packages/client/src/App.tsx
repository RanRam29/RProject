import { useEffect } from 'react';
import { AppRouter } from './router';
import { ToastContainer } from './components/ui/Toast';
import { useTheme } from './hooks/useTheme';
import { useAuthStore } from './stores/auth.store';
import { authApi } from './api/auth.api';
import { hasToken, setAccessToken } from './utils/token-storage';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

// ── Auth hydration singleton ─────────────────────────────────────────────────
// Called exactly once at app startup.
//
// Strategy:
//  1. If an access token exists → call /auth/me. The axios interceptor will
//     silently refresh it (via the httpOnly cookie) if it has expired.
//  2. No access token → attempt a silent refresh using the httpOnly cookie,
//     then call /auth/me. Covers the "Remember me = off" case where the access
//     token was in sessionStorage and is gone after a tab close, but the server
//     still holds a valid refresh-token cookie.
//  3. Refresh fails → go to login.
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
      console.log('[App Hydration] Access token present, fetching user');
      authApi
        .me()
        .then((user) => setUser(user))
        .catch(() => logout());
      return;
    }

    // No access token — attempt a cookie-based silent refresh before giving up
    console.log('[App Hydration] No access token, attempting silent refresh via cookie');
    authApi
      .refresh()
      .then((tokens) => {
        setAccessToken(tokens.accessToken);
        return authApi.me();
      })
      .then((user) => setUser(user))
      .catch(() => {
        console.log('[App Hydration] Silent refresh failed, going to login');
        setLoading(false);
        setHydrated();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function App() {
  const { theme } = useTheme();

  useAppHydration();

  useEffect(() => {
    // Configure StatusBar native plugin based on theme
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({
        style: theme === 'dark' ? Style.Dark : Style.Light,
      }).catch(console.error);

      // Also set the background color to match the theme's background
      StatusBar.setBackgroundColor({
        color: theme === 'dark' ? '#000000' : '#FAFAFA',
      }).catch(console.error);
    }
  }, [theme]);

  // Hide splash screen after successful hydration/initial render
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide().catch(console.error);
    }
  }, []);

  return (
    <>
      <AppRouter />
      <ToastContainer />
    </>
  );
}
