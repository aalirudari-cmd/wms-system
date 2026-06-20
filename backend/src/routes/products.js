import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireRole } from '../middleware/roles.js';
import { asyncHandler, httpError } from '../middleware/error.js';

export const productsRouter = Router();

// List / search products. Any signed-in user may read.
productsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    const params = [];
    let where = '';
    if (q) {
      params.push(`%${q}%`);
      where = `WHERE p.sku ILIKE $1 OR p.name ILIKE $1 OR p.barcode ILIKE $1 OR p.category ILIKE $1`;
    }
    const { rows } = await pool.query(
      `SELECT p.*, COALESCE(SUM(i.quantity), 0)::int AS on_hand
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id
       ${where}
       GROUP BY p.id
       ORDER BY p.name`,
      params
    );
    res.json(rows);
  })
);

// Look up a single product by its scanned barcode. Used by the Scan station.
productsRouter.get(
  '/barcode/:barcode',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT p.*, COALESCE(SUM(i.quantity), 0)::int AS on_hand
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id
       WHERE p.barcode = $1 OR p.sku = $1
       GROUP BY p.id`,
      [req.params.barcode]
    );
    if (rows.length === 0) throw httpError(404, 'No product matches that code.');
    res.json(rows[0]);
  })
);

// Per-location stock breakdown for one product.
productsRouter.get(
  '/:id/stock',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT i.location_id, l.code, l.name, i.quantity
       FROM inventory i
       JOIN locations l ON l.id = i.location_id
       WHERE i.product_id = $1 AND i.quantity > 0
       ORDER BY l.code`,
      [req.params.id]
    );
    res.json(rows);
  })
);

// Creating and editing the catalog requires manager or admin.
productsRouter.post(
  '/',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const { sku, barcode, name, description, category, unit, reorder_point } = req.body || {};
    if (!sku || !name) throw httpError(400, 'SKU and name are required.');
    const { rows } = await pool.query(
      `INSERT INTO products (sku, barcode, name, description, category, unit, reorder_point)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'EA'), COALESCE($7, 0))
       RETURNING *`,
      [sku, barcode || null, name, description || null, category || null, unit, reorder_point]
    );
    res.status(201).json(rows[0]);
  })
);

productsRouter.patch(
  '/:id',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const allowed = ['barcode', 'name', 'description', 'category', 'unit', 'reorder_point'];
    const fields = [];
    const values = [];
    let i = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${i++}`);
        values.push(req.body[key]);
      }
    }
    if (fields.length === 0) throw httpError(400, 'Nothing to update.');
    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (rows.length === 0) throw httpError(404, 'Product not found.');
    res.json(rows[0]);
  })
);

productsRouter.delete(
  '/:id',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  })
);
