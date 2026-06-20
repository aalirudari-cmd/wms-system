import { Router } from 'express';
import { pool, withTransaction } from '../db/pool.js';
import { requireRole } from '../middleware/roles.js';
import { asyncHandler, httpError } from '../middleware/error.js';
import { applyStockChange } from '../services/stock.js';

export const shippingRouter = Router();

shippingRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT s.*, u.full_name AS created_by_name,
              COUNT(sl.id)::int AS line_count,
              COALESCE(SUM(sl.quantity), 0)::int AS total_qty
       FROM shipments s
       LEFT JOIN users u ON u.id = s.created_by
       LEFT JOIN shipment_lines sl ON sl.shipment_id = s.id
       GROUP BY s.id, u.full_name
       ORDER BY s.created_at DESC`
    );
    res.json(rows);
  })
);

shippingRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows: head } = await pool.query('SELECT * FROM shipments WHERE id = $1', [req.params.id]);
    if (head.length === 0) throw httpError(404, 'Shipment not found.');
    const { rows: lines } = await pool.query(
      `SELECT sl.*, p.sku, p.name AS product_name, l.code AS location_code
       FROM shipment_lines sl
       JOIN products p ON p.id = sl.product_id
       JOIN locations l ON l.id = sl.location_id
       WHERE sl.shipment_id = $1 ORDER BY sl.id`,
      [req.params.id]
    );
    res.json({ ...head[0], lines });
  })
);

shippingRouter.post(
  '/',
  requireRole('worker'),
  asyncHandler(async (req, res) => {
    const { reference, customer, notes, lines } = req.body || {};
    if (!reference) throw httpError(400, 'A shipment reference is required.');
    if (!Array.isArray(lines) || lines.length === 0) {
      throw httpError(400, 'Add at least one line to ship.');
    }
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO shipments (reference, customer, notes, created_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [reference, customer || null, notes || null, req.user.id]
      );
      const shipment = rows[0];
      for (const line of lines) {
        if (!line.product_id || !line.location_id || !(line.quantity > 0)) {
          throw httpError(400, 'Each line needs a product, location and positive quantity.');
        }
        await client.query(
          `INSERT INTO shipment_lines (shipment_id, product_id, location_id, quantity)
           VALUES ($1, $2, $3, $4)`,
          [shipment.id, line.product_id, line.location_id, line.quantity]
        );
      }
      return shipment;
    });
    res.status(201).json(result);
  })
);

// Ship the order: deduct each line from stock. Fails if any line is short.
shippingRouter.post(
  '/:id/ship',
  requireRole('worker'),
  asyncHandler(async (req, res) => {
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM shipments WHERE id = $1 FOR UPDATE',
        [req.params.id]
      );
      const shipment = rows[0];
      if (!shipment) throw httpError(404, 'Shipment not found.');
      if (shipment.status !== 'draft') throw httpError(409, `Shipment is already ${shipment.status}.`);

      const { rows: lines } = await client.query(
        'SELECT * FROM shipment_lines WHERE shipment_id = $1',
        [shipment.id]
      );
      for (const line of lines) {
        await applyStockChange(client, {
          productId: line.product_id, locationId: line.location_id, delta: -line.quantity,
          type: 'shipment', reference: shipment.reference, userId: req.user.id,
        });
      }
      const { rows: updated } = await client.query(
        `UPDATE shipments SET status = 'shipped', shipped_at = now() WHERE id = $1 RETURNING *`,
        [shipment.id]
      );
      return updated[0];
    });
    res.json(result);
  })
);
