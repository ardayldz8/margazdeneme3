import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Viewer', email: 'viewer@test.com' },
    isAdmin: false,
    logout: vi.fn()
  })
}));

describe('Layout', () => {
  it('renders outlet content', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<div>Outlet Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Outlet Content')).toBeInTheDocument();
  });
});
