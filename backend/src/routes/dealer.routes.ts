import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

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

// Get dealer telemetry history (Son 24 saat)
router.get('/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const hours = parseInt(req.query.hours as string) || 24;

        // Son X saatlik veri
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        const history = await prisma.telemetryHistory.findMany({
            where: {
                dealerId: id,
                timestamp: { gte: since }
            },
            orderBy: { timestamp: 'asc' },
            select: {
                tankLevel: true,
                timestamp: true
            }
        });

        res.json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

import { GeocodingService } from '../services/geocoding.service';

// ... existing code ...

// Trigger geocoding manually (Admin only)
router.post('/geocode', authenticate, requireAdmin, async (req, res) => {
    try {
        const geocodingService = new GeocodingService();
        // Run in background
        geocodingService.updateAllDealerCoordinates();
        res.json({ message: 'Geocoding process started in background' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to start geocoding' });
    }
});

// Create new dealer (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
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

// Update dealer (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        // Eğer deviceId atanıyorsa, önce başka bayiden kaldır (Unique constraint)
        if (data.deviceId) {
            await prisma.dealer.updateMany({
                where: {
                    deviceId: data.deviceId,
                    NOT: { id: id }
                },
                data: { deviceId: null }
            });
        }

        const dealer = await prisma.dealer.update({
            where: { id },
            data: {
                title: data.title,
                city: data.city,
                district: data.district,
                address: data.address,
                status: data.status,
                distributor: data.distributor,
                deviceId: data.deviceId || null,
                tankLevel: data.tankLevel,
            }
        });
        res.json(dealer);
    } catch (error) {
        console.error('Update dealer error:', error);
        res.status(500).json({ error: 'Failed to update dealer' });
    }
});

// Delete dealer (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
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
