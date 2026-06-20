import { Router } from 'express';
import { pool, withTransaction } from '../db/pool.js';
import { requireRole } from '../middleware/roles.js';
import { asyncHandler, httpError } from '../middleware/error.js';
import { applyStockChange } from '../services/stock.js';

export const receivingRouter = Router();

// List receipts with a line count and total quantity.
receivingRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT r.*, u.full_name AS created_by_name,
              COUNT(rl.id)::int AS line_count,
              COALESCE(SUM(rl.quantity), 0)::int AS total_qty
       FROM receipts r
       LEFT JOIN users u ON u.id = r.created_by
       LEFT JOIN receipt_lines rl ON rl.receipt_id = r.id
       GROUP BY r.id, u.full_name
       ORDER BY r.created_at DESC`
    );
    res.json(rows);
  })
);

receivingRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows: head } = await pool.query('SELECT * FROM receipts WHERE id = $1', [req.params.id]);
    if (head.length === 0) throw httpError(404, 'Receipt not found.');
    const { rows: lines } = await pool.query(
      `SELECT rl.*, p.sku, p.name AS product_name, l.code AS location_code
       FROM receipt_lines rl
       JOIN products p ON p.id = rl.product_id
       JOIN locations l ON l.id = rl.location_id
       WHERE rl.receipt_id = $1 ORDER BY rl.id`,
      [req.params.id]
    );
    res.json({ ...head[0], lines });
  })
);

// Create a draft receipt with its lines. Worker+ may receive goods.
receivingRouter.post(
  '/',
  requireRole('worker'),
  asyncHandler(async (req, res) => {
    const { reference, supplier, notes, lines } = req.body || {};
    if (!reference) throw httpError(400, 'A receipt reference is required.');
    if (!Array.isArray(lines) || lines.length === 0) {
      throw httpError(400, 'Add at least one line to receive.');
    }
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO receipts (reference, supplier, notes, created_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [reference, supplier || null, notes || null, req.user.id]
      );
      const receipt = rows[0];
      for (const line of lines) {
        if (!line.product_id || !line.location_id || !(line.quantity > 0)) {
          throw httpError(400, 'Each line needs a product, location and positive quantity.');
        }
        await client.query(
          `INSERT INTO receipt_lines (receipt_id, product_id, location_id, quantity)
           VALUES ($1, $2, $3, $4)`,
          [receipt.id, line.product_id, line.location_id, line.quantity]
        );
      }
      return receipt;
    });
    res.status(201).json(result);
  })
);

// Post a receipt: add every line's quantity to stock. Idempotent guard on status.
receivingRouter.post(
  '/:id/post',
  requireRole('worker'),
  asyncHandler(async (req, res) => {
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM receipts WHERE id = $1 FOR UPDATE',
        [req.params.id]
      );
      const receipt = rows[0];
      if (!receipt) throw httpError(404, 'Receipt not found.');
      if (receipt.status !== 'draft') throw httpError(409, `Receipt is already ${receipt.status}.`);

      const { rows: lines } = await client.query(
        'SELECT * FROM receipt_lines WHERE receipt_id = $1',
        [receipt.id]
      );
      for (const line of lines) {
        await applyStockChange(client, {
          productId: line.product_id, locationId: line.location_id, delta: line.quantity,
          type: 'receipt', reference: receipt.reference, userId: req.user.id,
        });
      }
      const { rows: updated } = await client.query(
        `UPDATE receipts SET status = 'posted', posted_at = now() WHERE id = $1 RETURNING *`,
        [receipt.id]
      );
      return updated[0];
    });
    res.json(result);
  })
);
