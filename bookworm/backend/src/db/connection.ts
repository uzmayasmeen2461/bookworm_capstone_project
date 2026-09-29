import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Connection pool — reuses connections across requests for performance.
// Never hardcode credentials; always read from environment variables.
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'bookworm',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max:      10,   // max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.info('[DB] New client connected to PostgreSQL pool');
  }
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

export default pool;
