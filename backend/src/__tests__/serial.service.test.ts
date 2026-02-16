import { SerialService } from '../services/serial.service';
import { SerialPort } from 'serialport';

jest.mock('serialport', () => ({
  SerialPort: {
    list: jest.fn()
  }
}));

describe('SerialService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (SerialPort.list as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should retry when no Arduino ports are found', async () => {
    new SerialService();

    await Promise.resolve();
    expect(SerialPort.list).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    expect(SerialPort.list).toHaveBeenCalledTimes(2);
  });
});
