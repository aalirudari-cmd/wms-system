import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../middleware/error.js';

export const analyticsRouter = Router();

// Dashboard summary: headline KPIs, equity curve, monthly performance,
// score averages, common-mistake counts and a calendar map.
analyticsRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const uid = req.user.id;
    const { rows: trades } = await pool.query(
      `SELECT id, opened_at, closed_at, result, profit_amount, profit_pct, planned_rr,
              discipline_score, execution_score, risk_score, overall_score, ai_review, status
       FROM trades WHERE user_id = $1 ORDER BY opened_at`,
      [uid]
    );

    const closed = trades.filter((t) => t.status === 'closed' && t.result);
    const wins = closed.filter((t) => t.result === 'win');
    const totalProfit = closed.reduce((s, t) => s + Number(t.profit_amount || 0), 0);
    const rrValues = trades.map((t) => Number(t.planned_rr)).filter((n) => Number.isFinite(n));
    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

    // Equity curve: running sum of realised P/L over closed trades.
    let running = 0;
    const equityCurve = closed.map((t) => {
      running += Number(t.profit_amount || 0);
      return { date: t.closed_at || t.opened_at, equity: Math.round(running * 100) / 100, trade: t.id };
    });

    // Monthly performance buckets.
    const monthly = {};
    for (const t of closed) {
      const key = (t.closed_at || t.opened_at).toISOString().slice(0, 7);
      monthly[key] = monthly[key] || { month: key, profit: 0, trades: 0, wins: 0 };
      monthly[key].profit += Number(t.profit_amount || 0);
      monthly[key].trades += 1;
      if (t.result === 'win') monthly[key].wins += 1;
    }

    // Calendar map: per-day profit for the calendar heat view.
    const calendar = {};
    for (const t of closed) {
      const day = (t.closed_at || t.opened_at).toISOString().slice(0, 10);
      calendar[day] = calendar[day] || { date: day, profit: 0, trades: 0 };
      calendar[day].profit += Number(t.profit_amount || 0);
      calendar[day].trades += 1;
    }

    // Most frequent mistakes pulled from generated AI reviews.
    const mistakeCounts = {};
    for (const t of trades) {
      const m = t.ai_review?.mistakes || [];
      for (const msg of m) mistakeCounts[msg] = (mistakeCounts[msg] || 0) + 1;
    }
    const topMistakes = Object.entries(mistakeCounts)
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      totalTrades: trades.length,
      closedTrades: closed.length,
      winRate: closed.length ? Math.round((wins.length / closed.length) * 1000) / 10 : 0,
      avgRR: avg(rrValues) ? Math.round(avg(rrValues) * 100) / 100 : 0,
      totalProfit: Math.round(totalProfit * 100) / 100,
      scores: {
        discipline: Math.round(avg(trades.map((t) => Number(t.discipline_score)).filter(Number.isFinite)) || 0),
        execution: Math.round(avg(trades.map((t) => Number(t.execution_score)).filter(Number.isFinite)) || 0),
        risk: Math.round(avg(trades.map((t) => Number(t.risk_score)).filter(Number.isFinite)) || 0),
        overall: Math.round(avg(trades.map((t) => Number(t.overall_score)).filter(Number.isFinite)) || 0),
      },
      equityCurve,
      monthly: Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)),
      calendar: Object.values(calendar),
      topMistakes,
    });
  })
);

export const exportRouter = Router();

// CSV export of all trades. PDF/Excel can be produced client-side from the same
// rows; CSV is the lossless source of truth.
exportRouter.get(
  '/csv',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, opened_at, instrument, direction, entry_price, stop_loss, take_profit,
              risk_pct, lot_size, session, setup_type, status, result, profit_amount,
              profit_pct, planned_rr, checklist_pct, discipline_score, execution_score,
              risk_score, overall_score
       FROM trades WHERE user_id = $1 ORDER BY opened_at DESC`,
      [req.user.id]
    );
    const cols = rows.length ? Object.keys(rows[0]) : ['id'];
    const esc = (v) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="trade-journal.csv"');
    res.send(csv);
  })
);
