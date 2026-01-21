import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import syncRoutes from './routes/sync.routes';

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000 // limit each IP to 5000 requests per windowMs
});
app.use(limiter);

import dealerRoutes from './routes/dealer.routes';
import telemetryRoutes from './routes/telemetry.routes';

// Routes
app.use('/api/sync', syncRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/telemetry', telemetryRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
