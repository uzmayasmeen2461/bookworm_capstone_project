import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import app from './app';
import pool from './db/connection';
import { seed } from './db/seed';

const PORT = parseInt(process.env.PORT || '5000', 10);

// In Docker container, bind to 0.0.0.0 so the host can reach it
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

// ── Run SQL migrations using the shared pool (no pool.end()) ─────────────────
// Safe to call on every startup — migration files use IF NOT EXISTS / CREATE IF.
const runMigrations = async () => {
  const migrationsDir = path.join(__dirname, 'db/migrations');
  if (!fs.existsSync(migrationsDir)) return; // no migrations dir in this build
  const files = fs.readdirSync(migrationsDir).sort();
  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.info(`[Migration] ${file}`);
    await pool.query(sql);
  }
  console.info('[Migration] All migrations applied.');
};

const startServer = async () => {
  // Verify DB connection before accepting requests
  try {
    await pool.query('SELECT 1');
    console.info('[Server] PostgreSQL connection verified');
  } catch (err: any) {
    console.error('[Server] Cannot connect to PostgreSQL:', err.message);
    console.error('[Server] Make sure PostgreSQL is running and .env credentials are correct');
    process.exit(1);
  }

  // Run migrations on every startup — idempotent, safe on Render free tier
  // where there is no separate one-shot job support
  try {
    await runMigrations();
  } catch (err: any) {
    console.error('[Migration] Failed:', err.message);
    process.exit(1);
  }

  // Seed only on first deploy (when books table is empty)
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM books');
    if (parseInt(rows[0].count, 10) === 0) {
      console.info('[Seed] Empty database detected — running seed...');
      await seed();
      console.info('[Seed] Completed successfully.');
    } else {
      console.info(`[Seed] Skipped — ${rows[0].count} books already in database.`);
    }
  } catch (err: any) {
    console.error('[Seed] Check failed:', err.message, '— attempting seed anyway...');
    try {
      await seed();
      console.info('[Seed] Completed successfully.');
    } catch (seedErr: any) {
      console.error('[Seed] Failed:', seedErr.message);
    }
  }

  // Always ensure the demo user exists — safe to run on every startup
  try {
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash('Demo@1234', 12);
    await pool.query(`
      INSERT INTO users (name, email, password_hash, gift_points)
      VALUES ('Demo User', 'demo@bookworm.com', $1, 100)
      ON CONFLICT (email) DO NOTHING
    `, [passwordHash]);
    console.info('[Seed] Demo user ensured: demo@bookworm.com / Demo@1234');
  } catch (err: any) {
    console.error('[Seed] Demo user insert failed:', err.message);
  }

  app.listen(PORT, HOST, () => {
    console.info(`[Server] BookWorm API running at http://${HOST}:${PORT}`);
    console.info(`[Server] API docs available at http://${HOST}:${PORT}/api-docs`);
    console.info(`[Server] Health check: http://${HOST}:${PORT}/health`);
  });
};

startServer();
