import request from 'supertest';
import app from '../app';
import { prisma } from './setup';

describe('Device Endpoints', () => {
    let adminToken: string;
    let viewerToken: string;
    let testDevice: any;

    // Create test users before all tests
    beforeAll(async () => {
        // Clear existing data
        await prisma.device.deleteMany();
        await prisma.user.deleteMany();

        // Register admin user (first user becomes ADMIN - bootstrap)
        const adminResponse = await request(app)
            .post('/api/auth/register')
            .send({
                email: `device-admin-${Date.now()}@example.com`,
                password: 'adminpassword123'
            });
        adminToken = adminResponse.body.token;

        // Register viewer user (using admin token)
        const viewerEmail = `device-viewer-${Date.now()}@example.com`;
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

    describe('GET /api/devices', () => {
        it('should get all devices as authenticated user', async () => {
            const response = await request(app)
                .get('/api/devices')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should reject request without authentication', async () => {
            const response = await request(app)
                .get('/api/devices')
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });

        it('should reject request with invalid token', async () => {
            const response = await request(app)
                .get('/api/devices')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/devices (Admin only)', () => {
        it('should create a new device as admin', async () => {
            const deviceData = {
                deviceId: `test-device-${Date.now()}`,
                name: 'Test Device',
                description: 'Test device description'
            };

            const response = await request(app)
                .post('/api/devices')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(deviceData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('deviceId', deviceData.deviceId);
            expect(response.body).toHaveProperty('name', deviceData.name);
            expect(response.body).toHaveProperty('description', deviceData.description);
            expect(response.body).toHaveProperty('status', 'active');
            expect(response.body).toHaveProperty('createdAt');
            expect(response.body).toHaveProperty('updatedAt');

            testDevice = response.body;
        });

        it('should reject duplicate deviceId', async () => {
            const response = await request(app)
                .post('/api/devices')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    deviceId: testDevice.deviceId,
                    name: 'Duplicate Device'
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Device ID already exists');
        });

        it('should reject device creation as viewer', async () => {
            const response = await request(app)
                .post('/api/devices')
                .set('Authorization', `Bearer ${viewerToken}`)
                .send({
                    deviceId: `unauthorized-${Date.now()}`,
                    name: 'Unauthorized Device'
                })
                .expect(403);

            expect(response.body).toHaveProperty('error');
        });

        it('should reject device creation without authentication', async () => {
            const response = await request(app)
                .post('/api/devices')
                .send({
                    deviceId: `no-auth-${Date.now()}`,
                    name: 'No Auth Device'
                })
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/devices/:id', () => {
        it('should get a specific device by ID', async () => {
            const response = await request(app)
                .get(`/api/devices/${testDevice.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('id', testDevice.id);
            expect(response.body).toHaveProperty('deviceId', testDevice.deviceId);
            expect(response.body).toHaveProperty('name', testDevice.name);
        });

        it('should return 404 for non-existent device', async () => {
            const response = await request(app)
                .get('/api/devices/non-existent-id')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Device not found');
        });

        it('should reject request without authentication', async () => {
            const response = await request(app)
                .get(`/api/devices/${testDevice.id}`)
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('PUT /api/devices/:id (Admin only)', () => {
        it('should update a device as admin', async () => {
            const updateData = {
                name: 'Updated Device Name',
                description: 'Updated description',
                status: 'inactive'
            };

            const response = await request(app)
                .put(`/api/devices/${testDevice.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body).toHaveProperty('id', testDevice.id);
            expect(response.body).toHaveProperty('name', updateData.name);
            expect(response.body).toHaveProperty('description', updateData.description);
            expect(response.body).toHaveProperty('status', updateData.status);
        });

        it('should reject device update as viewer', async () => {
            const response = await request(app)
                .put(`/api/devices/${testDevice.id}`)
                .set('Authorization', `Bearer ${viewerToken}`)
                .send({
                    name: 'Unauthorized Update'
                })
                .expect(403);

            expect(response.body).toHaveProperty('error');
        });

        it('should return 404 for non-existent device update', async () => {
            const response = await request(app)
                .put('/api/devices/non-existent-id')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Non Existent'
                })
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Device not found');
        });
    });

    describe('DELETE /api/devices/:id (Admin only)', () => {
        it('should delete a device as admin', async () => {
            // Create a device to delete
            const createResponse = await request(app)
                .post('/api/devices')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    deviceId: `delete-test-${Date.now()}`,
                    name: 'Device To Delete'
                });

            const deviceToDelete = createResponse.body;

            const response = await request(app)
                .delete(`/api/devices/${deviceToDelete.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Device deleted successfully');

            // Verify device is deleted
            const getResponse = await request(app)
                .get(`/api/devices/${deviceToDelete.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);

            expect(getResponse.body).toHaveProperty('error', 'Device not found');
        });

        it('should reject device deletion as viewer', async () => {
            const response = await request(app)
                .delete(`/api/devices/${testDevice.id}`)
                .set('Authorization', `Bearer ${viewerToken}`)
                .expect(403);

            expect(response.body).toHaveProperty('error');
        });
    });
});
