import pg from 'pg';
import type { PoolClient } from 'pg';
import config from './config.js';

// Create a connection pool
const pool = new pg.Pool({
  connectionString: config.db.url,
  ssl: config.db.ssl,
});

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper function to execute queries
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error', { text, error });
    throw error;
  }
};

// Helper function to get a client from the pool (for transactions)
export const getClient = async (): Promise<PoolClient> => {
  const client = await pool.connect();
  return client;
};

// Close the pool (useful for graceful shutdown)
export const closePool = async () => {
  await pool.end();
  console.log('Database pool closed');
};

export default pool;
