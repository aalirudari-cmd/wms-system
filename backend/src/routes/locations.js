import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireRole } from '../middleware/roles.js';
import { asyncHandler, httpError } from '../middleware/error.js';

export const locationsRouter = Router();

locationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM locations ORDER BY code');
    res.json(rows);
  })
);

locationsRouter.post(
  '/',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const { code, name, type } = req.body || {};
    if (!code || !name) throw httpError(400, 'Code and name are required.');
    const { rows } = await pool.query(
      `INSERT INTO locations (code, name, type) VALUES ($1, $2, COALESCE($3, 'bin')) RETURNING *`,
      [code, name, type]
    );
    res.status(201).json(rows[0]);
  })
);
