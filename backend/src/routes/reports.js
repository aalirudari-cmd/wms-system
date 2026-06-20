import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireRole } from '../middleware/roles.js';
import { asyncHandler } from '../middleware/error.js';

export const reportsRouter = Router();

// Reports are for oversight: manager or admin.
reportsRouter.use(requireRole('manager'));

// Stock valuation / on-hand by product with low-stock flag.
reportsRouter.get(
  '/stock-on-hand',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(`
      SELECT p.sku, p.name, p.category, p.unit, p.reorder_point,
             COALESCE(SUM(i.quantity), 0)::int AS on_hand,
             (COALESCE(SUM(i.quantity), 0) <= p.reorder_point) AS below_reorder
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      GROUP BY p.id
      ORDER BY p.category NULLS LAST, p.name
    `);
    res.json(rows);
  })
);

// Throughput over the last N days, grouped by type.
reportsRouter.get(
  '/throughput',
  asyncHandler(async (req, res) => {
    const days = Math.min(parseInt(req.query.days || '30', 10), 365);
    const { rows } = await pool.query(
      `SELECT type,
              COUNT(*)::int AS movements,
              SUM(ABS(quantity_delta))::int AS units
       FROM stock_movements
       WHERE created_at >= current_date - ($1::int - 1) * interval '1 day'
       GROUP BY type
       ORDER BY type`,
      [days]
    );
    res.json({ days, rows });
  })
);

// Most-moved products by absolute units in the window.
reportsRouter.get(
  '/top-movers',
  asyncHandler(async (req, res) => {
    const days = Math.min(parseInt(req.query.days || '30', 10), 365);
    const { rows } = await pool.query(
      `SELECT p.sku, p.name, SUM(ABS(m.quantity_delta))::int AS units_moved
       FROM stock_movements m
       JOIN products p ON p.id = m.product_id
       WHERE m.created_at >= current_date - ($1::int - 1) * interval '1 day'
       GROUP BY p.id
       ORDER BY units_moved DESC
       LIMIT 10`,
      [days]
    );
    res.json(rows);
  })
);
