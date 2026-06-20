import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

export const pool = new Pool({
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  host: config.db.host,
  port: config.db.port,
  max: 10,
});

pool.on('error', (err) => {
  // A pooled client died unexpectedly; log so it surfaces in container logs.
  console.error('Unexpected database pool error:', err.message);
});

// Run a set of statements inside a single transaction. The callback receives a
// dedicated client; rollback happens automatically on any thrown error.
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
