import request from 'supertest';
import crypto from 'crypto';
import { prisma } from './setup';

function buildSignature(deviceId: string, tankLevel: number, timestamp: string, counter: string, secret: string): string {
    const base = `${deviceId}.${tankLevel}.${timestamp}.${counter}`;
    return crypto.createHmac('sha256', secret).update(base).digest('hex');
}

async function loadAppWithEnv(overrides: Record<string, string>) {
    const snapshot = { ...process.env };
    jest.resetModules();
    process.env = {
        ...snapshot,
        ...overrides
    };

    const mod = await import('../app');
    return { app: mod.default, restore: () => { process.env = snapshot; } };
}

describe('Telemetry Security', () => {
    it('rejects unsigned request for signed device in enforce mode', async () => {
        const deviceId = `signed-device-${Date.now()}`;
        await prisma.device.create({
            data: {
                deviceId,
                name: `Arduino ${deviceId}`,
                status: 'active'
            }
        });
        await prisma.deviceAuth.create({
            data: {
                deviceId,
                authMode: 'signed',
                secret: 'secret-1',
                active: true
            }
        });

        const { app, restore } = await loadAppWithEnv({
            TELEMETRY_SECURITY_MODE: 'enforce',
            TELEMETRY_ALLOW_UNKNOWN_AUTOREGISTER: 'true'
        });

        const response = await request(app)
            .post('/api/telemetry')
            .send({
                device_id: deviceId,
                tank_level: 55
            })
            .expect(401);

        expect(response.body).toHaveProperty('error', 'invalid telemetry signature');
        restore();
    });

    it('allows unsigned request for legacy device in enforce mode', async () => {
        const deviceId = `legacy-device-${Date.now()}`;
        await prisma.device.create({
            data: {
                deviceId,
                name: `Arduino ${deviceId}`,
                status: 'active'
            }
        });
        await prisma.deviceAuth.create({
            data: {
                deviceId,
                authMode: 'legacy',
                active: true
            }
        });

        const { app, restore } = await loadAppWithEnv({
            TELEMETRY_SECURITY_MODE: 'enforce',
            TELEMETRY_ALLOW_UNKNOWN_AUTOREGISTER: 'true'
        });

        const response = await request(app)
            .post('/api/telemetry')
            .send({
                device_id: deviceId,
                tank_level: 55
            })
            .expect(200);

        expect(response.body).toHaveProperty('device', deviceId);
        restore();
    });

    it('accepts signed payload and rejects replay in enforce mode', async () => {
        const deviceId = `signed-device-replay-${Date.now()}`;
        const tankLevel = 42;
        const timestamp = String(Date.now());
        const counter = '1001';
        const secret = 'secret-xyz';
        const signature = buildSignature(deviceId, tankLevel, timestamp, counter, secret);

        await prisma.device.create({
            data: {
                deviceId,
                name: `Arduino ${deviceId}`,
                status: 'active'
            }
        });
        await prisma.deviceAuth.create({
            data: {
                deviceId,
                authMode: 'signed',
                secret,
                active: true
            }
        });

        const { app, restore } = await loadAppWithEnv({
            TELEMETRY_SECURITY_MODE: 'enforce',
            TELEMETRY_ALLOW_UNKNOWN_AUTOREGISTER: 'true'
        });

        const first = await request(app)
            .post('/api/telemetry')
            .send({
                device_id: deviceId,
                tank_level: tankLevel,
                timestamp,
                counter,
                signature
            })
            .expect(200);

        expect(first.body).toHaveProperty('device', deviceId);

        const second = await request(app)
            .post('/api/telemetry')
            .send({
                device_id: deviceId,
                tank_level: tankLevel,
                timestamp,
                counter,
                signature
            })
            .expect(401);

        expect(second.body).toHaveProperty('error', 'invalid telemetry signature');
        restore();
    });
});
