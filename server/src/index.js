import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { mkdirSync } from 'node:fs';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { migrate } from './db/migrate.js';
import { api } from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

mkdirSync(config.uploadDir, { recursive: true });

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
if (config.nodeEnv !== 'test') app.use(morgan('tiny'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/uploads', express.static(config.uploadDir));
app.use('/api', api);
app.use(notFound);
app.use(errorHandler);

// Wait for Postgres, migrate, then listen. The DB container may still be
// starting, so retry with backoff.
async function waitForDatabase(retries = 10) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      const wait = Math.min(attempt * 1000, 5000);
      console.log(`Database not ready (attempt ${attempt}/${retries}): ${err.message}. Retrying in ${wait}ms.`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error('Database did not become available in time.');
}

async function start() {
  await waitForDatabase();
  await migrate();
  app.listen(config.port, () => {
    console.log(`Trade Journal API listening on port ${config.port} (${config.nodeEnv}).`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
