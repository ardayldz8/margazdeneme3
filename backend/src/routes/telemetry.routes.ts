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

        // Device ID'ye göre bayi bul
        let dealer = await prisma.dealer.findUnique({
            where: { deviceId: device_id }
        });

        // Bulunamazsa uyarı ver
        if (!dealer) {
            console.warn(`⚠️ Device ${device_id} eşleşen bayi bulunamadı!`);
            res.status(404).json({ error: `Device ${device_id} not found. Please register this device to a dealer.` });
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
