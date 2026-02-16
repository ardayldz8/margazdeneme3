import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../lib/config';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
            };
        }
    }
}

/**
 * Verifies JWT token and attaches user to request
 * Use this for protected routes
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as {
            id: string;
            email: string;
            role: string;
        };

        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

/**
 * Checks if user has admin role
 * Must be used AFTER authenticate middleware
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    if (req.user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }

    next();
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for public endpoints that behave differently for logged-in users
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET) as {
                id: string;
                email: string;
                role: string;
            };
            req.user = decoded;
        }
    } catch (error) {
        // Token invalid, but we continue without user
    }

    next();
};
