import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import logger from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// POST /api/telemetry
// Receives: { "tank_level": 55, "voltage": 12.5, "device_id": "demo_unit" }
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

        const level = Number(tank_level);
        if (isNaN(level) || level < 0 || level > 100) {
            logger.warn('Invalid tank_level in telemetry request', {
                device_id,
                tank_level,
                body: req.body
            });
            res.status(400).json({ error: 'tank_level must be a number between 0-100' });
            return;
        }

        logger.info('Telemetry received', {
            device_id,
            level,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        // === AUTO-REGISTER DEVICE ===
        // Cihaz tablosunda var mı kontrol et, yoksa otomatik ekle
        let device = await prisma.device.findUnique({
            where: { deviceId: device_id }
        });

        if (!device) {
            // Yeni cihaz - otomatik kaydet
            device = await prisma.device.create({
                data: {
                    deviceId: device_id,
                    name: `Arduino ${device_id}`,
                    description: 'Otomatik kaydedildi',
                    status: 'active'
                }
            });
            logger.info('New device auto-registered', { device_id });
        }

        // Cihazın lastSeen'ini güncelle
        await prisma.device.update({
            where: { id: device.id },
            data: { lastSeen: new Date() }
        });

        // Device ID'ye göre bayi bul
        let dealer = await prisma.dealer.findUnique({
            where: { deviceId: device_id }
        });

        // Bulunamazsa uyarı ver ama başarılı dön (cihaz kaydedildi)
        if (!dealer) {
            logger.warn('Device not assigned to dealer', { device_id });
            res.json({
                message: 'Device registered but not assigned to a dealer',
                device: device_id,
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
                deviceId: device_id,
                dealerId: dealer.id,
                tankLevel: level
            }
        });

        logger.info('Dealer updated with telemetry', {
            dealer_id: updatedDealer.id,
            dealer_title: updatedDealer.title,
            tank_level: updatedDealer.tankLevel,
            device_id
        });

        // --- FORWARD TO AWS (Cloud Bridge) ---
        const AWS_URL = process.env.AWS_TELEMETRY_URL;
        if (AWS_URL) {
            try {
                logger.info('Forwarding telemetry to AWS', {
                    aws_url: AWS_URL,
                    device_id
                });
                await axios.post(AWS_URL, req.body);
                logger.info('AWS forward successful', { device_id });
            } catch (awsError: any) {
                logger.error('AWS forward failed', {
                    device_id,
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
