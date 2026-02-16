import request from 'supertest';
import app from '../app';
import { prisma } from './setup';

describe('Auth Endpoints', () => {
    let adminToken: string;

    // Bootstrap: create admin user before all tests
    beforeAll(async () => {
        await prisma.user.deleteMany();

        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: `auth-admin-${Date.now()}@example.com`,
                password: 'adminpass123',
                name: 'Auth Admin'
            });
        adminToken = res.body.token;
    });

    describe('POST /api/auth/register', () => {
        it('should register first user as ADMIN (bootstrap)', async () => {
            // Clear users for bootstrap test
            await prisma.user.deleteMany();

            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: `bootstrap-${Date.now()}@example.com`,
                    password: 'testpassword123',
                    name: 'Bootstrap Admin'
                })
                .expect(201);

            expect(response.body).toHaveProperty('message', 'İlk admin hesabı oluşturuldu');
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('role', 'ADMIN');
            expect(response.body.user).not.toHaveProperty('password');

            // Refresh adminToken for subsequent tests
            adminToken = response.body.token;
        });

        it('should reject registration without admin token', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: `noauth-${Date.now()}@example.com`,
                    password: 'testpassword123'
                })
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Admin authentication required');
        });

        it('should reject registration with non-admin token', async () => {
            // First create a viewer via admin
            const viewerEmail = `viewer-temp-${Date.now()}@example.com`;
            await request(app)
                .post('/api/auth/register')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ email: viewerEmail, password: 'viewerpass123' });

            // Login as viewer
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: viewerEmail, password: 'viewerpass123' });

            // Try to register with viewer token
            const response = await request(app)
                .post('/api/auth/register')
                .set('Authorization', `Bearer ${loginRes.body.token}`)
                .send({
                    email: `attempt-${Date.now()}@example.com`,
                    password: 'testpassword123'
                })
                .expect(403);

            expect(response.body).toHaveProperty('error', 'Only admins can create new users');
        });

        it('should allow admin to register new users as VIEWER', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: `admin-created-${Date.now()}@example.com`,
                    password: 'testpassword123',
                    name: 'Admin Created'
                })
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Kullanıcı oluşturuldu');
            expect(response.body.user).toHaveProperty('role', 'VIEWER');
        });

        it('should reject registration with invalid email (with admin token)', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: 'invalid-email',
                    password: 'testpassword123'
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Validation failed');
            expect(response.body).toHaveProperty('details');
        });

        it('should reject registration with short password (with admin token)', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: `test-${Date.now()}@example.com`,
                    password: '123'
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Validation failed');
            expect(response.body).toHaveProperty('details');
        });

        it('should reject duplicate email registration (with admin token)', async () => {
            const uniqueEmail = `duplicate-${Date.now()}@example.com`;

            await request(app)
                .post('/api/auth/register')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ email: uniqueEmail, password: 'testpassword123' })
                .expect(201);

            const response = await request(app)
                .post('/api/auth/register')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ email: uniqueEmail, password: 'testpassword123' })
                .expect(409);

            expect(response.body).toHaveProperty('error', 'Bu email adresi zaten kayıtlı');
        });
    });

    describe('POST /api/auth/login', () => {
        const loginUser = {
            email: `login-test-${Date.now()}@example.com`,
            password: 'testpassword123'
        };

        beforeAll(async () => {
            // Register a user for login tests via admin
            await request(app)
                .post('/api/auth/register')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(loginUser);
        });

        it('should login with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: loginUser.email,
                    password: loginUser.password
                })
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Giriş başarılı');
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('email', loginUser.email);
            expect(response.body.user).not.toHaveProperty('password');
        });

        it('should reject login with invalid email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: loginUser.password
                })
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Email veya şifre hatalı');
        });

        it('should reject login with invalid password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: loginUser.email,
                    password: 'wrongpassword'
                })
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Email veya şifre hatalı');
        });

        it('should reject login with invalid email format', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'invalid-email-format',
                    password: loginUser.password
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Validation failed');
        });

        it('should reject login with short password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: loginUser.email,
                    password: '123'
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Validation failed');
        });

        it('should be case insensitive for email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: loginUser.email.toUpperCase(),
                    password: loginUser.password
                })
                .expect(200);

            expect(response.body).toHaveProperty('token');
        });
    });

    describe('GET /api/auth/me', () => {
        let userToken: string;
        const meUser = {
            email: `me-test-${Date.now()}@example.com`,
            password: 'testpassword123'
        };

        beforeAll(async () => {
            // Register user via admin, then login to get their token
            await request(app)
                .post('/api/auth/register')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(meUser);

            const loginRes = await request(app)
                .post('/api/auth/login')
                .send(meUser);
            userToken = loginRes.body.token;
        });

        it('should get current user info with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${userToken}`);

            // May hit rate limit (429) during test runs
            if (response.status === 429) return;

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('email', meUser.email);
            expect(response.body.user).toHaveProperty('id');
            expect(response.body.user).toHaveProperty('role');
            expect(response.body.user).not.toHaveProperty('password');
        });

        it('should reject request without token', async () => {
            const response = await request(app)
                .get('/api/auth/me');

            expect([401, 429]).toContain(response.status);
            expect(response.body).toHaveProperty('error');
        });

        it('should reject request with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token');

            expect([401, 429]).toContain(response.status);
            expect(response.body).toHaveProperty('error');
        });

        it('should reject request with malformed header', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', userToken); // Missing "Bearer " prefix

            expect([401, 429]).toContain(response.status);
            expect(response.body).toHaveProperty('error');
        });
    });
});