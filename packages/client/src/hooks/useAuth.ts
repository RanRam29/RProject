import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { authApi } from '../api/auth.api';
import type { LoginRequest, RegisterRequest } from '@pm/shared';

export function useAuth() {
  const { user, isAuthenticated, isLoading, login: storeLogin, logout: storeLogout, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !user) {
      authApi
        .me()
        .then(setUser)
        .catch(() => storeLogout());
    } else if (!isAuthenticated) {
      setLoading(false);
    }
  }, [isAuthenticated, user, setUser, storeLogout, setLoading]);

  const login = async (data: LoginRequest) => {
    const result = await authApi.login(data);
    storeLogin(result.user, result.tokens.accessToken, result.tokens.refreshToken);
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
