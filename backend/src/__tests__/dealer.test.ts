import request from 'supertest';
import app from '../app';
import { prisma } from './setup';

describe('Dealer Endpoints', () => {
    let adminToken: string;
    let viewerToken: string;
    let testDealer: any;

    // Create test users before all tests
    beforeAll(async () => {
        // Clear existing data
        await prisma.dealer.deleteMany();
        await prisma.user.deleteMany();

        // Register admin user (first user becomes ADMIN - bootstrap)
        const adminResponse = await request(app)
            .post('/api/auth/register')
            .send({
                email: `dealer-admin-${Date.now()}@example.com`,
                password: 'adminpassword123'
            });
        adminToken = adminResponse.body.token;

        // Register viewer user (using admin token)
        const viewerEmail = `dealer-viewer-${Date.now()}@example.com`;
        await request(app)
            .post('/api/auth/register')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                email: viewerEmail,
                password: 'viewerpassword123'
            });
        // Login as viewer to get their JWT
        const viewerLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: viewerEmail,
                password: 'viewerpassword123'
            });
        viewerToken = viewerLogin.body.token;
    });

    describe('GET /api/dealers', () => {
        it('should get all dealers (public)', async () => {
            const response = await request(app)
                .get('/api/dealers')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should return empty array when no dealers exist', async () => {
            await prisma.dealer.deleteMany();

            const response = await request(app)
                .get('/api/dealers')
                .expect(200);

            expect(response.body).toEqual([]);
        });
    });

    describe('POST /api/dealers (Admin only)', () => {
        it('should create a new dealer as admin', async () => {
            const dealerData = {
                title: 'Test Dealer',
                city: 'Istanbul',
                district: 'Kadikoy',
                address: 'Test Address 123',
                status: 'Yürürlükte',
                distributor: 'Test Distributor',
                tankLevel: 50
            };

            const response = await request(app)
                .post('/api/dealers')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(dealerData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('title', dealerData.title);
            expect(response.body).toHaveProperty('city', dealerData.city);
            expect(response.body).toHaveProperty('district', dealerData.district);
            expect(response.body).toHaveProperty('address', dealerData.address);
            expect(response.body).toHaveProperty('status', dealerData.status);
            expect(response.body).toHaveProperty('distributor', dealerData.distributor);
            expect(response.body).toHaveProperty('tankLevel', dealerData.tankLevel);
            expect(response.body).toHaveProperty('licenseNo');
            expect(response.body).toHaveProperty('createdAt');
            expect(response.body).toHaveProperty('updatedAt');

            testDealer = response.body;
        });

        it('should auto-generate licenseNo if not provided', async () => {
            const response = await request(app)
                .post('/api/dealers')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'Dealer Without License',
                    city: 'Ankara'
                })
                .expect(201);

            expect(response.body).toHaveProperty('licenseNo');
            expect(response.body.licenseNo).toMatch(/^NEW-/);
        });

        it('should reject dealer creation as viewer (non-admin)', async () => {
            const response = await request(app)
                .post('/api/dealers')
                .set('Authorization', `Bearer ${viewerToken}`)
                .send({
                    title: 'Unauthorized Dealer',
                    city: 'Istanbul'
                })
                .expect(403);

            expect(response.body).toHaveProperty('error');
        });

        it('should reject dealer creation without authentication', async () => {
            const response = await request(app)
                .post('/api/dealers')
                .send({
                    title: 'No Auth Dealer',
                    city: 'Istanbul'
                })
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/dealers/:id', () => {
        it('should get a specific dealer by ID', async () => {
            const response = await request(app)
                .get(`/api/dealers/${testDealer.id}`)
                .expect(200);

            expect(response.body).toHaveProperty('id', testDealer.id);
            expect(response.body).toHaveProperty('title', testDealer.title);
        });

        it('should return 404 for non-existent dealer', async () => {
            const response = await request(app)
                .get('/api/dealers/non-existent-id')
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Dealer not found');
        });
    });

    describe('PUT /api/dealers/:id (Admin only)', () => {
        it('should update a dealer as admin', async () => {
            const updateData = {
                title: 'Updated Dealer Title',
                tankLevel: 75
            };

            const response = await request(app)
                .put(`/api/dealers/${testDealer.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body).toHaveProperty('id', testDealer.id);
            expect(response.body).toHaveProperty('title', updateData.title);
            expect(response.body).toHaveProperty('tankLevel', updateData.tankLevel);
        });

        it('should assign device to dealer', async () => {
            // First create a device
            const device = await prisma.device.create({
                data: {
                    deviceId: `test-device-${Date.now()}`,
                    name: 'Test Device',
                    status: 'active'
                }
            });

            const response = await request(app)
                .put(`/api/dealers/${testDealer.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    deviceId: device.deviceId
                })
                .expect(200);

            expect(response.body).toHaveProperty('deviceId', device.deviceId);
        });

        it('should reject dealer update as viewer', async () => {
            const response = await request(app)
                .put(`/api/dealers/${testDealer.id}`)
                .set('Authorization', `Bearer ${viewerToken}`)
                .send({
                    title: 'Unauthorized Update'
                })
                .expect(403);

            expect(response.body).toHaveProperty('error');
        });

        it('should return 404 for non-existent dealer update', async () => {
            const response = await request(app)
                .put('/api/dealers/non-existent-id')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'Non Existent'
                })
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Dealer not found');
        });
    });

    describe('DELETE /api/dealers/:id (Admin only)', () => {
        it('should delete a dealer as admin', async () => {
            // Create a dealer to delete
            const createResponse = await request(app)
                .post('/api/dealers')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'Dealer To Delete',
                    city: 'Istanbul'
                });

            const dealerToDelete = createResponse.body;

            const response = await request(app)
                .delete(`/api/dealers/${dealerToDelete.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Dealer deleted successfully');

            // Verify dealer is deleted
            const getResponse = await request(app)
                .get(`/api/dealers/${dealerToDelete.id}`)
                .expect(404);

            expect(getResponse.body).toHaveProperty('error', 'Dealer not found');
        });

        it('should reject dealer deletion as viewer', async () => {
            const response = await request(app)
                .delete(`/api/dealers/${testDealer.id}`)
                .set('Authorization', `Bearer ${viewerToken}`)
                .expect(403);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/dealers/:id/history', () => {
        it('should get dealer telemetry history', async () => {
            const response = await request(app)
                .get(`/api/dealers/${testDealer.id}/history`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should get history for specific hours', async () => {
            const response = await request(app)
                .get(`/api/dealers/${testDealer.id}/history?hours=48`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });
    });
});
