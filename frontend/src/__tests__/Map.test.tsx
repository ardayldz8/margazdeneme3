import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Map } from '../pages/Map';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => <div />,
  Marker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('leaflet/dist/images/marker-icon.png', () => ({ default: 'icon' }));
vi.mock('leaflet/dist/images/marker-shadow.png', () => ({ default: 'shadow' }));

const dealers = [
  {
    id: 'd1',
    title: 'Alpha Dealer',
    city: 'Istanbul',
    district: 'Kadikoy',
    latitude: 41.0,
    longitude: 29.0,
    address: 'Adres 1'
  }
];

describe('Map', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders map header and count', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => dealers
    }));

    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Bayi Haritası')).toBeInTheDocument();
      expect(screen.getByText(/Toplam 1 bayiden 1 tanesi haritada gösteriliyor/)).toBeInTheDocument();
    });
  });
});
