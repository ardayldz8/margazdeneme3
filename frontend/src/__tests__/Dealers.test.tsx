import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dealers } from '../pages/Dealers';

const dealers = [
  {
    id: 'd1',
    licenseNo: 'LIC-1',
    title: 'Alpha Dealer',
    city: 'Istanbul',
    district: 'Kadikoy',
    address: 'Adres 1',
    status: 'Yürürlükte',
    distributor: 'Dist',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'd2',
    licenseNo: 'LIC-2',
    title: 'Beta Dealer',
    city: 'Ankara',
    district: 'Cankaya',
    address: 'Adres 2',
    status: 'Yürürlükte',
    distributor: 'Dist',
    updatedAt: new Date().toISOString()
  }
];

describe('Dealers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders list of dealers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => dealers
    }));

    render(
      <MemoryRouter>
        <Dealers />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alpha Dealer')).toBeInTheDocument();
      expect(screen.getByText('Beta Dealer')).toBeInTheDocument();
    });
  });

  it('filters by search term', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => dealers
    }));

    render(
      <MemoryRouter>
        <Dealers />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alpha Dealer')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Bayi adı, lisans no veya şehir ara...'), {
      target: { value: 'Beta' }
    });

    expect(screen.queryByText('Alpha Dealer')).toBeNull();
    expect(screen.getByText('Beta Dealer')).toBeInTheDocument();
  });
});
