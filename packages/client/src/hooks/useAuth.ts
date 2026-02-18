import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { authApi } from '../api/auth.api';
import type { LoginRequest, RegisterRequest } from '@pm/shared';

export function useAuth() {
  const { user, isAuthenticated, isLoading, hasHydrated, login: storeLogin, logout: storeLogout, setUser, setLoading } = useAuthStore();
  const hydrating = useRef(false);

  useEffect(() => {
    // Only attempt to hydrate once, and only if we have a stored token but no user
    if (isAuthenticated && !user && !hasHydrated && !hydrating.current) {
      hydrating.current = true;
      authApi
        .me()
        .then((fetchedUser) => {
          setUser(fetchedUser);
        })
        .catch(() => {
          // Token is truly invalid (refresh also failed) — log out
          storeLogout();
        });
    } else if (!isAuthenticated && !hasHydrated) {
      setLoading(false);
      useAuthStore.getState().setHydrated();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  const login = async (data: LoginRequest, rememberMe = true) => {
    const result = await authApi.login(data);
    storeLogin(result.user, result.tokens.accessToken, result.tokens.refreshToken, rememberMe);
    return result.user;
  };

  const register = async (data: RegisterRequest) => {
    const result = await authApi.register(data);
    storeLogin(result.user, result.tokens.accessToken, result.tokens.refreshToken);
    return result.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      storeLogout();
    }
  };

  return { user, isAuthenticated, isLoading, login, register, logout };
}

export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  return { isAuthenticated, isLoading };
}
