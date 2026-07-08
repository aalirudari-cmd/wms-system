import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { logger } from './lib/logger.js';

async function waitForDatabase(retries = 15) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (err) {
      const wait = Math.min(attempt * 1000, 5000);
      logger.info(`Database not ready (attempt ${attempt}/${retries}). Retrying in ${wait}ms.`, (err as Error).message);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error('Database did not become available in time.');
}

async function start() {
  await waitForDatabase();
  app.listen(env.port, () => {
    logger.info(`Stockhaus WMS API listening on port ${env.port} (${env.nodeEnv}).`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
