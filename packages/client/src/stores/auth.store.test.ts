import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth.store';
import type { UserDTO } from '@pm/shared';
import { SystemRole } from '@pm/shared';

const mockUser: UserDTO = {
  id: 'user-1',
  email: 'test@test.com',
  displayName: 'Test User',
  avatarUrl: null,
  systemRole: SystemRole.VIEWER_ONLY,
  isActive: true,
  emailNotifications: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      hasHydrated: false,
    });
  });

  it('starts with isLoading true', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(true);
  });

  it('setUser sets user and marks as authenticated', () => {
    useAuthStore.getState().setUser(mockUser);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('setUser(null) marks as unauthenticated', () => {
    useAuthStore.getState().setUser(mockUser);
    useAuthStore.getState().setUser(null);
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('login stores tokens and sets user', () => {
    useAuthStore.getState().login(mockUser, 'access-token', 'refresh-token');
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(localStorage.getItem('accessToken')).toBe('access-token');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
  });

  it('logout clears tokens and user', () => {
    useAuthStore.getState().login(mockUser, 'access-token', 'refresh-token');
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('login with rememberMe=false stores tokens in sessionStorage', () => {
    useAuthStore.getState().login(mockUser, 'access-token', 'refresh-token', false);
    expect(sessionStorage.getItem('accessToken')).toBe('access-token');
    expect(sessionStorage.getItem('refreshToken')).toBe('refresh-token');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('tokenStorageType')).toBe('session');
  });

  it('login with rememberMe=true stores tokens in localStorage', () => {
    useAuthStore.getState().login(mockUser, 'access-token', 'refresh-token', true);
    expect(localStorage.getItem('accessToken')).toBe('access-token');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('tokenStorageType')).toBe('local');
  });

  it('logout clears tokens from both storages', () => {
    useAuthStore.getState().login(mockUser, 'access-token', 'refresh-token', false);
    useAuthStore.getState().logout();
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('tokenStorageType')).toBeNull();
  });

  it('setLoading updates loading state', () => {
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
  });
});
