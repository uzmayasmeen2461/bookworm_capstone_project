import fs from 'fs';
import path from 'path';
import pool from './connection';

const runMigrations = async () => {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort(); // sort ensures 001 before 002

  console.info('[Migration] Starting database migrations...');

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.info(`[Migration] Running: ${file}`);
    await pool.query(sql);
    console.info(`[Migration] Done:    ${file}`);
  }

  console.info('[Migration] All migrations completed successfully.');
  await pool.end();
};

runMigrations().catch((err) => {
  console.error('[Migration] Failed:', err.message);
  process.exit(1);
});
