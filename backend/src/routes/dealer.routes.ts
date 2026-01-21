import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all dealers
router.get('/', async (req, res) => {
    try {
        const dealers = await prisma.dealer.findMany({
            orderBy: { updatedAt: 'desc' }
        });
        res.json(dealers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dealers' });
    }
});

// Get single dealer by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const dealer = await prisma.dealer.findUnique({
            where: { id }
        });

        if (!dealer) {
            res.status(404).json({ error: 'Dealer not found' });
            return;
        }

        res.json(dealer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dealer' });
    }
});

import { GeocodingService } from '../services/geocoding.service';

// ... existing code ...

// Trigger geocoding manually
router.post('/geocode', async (req, res) => {
    try {
        const geocodingService = new GeocodingService();
        // Run in background
        geocodingService.updateAllDealerCoordinates();
        res.json({ message: 'Geocoding process started in background' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to start geocoding' });
    }
});

export default router;
