import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/telemetry
// Receives: { "tank_level": 55, "voltage": 12.5, "device_id": "demo_unit" }
router.post('/', async (req, res) => {
    try {
        const { tank_level, device_id } = req.body;

        console.log(`📡 Telemetry Received: Level=${tank_level}% (Device: ${device_id})`);

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
            console.log(`🆕 Yeni cihaz otomatik kaydedildi: ${device_id}`);
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
            console.warn(`⚠️ Device ${device_id} henüz bir bayiye atanmamış`);
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
                tankLevel: Number(tank_level),
                lastData: new Date()
            }
        });

        console.log(`✅ Updated Dealer: ${updatedDealer.title} -> ${updatedDealer.tankLevel}%`);

        // --- FORWARD TO AWS (Cloud Bridge) ---
        try {
            const axios = require('axios');
            const AWS_URL = 'https://mbgaykif87.execute-api.eu-north-1.amazonaws.com/'; // Root endpoint for POST

            console.log(`☁️ Forwarding to AWS: ${AWS_URL}`);
            await axios.post(AWS_URL, req.body);
            console.log('✅ AWS Forward Success');
        } catch (awsError: any) {
            console.error('❌ AWS Forward Failed:', awsError.message);
            // Don't fail the request if AWS fails, just log it
        }

        res.json({ message: 'Data received & forwarded', dealer: updatedDealer.title });
    } catch (error) {
        console.error('❌ Telemetry Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
