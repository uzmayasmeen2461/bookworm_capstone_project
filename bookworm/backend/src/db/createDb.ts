import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const createDb = async () => {
  // Connect to the default 'postgres' database to create our app database
  const client = new Client({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    database: 'postgres',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  await client.connect();

  const dbName = process.env.DB_NAME || 'bookworm';

  const exists = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
  );

  if (exists.rows.length === 0) {
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.info(`[Setup] Database "${dbName}" created`);
  } else {
    console.info(`[Setup] Database "${dbName}" already exists`);
  }

  await client.end();
};

createDb().catch((err) => {
  console.error('[Setup] Failed to create database:', err.message);
  console.error('[Setup] Make sure PostgreSQL is running and DB_PASSWORD in .env is correct');
  process.exit(1);
});
