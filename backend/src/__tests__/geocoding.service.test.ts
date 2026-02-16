import axios from 'axios';
import { GeocodingService } from '../services/geocoding.service';
import { prisma } from './setup';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GeocodingService', () => {
  it('should return coordinates when geocoding succeeds', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [{ lat: '41.0', lon: '29.0' }]
    } as any);

    const service = new GeocodingService();
    const result = await service.geocodeAddress('Test Address', 'Kadikoy', 'Istanbul');

    expect(result).toEqual({ lat: 41, lon: 29 });
  });

  it('should return null when geocoding returns no results', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [] } as any);

    const service = new GeocodingService();
    const result = await service.geocodeAddress('Unknown', 'Nowhere', 'Istanbul');

    expect(result).toBeNull();
  });

  it('should update dealer coordinates', async () => {
    mockedAxios.get.mockResolvedValue({
      data: [{ lat: '40.5', lon: '29.5' }]
    } as any);

    const delaySpy = jest
      .spyOn(GeocodingService as any, 'delay')
      .mockResolvedValue(undefined);

    const dealer = await prisma.dealer.create({
      data: {
        licenseNo: `LIC-${Date.now()}`,
        title: 'Geo Dealer',
        city: 'Istanbul',
        district: 'Kadikoy',
        address: 'Test Address 1'
      }
    });

    const service = new GeocodingService();
    await service.updateAllDealerCoordinates();

    const updated = await prisma.dealer.findUnique({ where: { id: dealer.id } });

    expect(updated?.latitude).toBe(40.5);
    expect(updated?.longitude).toBe(29.5);

    delaySpy.mockRestore();
  });
});
