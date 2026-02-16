import { PrismaClient } from '@prisma/client';

// Test database client
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || 'file:./test.db',
        },
    },
});

// Global test setup
beforeAll(async () => {
    // Connect to test database
    await prisma.$connect();
});

// Global test teardown
afterAll(async () => {
    // Disconnect from database
    await prisma.$disconnect();
});

// Clean up after each test
afterEach(async () => {
    // Clean up test data if needed
    // Note: Be careful with this in production database
});

export { prisma };
