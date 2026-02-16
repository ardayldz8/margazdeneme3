import path from 'path';

// Force isolated test database
const testDbPath = path.join(process.cwd(), 'test.db');
process.env.DATABASE_URL = `file:${testDbPath}`;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
