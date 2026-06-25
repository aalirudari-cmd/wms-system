import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { asyncHandler, httpError } from '../middleware/error.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, fullName } = req.body || {};
    if (!email || !password || password.length < 6) {
      throw httpError(400, 'Email and a password of at least 6 characters are required.');
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3) RETURNING id, email, full_name, created_at`,
      [email.toLowerCase().trim(), hash, (fullName || 'Trader').trim()]
    );
    const user = rows[0];
    res.status(201).json({ token: signToken(user), user });
  })
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) throw httpError(400, 'Enter your email and password.');
    const { rows } = await pool.query(
      'SELECT id, email, password_hash, full_name, created_at FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw httpError(401, 'Incorrect email or password.');
    }
    delete user.password_hash;
    res.json({ token: signToken(user), user });
  })
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);
