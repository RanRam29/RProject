import { create } from 'zustand';
import type { UserDTO } from '@pm/shared';
import { setAccessToken, clearAccessToken } from '../utils/token-storage';

interface AuthState {
  user: UserDTO | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  setUser: (user: UserDTO | null) => void;
  setLoading: (loading: boolean) => void;
  login: (user: UserDTO, accessToken: string, rememberMe?: boolean) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  // Always start loading — App.tsx hydration verifies the session via
  // the stored access token or the httpOnly refreshToken cookie.
  isLoading: true,
  hasHydrated: false,

  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false, hasHydrated: true }),

  setLoading: (isLoading) => set({ isLoading }),

  login: (user, accessToken, rememberMe) => {
    setAccessToken(accessToken, rememberMe);
    set({ user, isAuthenticated: true, isLoading: false, hasHydrated: true });
  },

  logout: () => {
    clearAccessToken();
    set({ user: null, isAuthenticated: false, isLoading: false, hasHydrated: true });
  },

  setHydrated: () => set({ hasHydrated: true }),
}));
