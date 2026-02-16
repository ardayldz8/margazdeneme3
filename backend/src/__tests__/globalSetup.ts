import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

module.exports = async () => {
  const testDbPath = path.join(process.cwd(), 'test.db');

  // Ensure clean test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Apply schema to test database (test-only)
  execSync('npx prisma db push --skip-generate', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: `file:${testDbPath}`
    }
  });
};
