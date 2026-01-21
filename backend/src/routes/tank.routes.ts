import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST tank level from Arduino
// Example: POST /api/tank/level
// Body: { dealerId: "xxx", level: 75 }
router.post('/level', async (req, res) => {
    try {
        const { dealerId, level } = req.body;

        if (!dealerId || level === undefined) {
            res.status(400).json({ error: 'dealerId and level are required' });
            return;
        }

        // Update dealer's tank level
        const updatedDealer = await prisma.dealer.update({
            where: { id: dealerId },
            data: {
                tankLevel: parseFloat(level),
                lastSync: new Date()
            }
        });

        console.log(`Tank level updated: ${dealerId} -> ${level}%`);
        res.json({ success: true, dealerId, level: updatedDealer.tankLevel });
    } catch (error) {
        console.error('Tank level update error:', error);
        res.status(500).json({ error: 'Failed to update tank level' });
    }
});

// GET tank level for a dealer
router.get('/:dealerId', async (req, res) => {
    try {
        const { dealerId } = req.params;
        const dealer = await prisma.dealer.findUnique({
            where: { id: dealerId },
            select: { id: true, name: true, tankLevel: true, lastSync: true }
        });

        if (!dealer) {
            res.status(404).json({ error: 'Dealer not found' });
            return;
        }

        res.json(dealer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tank level' });
    }
});

export default router;
