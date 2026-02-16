import request from 'supertest';
import jwt from 'jsonwebtoken';

const syncMock = jest.fn();

jest.mock('../services/epdk.service', () => ({
  EpdkService: jest.fn().mockImplementation(() => ({
    syncDealers: syncMock
  }))
}));

import app from '../app';

describe('Sync Routes', () => {
  const secret = process.env.JWT_SECRET || 'test-secret';

  beforeEach(() => {
    syncMock.mockReset();
  });

  it('should reject missing token', async () => {
    await request(app)
      .post('/api/sync/epdk')
      .expect(401);
  });

  it('should reject non-admin token', async () => {
    const token = jwt.sign({ id: 'u1', email: 'viewer@test.com', role: 'VIEWER' }, secret);

    await request(app)
      .post('/api/sync/epdk')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('should return result for admin token', async () => {
    const token = jwt.sign({ id: 'u2', email: 'admin@test.com', role: 'ADMIN' }, secret);
    syncMock.mockResolvedValueOnce({ success: true, count: 3 });

    const res = await request(app)
      .post('/api/sync/epdk')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({ success: true, count: 3 });
  });

  it('should return 500 if sync fails', async () => {
    const token = jwt.sign({ id: 'u3', email: 'admin2@test.com', role: 'ADMIN' }, secret);
    syncMock.mockRejectedValueOnce(new Error('EPDK failed'));

    const res = await request(app)
      .post('/api/sync/epdk')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);

    expect(res.body).toHaveProperty('error', 'Sync failed');
  });
});
