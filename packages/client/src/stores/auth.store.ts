import { create } from 'zustand';
import type { UserDTO } from '@pm/shared';

interface AuthState {
  user: UserDTO | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  setUser: (user: UserDTO | null) => void;
  setLoading: (loading: boolean) => void;
  login: (user: UserDTO, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: !!localStorage.getItem('accessToken'), // Only loading if we need to verify a token
  hasHydrated: false,

  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false, hasHydrated: true }),

  setLoading: (isLoading) => set({ isLoading }),

  login: (user, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, isAuthenticated: true, isLoading: false, hasHydrated: true });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false, isLoading: false, hasHydrated: true });
  },

  setHydrated: () => set({ hasHydrated: true }),
}));
