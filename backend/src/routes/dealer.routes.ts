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

// Create new dealer
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const dealer = await prisma.dealer.create({
            data: {
                licenseNo: data.licenseNo || `NEW-${Date.now()}`,
                title: data.title,
                city: data.city,
                district: data.district,
                address: data.address,
                status: data.status || 'Yürürlükte',
                distributor: data.distributor,
                deviceId: data.deviceId,
                tankLevel: data.tankLevel || 0,
            }
        });
        res.status(201).json(dealer);
    } catch (error) {
        console.error('Create dealer error:', error);
        res.status(500).json({ error: 'Failed to create dealer' });
    }
});

// Update dealer
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const dealer = await prisma.dealer.update({
            where: { id },
            data: {
                title: data.title,
                city: data.city,
                district: data.district,
                address: data.address,
                status: data.status,
                distributor: data.distributor,
                deviceId: data.deviceId,
                tankLevel: data.tankLevel,
            }
        });
        res.json(dealer);
    } catch (error) {
        console.error('Update dealer error:', error);
        res.status(500).json({ error: 'Failed to update dealer' });
    }
});

// Delete dealer
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.dealer.delete({
            where: { id }
        });
        res.json({ message: 'Dealer deleted successfully' });
    } catch (error) {
        console.error('Delete dealer error:', error);
        res.status(500).json({ error: 'Failed to delete dealer' });
    }
});

export default router;
