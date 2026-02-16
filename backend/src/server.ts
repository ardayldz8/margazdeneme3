import app from './app';
import dotenv from 'dotenv';
import { SerialService } from './services/serial.service';

dotenv.config();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.trim().length < 32 || JWT_SECRET.includes('fallback-secret-change-in-production')) {
    console.error('JWT_SECRET is missing or too weak. Please set a strong secret in the environment.');
    process.exit(1);
}

// Initialize Services
new SerialService();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
