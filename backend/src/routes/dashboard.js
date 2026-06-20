import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../middleware/error.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const [totals, lowStock, recentMovements, throughput] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT count(*) FROM products)::int AS products,
          (SELECT count(*) FROM locations WHERE active)::int AS locations,
          (SELECT COALESCE(SUM(quantity), 0) FROM inventory)::int AS units_on_hand,
          (SELECT count(*) FROM receipts WHERE status = 'draft')::int AS open_receipts,
          (SELECT count(*) FROM shipments WHERE status = 'draft')::int AS open_shipments
      `),
      pool.query(`
        SELECT p.id, p.sku, p.name, p.reorder_point,
               COALESCE(SUM(i.quantity), 0)::int AS on_hand
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id
        GROUP BY p.id
        HAVING COALESCE(SUM(i.quantity), 0) <= p.reorder_point
        ORDER BY (COALESCE(SUM(i.quantity), 0) - p.reorder_point)
        LIMIT 8
      `),
      pool.query(`
        SELECT m.id, m.quantity_delta, m.type, m.reference, m.created_at,
               p.sku, p.name AS product_name, l.code AS location_code
        FROM stock_movements m
        JOIN products p ON p.id = m.product_id
        JOIN locations l ON l.id = m.location_id
        ORDER BY m.created_at DESC
        LIMIT 8
      `),
      // Last 7 days of inbound vs outbound for the chart.
      pool.query(`
        SELECT to_char(d.day, 'Dy') AS label, d.day::date AS day,
               COALESCE(SUM(CASE WHEN m.type = 'receipt' THEN m.quantity_delta END), 0)::int AS inbound,
               COALESCE(SUM(CASE WHEN m.type = 'shipment' THEN -m.quantity_delta END), 0)::int AS outbound
        FROM generate_series(current_date - interval '6 days', current_date, interval '1 day') AS d(day)
        LEFT JOIN stock_movements m ON date_trunc('day', m.created_at) = d.day
        GROUP BY d.day
        ORDER BY d.day
      `),
    ]);

    res.json({
      totals: totals.rows[0],
      lowStock: lowStock.rows,
      recentMovements: recentMovements.rows,
      throughput: throughput.rows,
    });
  })
);
