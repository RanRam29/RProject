// Hydration of auth state is handled once in App.tsx — this hook is
// intentionally free of side-effects so it can be called from multiple
// components without triggering duplicate /auth/me requests.

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { authApi } from '../api/auth.api';
import type { LoginRequest, RegisterRequest } from '@pm/shared';

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    login: storeLogin,
    logout: storeLogout,
  } = useAuthStore();

  const login = async (data: LoginRequest, rememberMe = true) => {
    const result = await authApi.login(data);
    storeLogin(result.user, result.tokens.accessToken, rememberMe);
    return result.user;
  };

  const register = async (data: RegisterRequest) => {
    const result = await authApi.register(data);
    storeLogin(result.user, result.tokens.accessToken);
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
