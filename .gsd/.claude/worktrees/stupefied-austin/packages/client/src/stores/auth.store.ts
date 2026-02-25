import { create } from 'zustand';
import type { UserDTO } from '@pm/shared';
import { setTokens, clearTokens } from '../utils/token-storage';

interface AuthState {
  user: UserDTO | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  setUser: (user: UserDTO | null) => void;
  setLoading: (loading: boolean) => void;
  login: (user: UserDTO, accessToken: string, refreshToken: string, rememberMe?: boolean) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  // Always start loading — App.tsx hydration will verify the stored tokens
  // (or redirect to login if none exist) before rendering protected routes.
  isLoading: true,
  hasHydrated: false,

  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false, hasHydrated: true }),

  setLoading: (isLoading) => set({ isLoading }),

  login: (user, accessToken, refreshToken, rememberMe) => {
    setTokens(accessToken, refreshToken, rememberMe);
    set({ user, isAuthenticated: true, isLoading: false, hasHydrated: true });
  },

  logout: () => {
    clearTokens();
    set({ user: null, isAuthenticated: false, isLoading: false, hasHydrated: true });
  },

  setHydrated: () => set({ hasHydrated: true }),
}));
