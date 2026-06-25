import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler, httpError } from '../middleware/error.js';

export const checklistRouter = Router();

// List the trader's checklist template, ordered for display.
checklistRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, text, weight, required, position, active
       FROM checklist_items WHERE user_id = $1 AND active = TRUE
       ORDER BY position, id`,
      [req.user.id]
    );
    res.json(rows);
  })
);

checklistRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { text, weight = 1, required = false, position = 0 } = req.body || {};
    if (!text || !text.trim()) throw httpError(400, 'Checklist item text is required.');
    const { rows } = await pool.query(
      `INSERT INTO checklist_items (user_id, text, weight, required, position)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, text, weight, required, position, active`,
      [req.user.id, text.trim(), Number(weight) || 1, !!required, Number(position) || 0]
    );
    res.status(201).json(rows[0]);
  })
);

checklistRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { text, weight, required, position } = req.body || {};
    const { rows } = await pool.query(
      `UPDATE checklist_items SET
         text = COALESCE($1, text),
         weight = COALESCE($2, weight),
         required = COALESCE($3, required),
         position = COALESCE($4, position)
       WHERE id = $5 AND user_id = $6
       RETURNING id, text, weight, required, position, active`,
      [text ?? null, weight ?? null, required ?? null, position ?? null, req.params.id, req.user.id]
    );
    if (!rows.length) throw httpError(404, 'Checklist item not found.');
    res.json(rows[0]);
  })
);

// Soft delete so historical trade snapshots keep referencing the item.
checklistRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await pool.query(
      'UPDATE checklist_items SET active = FALSE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rowCount) throw httpError(404, 'Checklist item not found.');
    res.json({ ok: true });
  })
);
