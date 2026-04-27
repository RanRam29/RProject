import dotenv from 'dotenv';
dotenv.config();

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';
import createApp from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

// Run DB migrations before starting — uses direct (non-pooler) URL to bypass PgBouncer
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
const prismaBin = path.join(serverRoot, 'node_modules', '.bin', 'prisma');
const tsxBin = path.join(serverRoot, 'node_modules', '.bin', 'tsx');
// Derive direct URL: strip "-pooler" from Neon pooler hostname so migrations bypass PgBouncer
const poolerUrl = process.env.DATABASE_URL ?? '';
const directUrl = process.env.DIRECT_URL ?? poolerUrl.replace(/-pooler\./, '.');
const migrateEnv = { ...process.env, DATABASE_URL: directUrl };
try {
  logger.info(`Running migrations with direct URL: ${directUrl.substring(0, 50)}...`);
  execSync(`"${prismaBin}" migrate deploy`, { cwd: serverRoot, stdio: 'inherit', env: migrateEnv });
  logger.info('Migrations complete. Running seed...');
  execSync(`"${tsxBin}" prisma/seed.ts`, { cwd: serverRoot, stdio: 'inherit', env: { ...process.env, DATABASE_URL: directUrl } });
  logger.info('Seed complete.');
} catch (err) {
  logger.warn('migrate/seed failed:', err instanceof Error ? err.message : String(err));
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