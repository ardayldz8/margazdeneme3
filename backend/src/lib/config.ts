import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
export const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
