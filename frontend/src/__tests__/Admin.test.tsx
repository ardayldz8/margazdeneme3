import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Admin } from '../pages/Admin';

vi.mock('../contexts/AuthContext', () => ({
  useAuthFetch: () => vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
}));

describe('Admin', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders tabs and headings', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => [] }));

    render(<Admin />);

    await waitFor(() => {
      expect(screen.getByText('Bayi Yönetimi')).toBeInTheDocument();
      expect(screen.getByText('Cihazlar')).toBeInTheDocument();
    });
  });
});
