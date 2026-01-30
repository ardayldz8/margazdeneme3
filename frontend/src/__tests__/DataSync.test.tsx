import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DataSync } from '../pages/DataSync';

describe('DataSync', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('triggers sync on button click', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
    vi.stubGlobal('alert', vi.fn());

    render(<DataSync />);

    fireEvent.click(screen.getByText('Verileri Şimdi Güncelle'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});
