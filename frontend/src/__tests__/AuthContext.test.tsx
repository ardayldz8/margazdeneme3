import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function TestComponent() {
  const { user, isAuthenticated, login, register, logout } = useAuth();

  return (
    <div>
      <div data-testid="auth-state">{isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="user-email">{user?.email || 'none'}</div>
      <button onClick={() => login('user@test.com', 'pass')}>login</button>
      <button onClick={() => register('new@test.com', 'pass', 'New User')}>register</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('logs in and stores token/user', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: 'token123',
        user: { id: 'u1', email: 'user@test.com', role: 'VIEWER', name: null }
      })
    }));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    screen.getByText('login').click();

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('yes');
      expect(screen.getByTestId('user-email').textContent).toBe('user@test.com');
    });

    expect(localStorage.getItem('margaz_auth_token')).toBe('token123');
  });

  it('registers and stores token/user', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: 'token456',
        user: { id: 'u2', email: 'new@test.com', role: 'ADMIN', name: 'New User' }
      })
    }));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    screen.getByText('register').click();

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('yes');
      expect(screen.getByTestId('user-email').textContent).toBe('new@test.com');
    });
  });

  it('logs out and clears token/user', async () => {
    localStorage.setItem('margaz_auth_token', 'token');
    localStorage.setItem('margaz_auth_user', JSON.stringify({ id: 'u1', email: 'user@test.com', role: 'VIEWER', name: null }));

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 'u1', email: 'user@test.com', role: 'VIEWER', name: null } })
    }));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('yes');
    });

    await act(async () => {
      screen.getByText('logout').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('no');
    });
    expect(localStorage.getItem('margaz_auth_token')).toBeNull();
  });
});
