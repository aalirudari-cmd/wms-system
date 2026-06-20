import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import bcrypt from 'bcryptjs';
import { pool, withTransaction } from './pool.js';
import { config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Apply the schema, then seed reference data the first time only.
export async function migrate() {
  const schema = await readFile(join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  await seed();
  console.log('Database schema is up to date.');
}

async function seed() {
  await withTransaction(async (client) => {
    // Default admin account.
    const { rows: admins } = await client.query(
      'SELECT id FROM users WHERE username = $1',
      [config.seed.adminUsername]
    );
    if (admins.length === 0) {
      const hash = await bcrypt.hash(config.seed.adminPassword, 10);
      await client.query(
        `INSERT INTO users (username, password_hash, full_name, role)
         VALUES ($1, $2, 'System Administrator', 'admin')`,
        [config.seed.adminUsername, hash]
      );
      console.log(`Seeded admin user "${config.seed.adminUsername}".`);
    }

    // Sample manager + worker so roles can be tried immediately.
    const demoUsers = [
      ['manager', 'manager123', 'Warehouse Manager', 'manager'],
      ['worker', 'worker123', 'Floor Worker', 'worker'],
    ];
    for (const [username, password, fullName, role] of demoUsers) {
      const { rows } = await client.query('SELECT id FROM users WHERE username = $1', [username]);
      if (rows.length === 0) {
        const hash = await bcrypt.hash(password, 10);
        await client.query(
          `INSERT INTO users (username, password_hash, full_name, role) VALUES ($1, $2, $3, $4)`,
          [username, hash, fullName, role]
        );
      }
    }

    // Only seed warehouse data on a truly empty catalog.
    const { rows: productCount } = await client.query('SELECT count(*)::int AS n FROM products');
    if (productCount[0].n > 0) return;

    const locations = [
      ['RECV', 'Receiving Dock', 'receiving'],
      ['A-01-01', 'Aisle A · Rack 01 · Bin 01', 'bin'],
      ['A-01-02', 'Aisle A · Rack 01 · Bin 02', 'bin'],
      ['B-02-01', 'Aisle B · Rack 02 · Bin 01', 'bin'],
      ['SHIP', 'Shipping Dock', 'shipping'],
    ];
    const locIds = {};
    for (const [code, name, type] of locations) {
      const { rows } = await client.query(
        'INSERT INTO locations (code, name, type) VALUES ($1, $2, $3) RETURNING id',
        [code, name, type]
      );
      locIds[code] = rows[0].id;
    }

    const products = [
      ['SKU-1001', '5012345678900', 'Heavy-Duty Pallet Wrap', 'Stretch film, 500mm', 'Packaging', 'ROLL', 20],
      ['SKU-1002', '5012345678917', 'Corrugated Box · Medium', '400x300x300mm', 'Packaging', 'EA', 100],
      ['SKU-2001', '5012345678924', 'Cordless Drill 18V', 'Brushless, 2 batteries', 'Power Tools', 'EA', 5],
      ['SKU-2002', '5012345678931', 'Safety Helmet · Hi-Vis', 'EN397 certified', 'PPE', 'EA', 15],
      ['SKU-3001', '5012345678948', 'Thermal Label Roll', '100x150mm, 500/roll', 'Consumables', 'ROLL', 30],
    ];
    for (const [sku, barcode, name, description, category, unit, reorder] of products) {
      const { rows } = await client.query(
        `INSERT INTO products (sku, barcode, name, description, category, unit, reorder_point)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [sku, barcode, name, description, category, unit, reorder]
      );
      const productId = rows[0].id;
      // Seed some starting stock spread across bins.
      const bin = ['A-01-01', 'A-01-02', 'B-02-01'][productId % 3];
      const qty = 10 + ((productId * 7) % 60);
      await client.query(
        'INSERT INTO inventory (product_id, location_id, quantity) VALUES ($1, $2, $3)',
        [productId, locIds[bin], qty]
      );
      await client.query(
        `INSERT INTO stock_movements (product_id, location_id, quantity_delta, type, reference)
         VALUES ($1, $2, $3, 'adjustment', 'Initial stock')`,
        [productId, locIds[bin], qty]
      );
    }
    console.log('Seeded demo locations, products and stock.');
  });
}

// Allow running standalone: `npm run migrate`.
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
