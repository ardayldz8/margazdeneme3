import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

describe('App route protection', () => {
  it('redirects non-admin from admin route', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, isLoading: false });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin>
              <div>Admin Area</div>
            </ProtectedRoute>
          } />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});
