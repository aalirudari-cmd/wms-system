import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { migrate } from './db/migrate.js';
import { api } from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.use(cors());
app.use(express.json());
if (config.nodeEnv !== 'test') app.use(morgan('tiny'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', api);
app.use(notFound);
app.use(errorHandler);

// Wait for Postgres to accept connections, then migrate and listen. The DB
// container may still be starting up, so retry with backoff.
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
    console.log(`WMS API listening on port ${config.port} (${config.nodeEnv}).`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
