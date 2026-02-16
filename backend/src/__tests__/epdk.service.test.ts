import puppeteer from 'puppeteer';
import { EpdkService } from '../services/epdk.service';

jest.mock('puppeteer');
const mockedPuppeteer = puppeteer as jest.Mocked<typeof puppeteer>;

describe('EpdkService', () => {
  it('should throw if puppeteer launch fails', async () => {
    mockedPuppeteer.launch.mockRejectedValueOnce(new Error('Launch failed'));

    const service = new EpdkService();
    await expect(service.syncDealers()).rejects.toThrow('Launch failed');
  });
});
