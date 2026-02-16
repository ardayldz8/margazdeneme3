import request from 'supertest';
import app from '../app';
import { prisma } from './setup';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Telemetry Endpoint', () => {
    const validDeviceId = 'test-device-' + Date.now();

    describe('POST /api/telemetry', () => {
        it('should accept valid telemetry data', async () => {
            const response = await request(app)
                .post('/api/telemetry')
                .send({
                    tank_level: 75,
                    device_id: validDeviceId
                })
                .expect(200);

            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('device');
            expect(typeof response.body.device).toBe('string');
            expect(response.body.device).toBe(validDeviceId);
        });

        it('should reject missing tank_level', async () => {
            const response = await request(app)
                .post('/api/telemetry')
                .send({
                    device_id: validDeviceId
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'tank_level is required');
        });

        it('should reject missing device_id', async () => {
            const response = await request(app)
                .post('/api/telemetry')
                .send({
                    tank_level: 50
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'device_id is required');
        });

        it('should reject tank_level below 0', async () => {
            const response = await request(app)
                .post('/api/telemetry')
                .send({
                    tank_level: -10,
                    device_id: validDeviceId
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'tank_level must be a number between 0-100');
        });

        it('should reject tank_level above 100', async () => {
            const response = await request(app)
                .post('/api/telemetry')
                .send({
                    tank_level: 150,
                    device_id: validDeviceId
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'tank_level must be a number between 0-100');
        });

        it('should reject non-numeric tank_level', async () => {
            const response = await request(app)
                .post('/api/telemetry')
                .send({
                    tank_level: 'invalid',
                    device_id: validDeviceId
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'tank_level must be a number between 0-100');
        });

        it('should accept tank_level of 0', async () => {
            const response = await request(app)
                .post('/api/telemetry')
                .send({
                    tank_level: 0,
                    device_id: validDeviceId + '-zero'
                })
                .expect(200);

            expect(response.body).toHaveProperty('message');
        });

        it('should accept tank_level of 100', async () => {
            const response = await request(app)
                .post('/api/telemetry')
                .send({
                    tank_level: 100,
                    device_id: validDeviceId + '-full'
                })
                .expect(200);

            expect(response.body).toHaveProperty('message');
        });

        it('should auto-register new device', async () => {
            const newDeviceId = 'auto-register-test-' + Date.now();

            const response = await request(app)
                .post('/api/telemetry')
                .send({
                    tank_level: 50,
                    device_id: newDeviceId
                })
                .expect(200);

            expect(response.body).toHaveProperty('device');
            expect(typeof response.body.device).toBe('string');
            expect(response.body.device).toBe(newDeviceId);
            expect(response.body).toHaveProperty('needsAssignment', true);
        });

        it('should update dealer and create telemetry history when device assigned', async () => {
            const deviceId = `assigned-device-${Date.now()}`;

            // Create dealer assigned to deviceId
            const dealer = await prisma.dealer.create({
                data: {
                    licenseNo: `LIC-${Date.now()}`,
                    title: 'Assigned Dealer',
                    deviceId,
                    tankLevel: 10
                }
            });

            const response = await request(app)
                .post('/api/telemetry')
                .send({
                    tank_level: 42,
                    device_id: deviceId
                })
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Data received & forwarded');
            expect(response.body).toHaveProperty('dealer', dealer.title);

            const updatedDealer = await prisma.dealer.findUnique({
                where: { id: dealer.id }
            });

            expect(updatedDealer).toBeTruthy();
            expect(updatedDealer?.tankLevel).toBe(42);
            expect(updatedDealer?.lastData).toBeTruthy();

            const history = await prisma.telemetryHistory.findMany({
                where: { dealerId: dealer.id, deviceId }
            });

            expect(history.length).toBeGreaterThan(0);
            expect(history[0].tankLevel).toBe(42);
        });

        it('should still return 200 if AWS forward fails', async () => {
            const deviceId = `aws-fail-device-${Date.now()}`;

            await prisma.dealer.create({
                data: {
                    licenseNo: `LIC-${Date.now()}`,
                    title: 'AWS Dealer',
                    deviceId
                }
            });

            process.env.AWS_TELEMETRY_URL = 'https://invalid-aws-url.example';
            mockedAxios.post.mockRejectedValueOnce(new Error('AWS fail'));

            const response = await request(app)
                .post('/api/telemetry')
                .send({
                    tank_level: 55,
                    device_id: deviceId
                })
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Data received & forwarded');
        });
    });
});
