import { Router } from 'express';
import prisma from '../lib/prisma';
import axios from 'axios';
import logger from '../utils/logger';
import crypto from 'crypto';

const router = Router();

type SecurityMode = 'off' | 'monitor' | 'enforce';
type AuthMode = 'legacy' | 'signed';

const securityMode = getSecurityMode();
const maxSkewSeconds = Number(process.env.TELEMETRY_MAX_SKEW_SECONDS || '900');
const allowUnknownAutoRegister = process.env.TELEMETRY_ALLOW_UNKNOWN_AUTOREGISTER !== 'false';
const defaultAuthMode = getDefaultAuthMode();

const replayWindowMs = maxSkewSeconds * 1000;
const seenRequestKeys = new Map<string, number>();

function getSecurityMode(): SecurityMode {
    const value = (process.env.TELEMETRY_SECURITY_MODE || 'off').toLowerCase();
    if (value === 'monitor' || value === 'enforce') return value;
    return 'off';
}

function getDefaultAuthMode(): AuthMode {
    const value = (process.env.TELEMETRY_DEFAULT_AUTH_MODE || 'signed').toLowerCase();
    if (value === 'legacy') return 'legacy';
    return 'signed';
}

function safeEquals(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
}

function cleanupReplayMap(now: number): void {
    for (const [key, expiresAt] of seenRequestKeys.entries()) {
        if (expiresAt <= now) {
            seenRequestKeys.delete(key);
        }
    }
}

function buildSignature(deviceId: string, tankLevel: number, timestamp: string, counter: string, secret: string): string {
    const base = `${deviceId}.${tankLevel}.${timestamp}.${counter}`;
    return crypto.createHmac('sha256', secret).update(base).digest('hex');
}

function verifySignedTelemetry(reqBody: any, deviceId: string, level: number, secret: string): { ok: boolean; reason?: string } {
    const timestamp = String(reqBody.timestamp || '').trim();
    const counter = String(reqBody.counter || '').trim();
    const signature = String(reqBody.signature || '').trim();

    if (!timestamp) return { ok: false, reason: 'missing_timestamp' };
    if (!counter) return { ok: false, reason: 'missing_counter' };
    if (!signature) return { ok: false, reason: 'missing_signature' };

    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) return { ok: false, reason: 'invalid_timestamp' };

    const now = Date.now();
    const diff = Math.abs(now - ts);
    if (diff > replayWindowMs) {
        return { ok: false, reason: 'timestamp_out_of_window' };
    }

    const expected = buildSignature(deviceId, level, timestamp, counter, secret);
    if (!safeEquals(signature, expected)) {
        return { ok: false, reason: 'signature_mismatch' };
    }

    cleanupReplayMap(now);
    const requestKey = `${deviceId}:${timestamp}:${counter}`;
    if (seenRequestKeys.has(requestKey)) {
        return { ok: false, reason: 'replay_detected' };
    }

    seenRequestKeys.set(requestKey, now + replayWindowMs);
    return { ok: true };
}

// POST /api/telemetry
// Receives: { "tank_level": 55, "voltage": 12.5, "device_id": "demo_unit" }
router.get('/time', (_req, res) => {
    res.json({ epoch_ms: Date.now() });
});

