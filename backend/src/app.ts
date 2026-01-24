import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

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

// Public Routes (no auth required)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/telemetry', telemetryLimiter, telemetryRoutes); // Arduino needs access

// Protected Routes (will add auth middleware selectively in route files)
app.use('/api/sync', syncRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/devices', deviceRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.1.0'
    });
});

export default app;
