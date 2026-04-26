import dotenv from 'dotenv';
dotenv.config();

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';
import createApp from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

// Run DB migrations before starting — ensures schema is current on every deploy
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
try {
  logger.info('Running database migrations...');
  execSync('npx prisma migrate deploy', { cwd: serverRoot, stdio: 'inherit', env: process.env });
  logger.info('Migrations complete. Running seed...');
  execSync('npx tsx prisma/seed.ts', { cwd: serverRoot, stdio: 'inherit', env: process.env });
} catch (err) {
  logger.warn('migrate/seed step failed (may be ok if schema already exists):', err instanceof Error ? err.message : String(err));
}

const app = createApp();

const server = http.createServer(app);

// Initialize WebSocket server
import { initializeWebSocket } from './ws/ws.server.js';
initializeWebSocket(server);

// Start due date reminder scheduler
import { startDueDateReminders } from './modules/emails/due-date-reminder.js';

server.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
  startDueDateReminders();
});

export default server;