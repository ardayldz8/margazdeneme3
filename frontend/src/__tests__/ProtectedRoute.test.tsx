import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('shows loading spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isAdmin: false,
      isLoading: true
    });

    const { container } = render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('redirects to /login when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isAdmin: false,
      isLoading: false
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>LOGIN PAGE</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('redirects to / when admin required but user is not admin', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isAdmin: false,
      isLoading: false
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <div>Admin Page</div>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<div>HOME</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('HOME')).toBeInTheDocument();
  });
});
