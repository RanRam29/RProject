import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

const mockUseAuth = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/protected" element={<ProtectedRoute />}>
          <Route index element={<div>Protected Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows spinner when loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true });

    const { container } = renderProtectedRoute();

    // The spinner container has a specific style with height 100vh
    const spinnerContainer = container.querySelector('div[style*="height: 100vh"]');
    expect(spinnerContainer).toBeInTheDocument();

    // The inner spinner div has the rotating animation style
    const spinner = container.querySelector('div[style*="border-radius: 50%"]');
    expect(spinner).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });

    renderProtectedRoute();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows Outlet content when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });

    renderProtectedRoute();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('does not show protected content when loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: true });

    const { container } = renderProtectedRoute();

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

    // Should show spinner instead
    const spinnerContainer = container.querySelector('div[style*="height: 100vh"]');
    expect(spinnerContainer).toBeInTheDocument();
  });
});
