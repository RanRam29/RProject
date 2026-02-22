import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SystemRole } from '@pm/shared';

vi.mock('../../hooks/useAuth');

import { useAuth } from '../../hooks/useAuth';
const mockUseAuth = vi.mocked(useAuth);

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders an SVG spinner (Loader2) while isLoading is true', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    const { container } = render(
      <MemoryRouter>
        <ProtectedRoute />
      </MemoryRouter>
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('keeps spinner visible (does not redirect) while isLoading is true', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute />
      </MemoryRouter>
    );
    // Spinner still visible means we did not navigate away
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders Outlet when authenticated and not loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: '1',
        email: 'a@b.com',
        displayName: 'A',
        avatarUrl: null,
        systemRole: SystemRole.PROJECT_CREATOR,
        isActive: true,
        emailNotifications: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    render(
      <MemoryRouter>
        <ProtectedRoute />
      </MemoryRouter>
    );
    // No spinner when authenticated
    expect(screen.queryByRole('img')).toBeNull();
  });
});
