import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler, httpError } from '../middleware/error.js';

export const notesRouter = Router();

// Daily plans, weekly reviews and monthly reviews. Upsert keyed by (kind, date).
notesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { kind } = req.query;
    const params = [req.user.id];
    let sql = 'SELECT * FROM notes WHERE user_id = $1';
    if (kind) { params.push(kind); sql += ` AND kind = $2`; }
    sql += ' ORDER BY note_date DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  })
);

notesRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    const { kind, note_date, content } = req.body || {};
    if (!kind || !note_date) throw httpError(400, 'kind and note_date are required.');
    const { rows } = await pool.query(
      `INSERT INTO notes (user_id, kind, note_date, content)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, kind, note_date)
       DO UPDATE SET content = EXCLUDED.content, updated_at = now()
       RETURNING *`,
      [req.user.id, kind, note_date, content || '']
    );
    res.json(rows[0]);
  })
);
