import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

describe('Sidebar', () => {
  it('shows admin items for admin user', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Admin User', email: 'admin@test.com' },
      isAdmin: true,
      logout: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Entegrasyon')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
  });

  it('hides admin items for viewer', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Viewer', email: 'viewer@test.com' },
      isAdmin: false,
      logout: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.queryByText('Entegrasyon')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
  });
});