router.post('/', async (req, res) => {
    try {
        const { tank_level, device_id } = req.body;

        // Validate required fields
        if (tank_level === undefined || tank_level === null) {
            logger.warn('Missing tank_level in telemetry request', { device_id, body: req.body });
            res.status(400).json({ error: 'tank_level is required' });
            return;
        }

        if (device_id === undefined || device_id === null) {
            logger.warn('Missing device_id in telemetry request', { body: req.body });
            res.status(400).json({ error: 'device_id is required' });
            return;
        }

        const normalizedDeviceId = String(device_id).trim();
        if (!normalizedDeviceId) {
            logger.warn('Invalid device_id in telemetry request', { body: req.body });
            res.status(400).json({ error: 'device_id is required' });
            return;
        }

        const level = Number(tank_level);
        if (isNaN(level) || level < 0 || level > 100) {
            logger.warn('Invalid tank_level in telemetry request', {
                device_id: normalizedDeviceId,
                tank_level,
                body: req.body
            });
            res.status(400).json({ error: 'tank_level must be a number between 0-100' });
            return;
        }

        // === AUTO-REGISTER DEVICE ===
        // Cihaz tablosunda var mı kontrol et, yoksa otomatik ekle
        let device = await prisma.device.findUnique({
            where: { deviceId: normalizedDeviceId }
        });

        if (!device) {
            if (!allowUnknownAutoRegister) {
                logger.warn('Unknown device rejected by policy', {
                    device_id: normalizedDeviceId,
                    reject_reason: 'unknown_device_autoregister_disabled',
                    ip: req.ip
                });
                res.status(403).json({ error: 'unknown device is not allowed' });
                return;
            }

            // Yeni cihaz - otomatik kaydet
            device = await prisma.device.create({
                data: {
                    deviceId: normalizedDeviceId,
                    name: `Arduino ${normalizedDeviceId}`,
                    description: 'Otomatik kaydedildi',
                    status: 'active'
                }
            });
            logger.info('New device auto-registered', { device_id: normalizedDeviceId });
        }

        let deviceAuth = await prisma.deviceAuth.findUnique({
            where: { deviceId: normalizedDeviceId }
        });

        if (!deviceAuth && allowUnknownAutoRegister) {
            deviceAuth = await prisma.deviceAuth.create({
                data: {
                    deviceId: normalizedDeviceId,
                    authMode: defaultAuthMode,
                    active: true
                }
            });
            logger.info('Device auth profile auto-created', {
                device_id: normalizedDeviceId,
                auth_mode: deviceAuth.authMode
            });
        }

        if (!deviceAuth) {
            logger.warn('Missing device auth profile', {
                device_id: normalizedDeviceId,
                reject_reason: 'missing_device_auth_profile',
                ip: req.ip
            });
            res.status(403).json({ error: 'device auth profile missing' });
            return;
        }

        if (!deviceAuth.active) {
            logger.warn('Inactive device auth profile', {
                device_id: normalizedDeviceId,
                auth_mode: deviceAuth.authMode,
                reject_reason: 'device_auth_inactive',
                ip: req.ip
            });
            res.status(403).json({ error: 'device auth is inactive' });
            return;
        }

        const authMode = (deviceAuth.authMode === 'legacy' ? 'legacy' : 'signed') as AuthMode;
        let verifyResult = 'security_off';
        let rejectReason: string | undefined;

        if (securityMode !== 'off') {
            if (authMode === 'signed') {
                if (!deviceAuth.secret) {
                    verifyResult = securityMode === 'monitor' ? 'monitor_fail' : 'enforce_fail';
                    rejectReason = 'missing_device_secret';
                    logger.warn('Telemetry auth failed', {
                        device_id: normalizedDeviceId,
                        auth_mode: authMode,
                        verify_result: verifyResult,
                        reject_reason: rejectReason,
                        ip: req.ip
                    });
                    if (securityMode === 'enforce') {
                        res.status(401).json({ error: 'invalid telemetry signature' });
                        return;
                    }
                } else {
                    const verification = verifySignedTelemetry(req.body, normalizedDeviceId, level, deviceAuth.secret);
                    if (!verification.ok) {
                        verifyResult = securityMode === 'monitor' ? 'monitor_fail' : 'enforce_fail';
                        rejectReason = verification.reason;
                        logger.warn('Telemetry auth failed', {
                            device_id: normalizedDeviceId,
                            auth_mode: authMode,
                            verify_result: verifyResult,
                            reject_reason: rejectReason,
                            ip: req.ip
                        });

                        if (securityMode === 'enforce') {
                            res.status(401).json({ error: 'invalid telemetry signature' });
                            return;
                        }
                    } else {
                        verifyResult = 'signed_ok';
                    }
                }
            } else {
                verifyResult = 'legacy_allowed';
            }
        }

        logger.info('Telemetry received', {
            device_id: normalizedDeviceId,
            level,
            auth_mode: authMode,
            verify_result: verifyResult,
            reject_reason: rejectReason,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        // Cihazın lastSeen'ini güncelle
        await prisma.device.update({
            where: { id: device.id },
            data: { lastSeen: new Date() }
        });

        // Device ID'ye göre bayi bul
        let dealer = await prisma.dealer.findUnique({
            where: { deviceId: normalizedDeviceId }
        });

        // Bulunamazsa uyarı ver ama başarılı dön (cihaz kaydedildi)
        if (!dealer) {
            logger.warn('Device not assigned to dealer', {
                device_id: normalizedDeviceId,
                auth_mode: authMode,
                verify_result: verifyResult
            });
            res.json({
                message: 'Device registered but not assigned to a dealer',
                device: normalizedDeviceId,
                needsAssignment: true
            });
            return;
        }

        // Update the dealer (Local/SQLite)
        const updatedDealer = await prisma.dealer.update({
            where: { id: dealer.id },
            data: {
                tankLevel: level,
                lastData: new Date()
            }
        });

        // === SAVE TO HISTORY ===
        // Gerçek zaman serisi verisi olarak kaydet
        await prisma.telemetryHistory.create({
            data: {
                deviceId: normalizedDeviceId,
                dealerId: dealer.id,
                tankLevel: level
            }
        });

        logger.info('Dealer updated with telemetry', {
            dealer_id: updatedDealer.id,
            dealer_title: updatedDealer.title,
            tank_level: updatedDealer.tankLevel,
            device_id: normalizedDeviceId,
            auth_mode: authMode,
            verify_result: verifyResult
        });

        // --- FORWARD TO AWS (Cloud Bridge) ---
        const AWS_URL = process.env.AWS_TELEMETRY_URL;
        if (AWS_URL) {
            try {
                logger.info('Forwarding telemetry to AWS', {
                    aws_url: AWS_URL,
                    device_id: normalizedDeviceId
                });
                await axios.post(AWS_URL, req.body);
                logger.info('AWS forward successful', { device_id: normalizedDeviceId });
            } catch (awsError: any) {
                logger.error('AWS forward failed', {
                    device_id: normalizedDeviceId,
                    error: awsError.message,
                    stack: awsError.stack
                });
                // Don't fail the request if AWS fails, just log it
            }
        }

        res.json({ message: 'Data received & forwarded', dealer: updatedDealer.title });
    } catch (error) {
        logger.error('Telemetry processing error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            body: req.body
        });
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
