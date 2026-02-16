import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const app = express();

app.get('/protected', authenticate, (req, res) => {
  res.json({ ok: true, user: req.user });
});

app.get('/admin', authenticate, requireAdmin, (req, res) => {
  res.json({ ok: true, user: req.user });
});

describe('Auth Middleware', () => {
  const secret = process.env.JWT_SECRET || 'test-secret';

  it('should reject missing token', async () => {
    const res = await request(app).get('/protected').expect(401);
    expect(res.body).toHaveProperty('error', 'No token provided');
  });

  it('should reject invalid token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
    expect(res.body).toHaveProperty('error', 'Invalid or expired token');
  });

  it('should allow valid token', async () => {
    const token = jwt.sign({ id: 'u1', email: 'a@b.com', role: 'VIEWER' }, secret);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body.user).toHaveProperty('email', 'a@b.com');
  });

  it('should reject non-admin for requireAdmin', async () => {
    const token = jwt.sign({ id: 'u2', email: 'v@b.com', role: 'VIEWER' }, secret);
    const res = await request(app)
      .get('/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    expect(res.body).toHaveProperty('error', 'Admin access required');
  });

  it('should allow admin for requireAdmin', async () => {
    const token = jwt.sign({ id: 'u3', email: 'admin@b.com', role: 'ADMIN' }, secret);
    const res = await request(app)
      .get('/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body.user).toHaveProperty('role', 'ADMIN');
  });
});
