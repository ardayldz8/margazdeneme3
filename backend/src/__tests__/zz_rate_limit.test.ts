import request from 'supertest';
import app from '../app';

describe('Rate Limiting', () => {
  it('should rate limit telemetry after many requests', async () => {
    const deviceId = `rate-limit-device-${Date.now()}`;
    let hitLimit = false;

    for (let i = 0; i < 65; i++) {
      const res = await request(app)
        .post('/api/telemetry')
        .send({ tank_level: 50, device_id: deviceId })
        .expect((r) => {
          if (r.status === 429) hitLimit = true;
        });

      if (res.status === 429) break;
    }

    expect(hitLimit).toBe(true);
  });
});
