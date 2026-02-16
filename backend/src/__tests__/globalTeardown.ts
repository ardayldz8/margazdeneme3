import path from 'path';
import fs from 'fs';

module.exports = async () => {
  const testDbPath = path.join(process.cwd(), 'test.db');
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch (error) {
      // Ignore Windows file lock issues; database will be overwritten on next run
    }
  }
};
