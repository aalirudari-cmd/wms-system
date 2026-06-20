import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { asyncHandler, httpError } from '../middleware/error.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      throw httpError(400, 'Enter a username and password.');
    }
    const { rows } = await pool.query(
      'SELECT id, username, password_hash, full_name, role, active FROM users WHERE username = $1',
      [username]
    );
    const user = rows[0];
    if (!user || !user.active || !(await bcrypt.compare(password, user.password_hash))) {
      throw httpError(401, 'Incorrect username or password.');
    }
    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
    });
  })
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

authRouter.post(
  '/change-password',
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 6) {
      throw httpError(400, 'New password must be at least 6 characters.');
    }
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!(await bcrypt.compare(currentPassword || '', rows[0].password_hash))) {
      throw httpError(401, 'Your current password is incorrect.');
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ ok: true });
  })
);
