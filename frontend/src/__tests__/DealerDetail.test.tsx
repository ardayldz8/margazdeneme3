import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DealerDetail } from '../pages/DealerDetail';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => <div />,
  Marker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('leaflet/dist/images/marker-icon.png', () => ({ default: 'icon' }));
vi.mock('leaflet/dist/images/marker-shadow.png', () => ({ default: 'shadow' }));

const dealer = {
  id: 'd1',
  licenseNo: 'LIC-1',
  title: 'Alpha Dealer',
  city: 'Istanbul',
  district: 'Kadikoy',
  address: 'Adres 1',
  status: 'Yürürlükte',
  startDate: null,
  endDate: null,
  distributor: 'Dist',
  taxNo: null,
  decisionNo: null,
  documentNo: null,
  contractStartDate: null,
  contractEndDate: null,
  latitude: null,
  longitude: null,
  tankLevel: 50,
  lastData: new Date().toISOString()
};

const history = [
  { timestamp: new Date().toISOString(), tankLevel: 50 }
];

describe('DealerDetail', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders dealer details', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => dealer })
      .mockResolvedValue({ ok: true, json: async () => history }));

    render(
      <MemoryRouter initialEntries={['/dealers/d1']}>
        <Routes>
          <Route path="/dealers/:id" element={<DealerDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alpha Dealer')).toBeInTheDocument();
      expect(screen.getByText('%50')).toBeInTheDocument();
    });
  });
});
