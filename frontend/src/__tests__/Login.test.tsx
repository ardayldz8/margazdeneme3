import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Login } from '../pages/Login';

const mockLogin = vi.fn();
const mockRegister = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    login: mockLogin,
    register: mockRegister
  })
}));

describe('Login page', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockRegister.mockReset();
  });

  it('renders login form by default', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByText('Giriş Yap')).toBeInTheDocument();
    expect(screen.queryByLabelText('İsim')).not.toBeInTheDocument();
  });

  it('switches to register mode and shows name field', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Kayıt Ol'));
    expect(screen.getByPlaceholderText('Adınız Soyadınız')).toBeInTheDocument();
  });

  it('shows error when login fails', async () => {
    mockLogin.mockResolvedValueOnce({ success: false, error: 'Hata' });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('ornek@email.com'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Giriş Yap'));

    await waitFor(() => {
      expect(screen.getByText('Hata')).toBeInTheDocument();
    });
  });
});
