import { Router } from 'express';
import { pool, withTransaction } from '../db/pool.js';
import { requireRole } from '../middleware/roles.js';
import { asyncHandler, httpError } from '../middleware/error.js';
import { applyStockChange } from '../services/stock.js';

export const inventoryRouter = Router();

// Full stock-on-hand grid: product x location with quantities.
inventoryRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT i.id, i.quantity,
              p.id AS product_id, p.sku, p.name, p.unit, p.reorder_point,
              l.id AS location_id, l.code AS location_code, l.name AS location_name
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       JOIN locations l ON l.id = i.location_id
       WHERE i.quantity > 0
       ORDER BY p.name, l.code`
    );
    res.json(rows);
  })
);

// Manual stock adjustment (cycle counts, damage, corrections). Worker+.
inventoryRouter.post(
  '/adjust',
  requireRole('worker'),
  asyncHandler(async (req, res) => {
    const { product_id, location_id, delta, reference } = req.body || {};
    if (!product_id || !location_id || !Number.isInteger(delta) || delta === 0) {
      throw httpError(400, 'Provide a product, location and a non-zero whole-number change.');
    }
    const result = await withTransaction(async (client) => {
      return applyStockChange(client, {
        productId: product_id,
        locationId: location_id,
        delta,
        type: 'adjustment',
        reference: reference || 'Manual adjustment',
        userId: req.user.id,
      });
    });
    res.json(result);
  })
);

// Move stock between two locations in one transaction. Worker+.
inventoryRouter.post(
  '/transfer',
  requireRole('worker'),
  asyncHandler(async (req, res) => {
    const { product_id, from_location_id, to_location_id, quantity } = req.body || {};
    if (!product_id || !from_location_id || !to_location_id || !(quantity > 0)) {
      throw httpError(400, 'Provide a product, source, destination and a positive quantity.');
    }
    if (from_location_id === to_location_id) {
      throw httpError(400, 'Source and destination must differ.');
    }
    await withTransaction(async (client) => {
      await applyStockChange(client, {
        productId: product_id, locationId: from_location_id, delta: -quantity,
        type: 'transfer', reference: 'Transfer out', userId: req.user.id,
      });
      await applyStockChange(client, {
        productId: product_id, locationId: to_location_id, delta: quantity,
        type: 'transfer', reference: 'Transfer in', userId: req.user.id,
      });
    });
    res.json({ ok: true });
  })
);
