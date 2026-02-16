import request from 'supertest';
import app from '../app';
import { prisma } from './setup';

jest.setTimeout(20000);

describe('Auth Rate Limit', () => {
  const testEmail = `ratelimit-${Date.now()}@example.com`;

  beforeAll(async () => {
    await prisma.user.deleteMany();
    await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: 'password123'
      })
      .expect(201);
  });

  it('should return 429 after too many login attempts', async () => {
    let hitLimit = false;

    for (let i = 0; i < 25; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'wrong-password'
        })
        .expect((r) => {
          if (r.status === 429) hitLimit = true;
        });

      if (res.status === 429) break;
    }

    expect(hitLimit).toBe(true);
  });
});
