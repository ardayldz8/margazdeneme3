import { Router } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Get all devices (Authenticated users)
router.get('/', authenticate, async (req, res) => {
    try {
        const devices = await prisma.device.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(devices);
    } catch (error) {
        console.error('Error fetching devices:', error);
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
});

// Get single device (Authenticated users)
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const device = await prisma.device.findUnique({
            where: { id }
        });
        if (!device) {
            res.status(404).json({ error: 'Device not found' });
            return;
        }
        res.json(device);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch device' });
    }
});

// Create device (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { deviceId, name, description } = req.body;

        // Check if deviceId already exists
        const existing = await prisma.device.findUnique({
            where: { deviceId }
        });
        if (existing) {
            res.status(400).json({ error: 'Device ID already exists' });
            return;
        }

        const device = await prisma.device.create({
            data: {
                deviceId,
                name,
                description,
                status: 'active'
            }
        });
        res.status(201).json(device);
    } catch (error) {
        console.error('Error creating device:', error);
        res.status(500).json({ error: 'Failed to create device' });
    }
});

// Update device (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { deviceId, name, description, status } = req.body;

        const device = await prisma.device.update({
            where: { id },
            data: { deviceId, name, description, status }
        });
        res.json(device);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            res.status(404).json({ error: 'Device not found' });
            return;
        }
        console.error('Error updating device:', error);
        res.status(500).json({ error: 'Failed to update device' });
    }
});

// Delete device (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.device.delete({
            where: { id }
        });
        res.json({ message: 'Device deleted successfully' });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            res.status(404).json({ error: 'Device not found' });
            return;
        }
        console.error('Error deleting device:', error);
        res.status(500).json({ error: 'Failed to delete device' });
    }
});

export default router;
