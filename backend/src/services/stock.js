import { httpError } from '../middleware/error.js';

// The single place stock quantities ever change. Always call inside a
// transaction (pass the transaction's client). Upserts the inventory row,
// guards against going negative, and records the movement in the audit log.
export async function applyStockChange(client, { productId, locationId, delta, type, reference, userId }) {
  const { rows } = await client.query(
    'SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2 FOR UPDATE',
    [productId, locationId]
  );
  const current = rows[0]?.quantity ?? 0;
  const next = current + delta;
  if (next < 0) {
    throw httpError(409, `Not enough stock at that location (have ${current}, need ${-delta}).`);
  }

  if (rows.length === 0) {
    await client.query(
      'INSERT INTO inventory (product_id, location_id, quantity) VALUES ($1, $2, $3)',
      [productId, locationId, next]
    );
  } else {
    await client.query(
      'UPDATE inventory SET quantity = $1 WHERE product_id = $2 AND location_id = $3',
      [next, productId, locationId]
    );
  }

  await client.query(
    `INSERT INTO stock_movements (product_id, location_id, quantity_delta, type, reference, user_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [productId, locationId, delta, type, reference, userId]
  );

  return { product_id: productId, location_id: locationId, quantity: next };
}
