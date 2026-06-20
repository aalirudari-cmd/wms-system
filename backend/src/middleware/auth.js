import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool } from '../db/pool.js';

// Verify the bearer token and attach the live user record to the request.
export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Sign in to continue.' });
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const { rows } = await pool.query(
      'SELECT id, username, full_name, role, active FROM users WHERE id = $1',
      [payload.sub]
    );
    const user = rows[0];
    if (!user || !user.active) {
      return res.status(401).json({ error: 'This account is no longer active.' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Your session expired. Sign in again.' });
  }
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}
