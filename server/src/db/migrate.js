import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import bcrypt from 'bcryptjs';
import { pool, withTransaction } from './pool.js';
import { config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Apply the schema, then seed a demo account the first time only.
export async function migrate() {
  const schema = await readFile(join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  if (config.seedDemo) await seedDemo();
  console.log('Database schema is up to date.');
}

async function seedDemo() {
  await withTransaction(async (client) => {
    const { rows } = await client.query('SELECT id FROM users WHERE email = $1', ['demo@journal.app']);
    if (rows.length) return;

    const hash = await bcrypt.hash('demo1234', 10);
    const { rows: u } = await client.query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, 'Demo Trader') RETURNING id`,
      ['demo@journal.app', hash]
    );
    const userId = u[0].id;

    const items = [
      ['Higher-timeframe trend is aligned with my direction', 3, true],
      ['Price reacted at a key support/resistance level', 3, true],
      ['Clear entry trigger / candlestick confirmation', 2, true],
      ['Stop loss placed at an invalidation level', 3, true],
      ['Reward-to-risk is at least 2:1', 2, false],
      ['No high-impact news in the next 30 minutes', 1, false],
      ['I am calm and following my plan (not FOMO)', 2, true],
    ];
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      await client.query(
        `INSERT INTO checklist_items (user_id, text, weight, required, position)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, it[0], it[1], it[2], idx]
      );
    }
    console.log('Seeded demo account demo@journal.app / demo1234.');
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
