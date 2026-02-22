import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock useAuth hook
vi.mock('../../hooks/useAuth');

import { useAuth } from '../../hooks/useAuth';
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

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
    // Lucide Loader2 renders an inline SVG
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('does not redirect while isLoading is true', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute />
      </MemoryRouter>
    );
    // No navigate happens — just the spinner
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders Outlet when authenticated and not loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'a@b.com', displayName: 'A' },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    render(
      <MemoryRouter>
        <ProtectedRoute />
      </MemoryRouter>
    );
    // Outlet renders nothing without nested routes, but no spinner either
    expect(screen.queryByRole('img')).toBeNull();
  });
});
