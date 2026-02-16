import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import logger from './utils/logger';

const app = express();

// Security Middleware
app.use(helmet());

// CORS Configuration
const allowedOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',') 
    : ['http://localhost:5173', 'http://localhost:5174', 'https://margaz.netlify.app'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());

// Rate Limiting - Different limits for different endpoints
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Reduced from 5000
    message: { error: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Stricter for auth endpoints
    message: { error: 'Too many login attempts, please try again later' }
});

const telemetryLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // Allow frequent telemetry from devices
    message: { error: 'Too many telemetry requests' }
});

app.use(generalLimiter);

// Import routes
import authRoutes from './routes/auth.routes';
import syncRoutes from './routes/sync.routes';
import dealerRoutes from './routes/dealer.routes';
import telemetryRoutes from './routes/telemetry.routes';
import deviceRoutes from './routes/device.routes';
import { authenticate, requireAdmin } from './middleware/auth.middleware';

// Public Routes (no auth required)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/telemetry', telemetryLimiter, telemetryRoutes); // Arduino needs access

// Protected Routes (will add auth middleware selectively in route files)
app.use('/api/sync', syncRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/devices', deviceRoutes);

// OpenAPI Docs (Admin only)
const openapiPath = path.join(process.cwd(), 'docs', 'openapi.yaml');
if (fs.existsSync(openapiPath)) {
    const openapiContent = fs.readFileSync(openapiPath, 'utf8');
    const openapiDocument = YAML.parse(openapiContent);
    app.use('/docs', authenticate, requireAdmin, swaggerUi.serve, swaggerUi.setup(openapiDocument));
    app.get('/docs/openapi.yaml', authenticate, requireAdmin, (req, res) => {
        res.type('text/yaml').send(openapiContent);
    });
}

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.1.0'
    });
});

// Global Error Handler — catches body-parser JSON SyntaxError
// Bu middleware firmware'den gelen bozuk JSON'ları yakalar ve Winston'a loglar.
// Önceden bu hatalar sadece PM2 stderr'e düşüyordu ve görünmez kalıyordu.
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    if (err.type === 'entity.parse.failed') {
        logger.warn('Malformed JSON received', {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            url: req.originalUrl,
            body: typeof err.body === 'string' ? err.body.substring(0, 200) : undefined
        });
        res.status(400).json({ error: 'Invalid JSON payload' });
        return;
    }

    // Diğer beklenmeyen hatalar
    logger.error('Unhandled error', {
        message: err.message,
        stack: err.stack,
        ip: req.ip,
        url: req.originalUrl
    });
    res.status(500).json({ error: 'Internal server error' });
});

export default app;
