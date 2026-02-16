import { Router } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../lib/config';

const router = Router();

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
            { expiresIn: JWT_EXPIRES_IN }
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
 * Register a new user
 * - If no users exist: open (bootstrap - first user becomes ADMIN)
 * - Otherwise: requires ADMIN authentication
 */
router.post('/register', async (req, res) => {
    try {
        // Check if this is the first user (bootstrap mode)
        const userCount = await prisma.user.count();
        const isBootstrap = userCount === 0;

        // If not bootstrap, require ADMIN authentication
        if (!isBootstrap) {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Admin authentication required' });
                return;
            }

            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
                if (decoded.role !== 'ADMIN') {
                    res.status(403).json({ error: 'Only admins can create new users' });
                    return;
                }
            } catch {
                res.status(401).json({ error: 'Invalid or expired token' });
                return;
            }
        }

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

        // First user is always ADMIN, others get role from request body or default VIEWER
        const role = isBootstrap ? 'ADMIN' : (req.body.role === 'ADMIN' ? 'ADMIN' : 'VIEWER');

        // Create user
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashedPassword,
                name,
                role
            }
        });

        // Generate JWT (only for bootstrap — admin already has a token)
        const responseData: any = {
            message: isBootstrap ? 'İlk admin hesabı oluşturuldu' : 'Kullanıcı oluşturuldu',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        };

        if (isBootstrap) {
            responseData.token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );
        }

        res.status(201).json(responseData);
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
