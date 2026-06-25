import { Router } from 'express';
import { pool, withTransaction } from '../db/pool.js';
import { asyncHandler, httpError } from '../middleware/error.js';
import { checklistPercent, scoreTrade, buildReview } from '../services/analysis.js';

export const tradesRouter = Router();

const TRADE_FIELDS = [
  'opened_at', 'instrument', 'direction', 'entry_price', 'stop_loss', 'take_profit',
  'risk_pct', 'account_balance', 'lot_size', 'session', 'setup_type', 'market_condition',
];
const JOURNAL_FIELDS = [
  'status', 'result', 'profit_amount', 'profit_pct', 'closed_at', 'emotions_before',
  'emotions_during', 'emotions_after', 'what_went_well', 'what_went_wrong', 'improvements',
];

// Recompute scores + AI review for a trade and persist them. Used on create and
// on every journal update so analysis always reflects the latest data.
async function recompute(client, tradeId, userId) {
  const { rows: tr } = await client.query('SELECT * FROM trades WHERE id = $1 AND user_id = $2', [tradeId, userId]);
  const trade = tr[0];
  if (!trade) throw httpError(404, 'Trade not found.');
  const { rows: items } = await client.query('SELECT * FROM trade_checklist WHERE trade_id = $1', [tradeId]);

  const pct = checklistPercent(items);
  trade.checklist_pct = pct;
  const scores = scoreTrade({ checklistPct: pct, trade });
  const review = buildReview({ trade: { ...trade, checklist_pct: pct }, items, scores });

  const { rows } = await client.query(
    `UPDATE trades SET
       checklist_pct = $1, planned_rr = $2, discipline_score = $3, execution_score = $4,
       risk_score = $5, overall_score = $6, ai_review = $7, updated_at = now()
     WHERE id = $8 RETURNING *`,
    [pct, scores.planned_rr, scores.discipline_score, scores.execution_score,
     scores.risk_score, scores.overall_score, JSON.stringify(review), tradeId]
  );
  return rows[0];
}

// Create a trade. The checklist snapshot is supplied by the client; the server
// enforces that every required item is checked before allowing the open.
tradesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    if (!b.instrument || !b.direction) throw httpError(400, 'Instrument and direction are required.');

    const checklist = Array.isArray(b.checklist) ? b.checklist : [];
    const unmet = checklist.filter((c) => c.required && !c.checked);
    if (unmet.length) {
      throw httpError(422, `Cannot open trade: ${unmet.length} required checkpoint(s) not met.`);
    }

    const trade = await withTransaction(async (client) => {
      const cols = ['user_id', 'tags'];
      const vals = [req.user.id, b.tags || []];
      // Only include entry fields that were actually supplied so NOT NULL
      // columns with defaults (e.g. opened_at) fall back to their default.
      for (const f of TRADE_FIELDS) {
        if (b[f] != null && b[f] !== '') { cols.push(f); vals.push(b[f]); }
      }
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await client.query(
        `INSERT INTO trades (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`,
        vals
      );
      const tradeId = rows[0].id;

      for (const c of checklist) {
        await client.query(
          `INSERT INTO trade_checklist (trade_id, item_id, text, weight, required, checked, comment)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [tradeId, c.item_id ?? c.id ?? null, c.text, Number(c.weight) || 1, !!c.required, !!c.checked, c.comment ?? null]
        );
      }
      return recompute(client, tradeId, req.user.id);
    });
    res.status(201).json(trade);
  })
);

// List with optional search & filters.
tradesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, result, instrument, session, status, setup, from, to } = req.query;
    const where = ['user_id = $1'];
    const params = [req.user.id];
    // Add a single-placeholder clause; `?` is replaced with the next $N.
    const add = (clause, val) => { params.push(val); where.push(clause.replace('?', `$${params.length}`)); };

    if (q) {
      params.push(`%${q}%`);
      const p = `$${params.length}`;
      where.push(`(instrument ILIKE ${p} OR setup_type ILIKE ${p} OR ${p} = ANY(tags))`);
    }
    if (result) add('result = ?', result);
    if (instrument) add('instrument ILIKE ?', `%${instrument}%`);
    if (session) add('session = ?', session);
    if (status) add('status = ?', status);
    if (setup) add('setup_type ILIKE ?', `%${setup}%`);
    if (from) add('opened_at >= ?', from);
    if (to) add('opened_at <= ?', to);

    const { rows } = await pool.query(
      `SELECT id, opened_at, instrument, direction, session, setup_type, status, result,
              profit_amount, profit_pct, risk_pct, planned_rr, checklist_pct, overall_score, tags
       FROM trades WHERE ${where.join(' AND ')} ORDER BY opened_at DESC`,
      params
    );
    res.json(rows);
  })
);

tradesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM trades WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!rows.length) throw httpError(404, 'Trade not found.');
    const trade = rows[0];
    const [{ rows: checklist }, { rows: images }] = await Promise.all([
      pool.query('SELECT * FROM trade_checklist WHERE trade_id = $1 ORDER BY id', [trade.id]),
      pool.query('SELECT * FROM trade_images WHERE trade_id = $1 ORDER BY uploaded_at', [trade.id]),
    ]);
    res.json({ ...trade, checklist, images });
  })
);

// Update the journal half (and/or entry fields), then re-run analysis.
tradesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const updatable = [...TRADE_FIELDS, ...JOURNAL_FIELDS, 'tags'];
    const sets = [];
    const params = [];
    for (const f of updatable) {
      if (f in b) { params.push(b[f]); sets.push(`${f} = $${params.length}`); }
    }
    const trade = await withTransaction(async (client) => {
      if (sets.length) {
        params.push(req.params.id, req.user.id);
        const { rowCount } = await client.query(
          `UPDATE trades SET ${sets.join(', ')}, updated_at = now()
           WHERE id = $${params.length - 1} AND user_id = $${params.length}`,
          params
        );
        if (!rowCount) throw httpError(404, 'Trade not found.');
      }
      return recompute(client, req.params.id, req.user.id);
    });
    res.json(trade);
  })
);

// Toggle / edit checklist responses on an existing trade.
tradesRouter.put(
  '/:id/checklist',
  asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body?.checklist) ? req.body.checklist : [];
    const trade = await withTransaction(async (client) => {
      for (const c of items) {
        await client.query(
          'UPDATE trade_checklist SET checked = $1, comment = $2 WHERE id = $3 AND trade_id = $4',
          [!!c.checked, c.comment ?? null, c.id, req.params.id]
        );
      }
      return recompute(client, req.params.id, req.user.id);
    });
    res.json(trade);
  })
);

tradesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await pool.query('DELETE FROM trades WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!rowCount) throw httpError(404, 'Trade not found.');
    res.json({ ok: true });
  })
);
