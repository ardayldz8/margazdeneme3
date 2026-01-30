import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';

const dealers = [
  {
    id: 'd1',
    title: 'Dealer One',
    tankLevel: 55,
    lastData: new Date().toISOString(),
    endDate: null,
    contractEndDate: null,
    deviceId: 'dev-1'
  },
  {
    id: 'd2',
    title: 'Dealer Two',
    tankLevel: 10,
    lastData: new Date().toISOString(),
    endDate: null,
    contractEndDate: null,
    deviceId: 'dev-2'
  }
];

describe('Dashboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders dealers after fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => dealers
    }));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('2 İstasyon')).toBeInTheDocument();
      expect(screen.getByText('Dealer One')).toBeInTheDocument();
      expect(screen.getByText('Dealer Two')).toBeInTheDocument();
    });
  });

  it('skips update on rate limit response and recovers on next poll', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: true, json: async () => dealers })
      .mockResolvedValue({ ok: true, json: async () => dealers });

    vi.stubGlobal('fetch', fetchMock);
    const intervalSpy = vi.spyOn(global, 'setInterval').mockImplementation((fn: TimerHandler) => {
      if (typeof fn === 'function') fn();
      return 0 as any;
    });
    const clearSpy = vi.spyOn(global, 'clearInterval').mockImplementation(() => {});

    const { unmount } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('2 İstasyon')).toBeInTheDocument();
    });

    unmount();
    intervalSpy.mockRestore();
    clearSpy.mockRestore();
  }, 10000);
});
