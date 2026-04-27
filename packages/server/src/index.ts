import dotenv from 'dotenv';
dotenv.config();

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';
import createApp from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
const prismaBin = path.join(serverRoot, 'node_modules', '.bin', 'prisma');
const tsxBin = path.join(serverRoot, 'node_modules', '.bin', 'tsx');
const poolerUrl = process.env.DATABASE_URL ?? '';
// Use DIRECT_URL if set; otherwise strip "-pooler" from Neon pooler hostname
const directUrl = process.env.DIRECT_URL ?? poolerUrl.replace(/-pooler\./, '.');
const migrateEnv = { ...process.env, DATABASE_URL: directUrl };

function tryDeploy(): { ok: boolean; output: string } {
  try {
    execSync(`"${prismaBin}" migrate deploy`, { cwd: serverRoot, stdio: 'pipe', env: migrateEnv });
    return { ok: true, output: '' };
  } catch (e: unknown) {
    const err = e as { stderr?: Buffer; stdout?: Buffer };
    const output = `${err.stderr?.toString() ?? ''}${err.stdout?.toString() ?? ''}`;
    return { ok: false, output };
  }
}

try {
  logger.info(`Running migrations: ${directUrl.substring(0, 60)}...`);

  let result = tryDeploy();

  if (!result.ok) {
    if (result.output.includes('P3018') || result.output.includes('does not exist')) {
      // Stale _prisma_migrations records after a Neon DB wipe — drop history and retry from scratch
      logger.warn('P3018 detected — dropping stale migration history for full redeploy...');
      const sqlFile = path.join(tmpdir(), '_drop_migrations.sql');
      try {
        writeFileSync(sqlFile, 'DROP TABLE IF EXISTS "_prisma_migrations";');
        execSync(`"${prismaBin}" db execute --file "${sqlFile}" --url "${directUrl}"`, {
          cwd: serverRoot, stdio: 'pipe', env: migrateEnv,
        });
      } finally {
        try { unlinkSync(sqlFile); } catch { /* ignore */ }
      }
      execSync(`"${prismaBin}" migrate deploy`, { cwd: serverRoot, stdio: 'inherit', env: migrateEnv });

    } else if (result.output.includes('P3005')) {
      // Tables already exist but _prisma_migrations is missing — mark every migration as applied
      logger.warn('P3005 detected — resolving all migrations as applied against existing schema...');
      const migrationsDir = path.join(serverRoot, 'prisma', 'migrations');
      const dirs = readdirSync(migrationsDir)
        .filter(d => d !== 'migration_lock.toml' && !d.startsWith('.'))
        .sort();
      for (const dir of dirs) {
        try {
          execSync(`"${prismaBin}" migrate resolve --applied "${dir}"`, {
            cwd: serverRoot, stdio: 'pipe', env: migrateEnv,
          });
          logger.info(`Resolved: ${dir}`);
        } catch { /* already resolved or not a migration dir */ }
      }

    } else {
      logger.error('migrate deploy failed:\n' + result.output.substring(0, 600));
      throw new Error('migrate deploy failed — see above');
    }
  }

  // Idempotent schema patch: add fingerprint column if it wasn't physically applied
  // (happens when P3005 recovery marks migrations as applied without running the SQL)
  {
    const patchFile = path.join(tmpdir(), '_fingerprint_patch.sql');
    try {
      writeFileSync(patchFile, `ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "fingerprint" TEXT NOT NULL DEFAULT '';`);
      execSync(`"${prismaBin}" db execute --file "${patchFile}" --url "${directUrl}"`, {
        cwd: serverRoot, stdio: 'pipe', env: migrateEnv,
      });
      logger.info('Schema patch: fingerprint column ensured.');
    } catch { /* already exists or DB unreachable — safe to continue */ } finally {
      try { unlinkSync(patchFile); } catch { /* ignore */ }
    }
  }

  logger.info('Migrations complete. Running seed...');
  execSync(`"${tsxBin}" prisma/seed.ts`, {
    cwd: serverRoot, stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: directUrl },
  });
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
