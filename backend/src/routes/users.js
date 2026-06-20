import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { requireRole } from '../middleware/roles.js';
import { asyncHandler, httpError } from '../middleware/error.js';

export const usersRouter = Router();

// User administration is admin-only.
usersRouter.use(requireRole('admin'));

usersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      'SELECT id, username, full_name, role, active, created_at FROM users ORDER BY created_at'
    );
    res.json(rows);
  })
);

usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { username, password, full_name, role } = req.body || {};
    if (!username || !password || !full_name || !role) {
      throw httpError(400, 'Username, full name, role and password are all required.');
    }
    if (!['admin', 'manager', 'worker'].includes(role)) {
      throw httpError(400, 'Role must be admin, manager or worker.');
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, full_name, role, active, created_at`,
      [username, hash, full_name, role]
    );
    res.status(201).json(rows[0]);
  })
);

usersRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { full_name, role, active, password } = req.body || {};
    const fields = [];
    const values = [];
    let i = 1;
    if (full_name !== undefined) { fields.push(`full_name = $${i++}`); values.push(full_name); }
    if (role !== undefined) { fields.push(`role = $${i++}`); values.push(role); }
    if (active !== undefined) { fields.push(`active = $${i++}`); values.push(active); }
    if (password) {
      fields.push(`password_hash = $${i++}`);
      values.push(await bcrypt.hash(password, 10));
    }
    if (fields.length === 0) throw httpError(400, 'Nothing to update.');
    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, username, full_name, role, active, created_at`,
      values
    );
    if (rows.length === 0) throw httpError(404, 'User not found.');
    res.json(rows[0]);
  })
);
