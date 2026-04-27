import dotenv from 'dotenv';
dotenv.config();

import { execSync, spawnSync } from 'child_process';
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

  // Detect schema divergence: _prisma_migrations may have stale "applied" records
  // from a prior DB while the actual tables were wiped (e.g. Neon free-tier reset).
  // In that case migrate deploy only runs the last pending migration, which fails
  // because the tables it depends on don't exist.
  const schemaCheck = spawnSync(
    prismaBin,
    ['db', 'execute', '--stdin', '--url', directUrl],
    { input: "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users')::text;", cwd: serverRoot, encoding: 'utf-8', env: migrateEnv }
  );
  const usersExists = schemaCheck.status === 0 && (schemaCheck.stdout ?? '').includes('true');

  if (!usersExists) {
    logger.warn('Schema divergence detected — users table missing. Dropping stale migration history for full redeploy...');
    spawnSync(
      prismaBin,
      ['db', 'execute', '--stdin', '--url', directUrl],
      { input: 'DROP TABLE IF EXISTS "_prisma_migrations";', cwd: serverRoot, encoding: 'utf-8', env: migrateEnv }
    );
  }

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