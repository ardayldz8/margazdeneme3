import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// JWT sign options
const jwtOptions: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as string
};

// Validation schemas
const loginSchema = z.object({
    email: z.string().email('Geçerli bir email adresi girin'),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
});

const registerSchema = z.object({
    email: z.string().email('Geçerli bir email adresi girin'),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
    name: z.string().min(2, 'İsim en az 2 karakter olmalı').optional(),
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
    try {
        // Validate input
        const result = loginSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ 
                error: 'Validation failed', 
                details: result.error.issues 
            });
            return;
        }

        const { email, password } = result.data;

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            res.status(401).json({ error: 'Email veya şifre hatalı' });
            return;
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Email veya şifre hatalı' });
            return;
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            jwtOptions
        );

        res.json({
            message: 'Giriş başarılı',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Giriş sırasında bir hata oluştu' });
    }
});

/**
 * POST /api/auth/register
 * Register a new user (Admin only in production)
 */
router.post('/register', async (req, res) => {
    try {
        // Validate input
        const result = registerSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ 
                error: 'Validation failed', 
                details: result.error.issues 
            });
            return;
        }

        const { email, password, name } = result.data;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            res.status(409).json({ error: 'Bu email adresi zaten kayıtlı' });
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Check if this is the first user (make them admin)
        const userCount = await prisma.user.count();
        const role = userCount === 0 ? 'ADMIN' : 'VIEWER';

        // Create user
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashedPassword,
                name,
                role
            }
        });

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            jwtOptions
        );

        res.status(201).json({
            message: 'Kayıt başarılı',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Kayıt sırasında bir hata oluştu' });
    }
});

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            }
        });

        if (!user) {
            res.status(404).json({ error: 'Kullanıcı bulunamadı' });
            return;
        }

        res.json({ user });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Kullanıcı bilgileri alınamadı' });
    }
});

/**
 * POST /api/auth/change-password
 * Change password (requires authentication)
 */
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({ error: 'Mevcut ve yeni şifre gerekli' });
            return;
        }

        if (newPassword.length < 6) {
            res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalı' });
            return;
        }

        // Get user with password
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id }
        });

        if (!user) {
            res.status(404).json({ error: 'Kullanıcı bulunamadı' });
            return;
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Mevcut şifre hatalı' });
            return;
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Şifre başarıyla değiştirildi' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Şifre değiştirme sırasında bir hata oluştu' });
    }
});

export default router;
