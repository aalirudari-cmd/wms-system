import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../middleware/error.js';

export const movementsRouter = Router();

// Paginated audit trail with optional product/type filters.
movementsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const params = [];
    const clauses = [];
    if (req.query.product_id) {
      params.push(req.query.product_id);
      clauses.push(`m.product_id = $${params.length}`);
    }
    if (req.query.type) {
      params.push(req.query.type);
      clauses.push(`m.type = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    params.push(limit);
    const { rows } = await pool.query(
      `SELECT m.*, p.sku, p.name AS product_name, l.code AS location_code, u.full_name AS user_name
       FROM stock_movements m
       JOIN products p ON p.id = m.product_id
       JOIN locations l ON l.id = m.location_id
       LEFT JOIN users u ON u.id = m.user_id
       ${where}
       ORDER BY m.created_at DESC
       LIMIT $${params.length}`,
      params
    );
    res.json(rows);
  })
);
