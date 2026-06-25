import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import { ScoreBar, Empty } from '../components/ui.jsx';
import { fmtMoney, fmtDay } from '../lib/calc.js';

const axis = { stroke: '#5b6678', fontSize: 11 };
const tooltipStyle = { background: '#161c28', border: '1px solid #232c3d', borderRadius: 8, fontSize: 12 };

export default function Dashboard() {
  const toast = useToast();
  const [d, setD] = useState(null);

  useEffect(() => { api.get('/analytics/dashboard').then(setD).catch((e) => toast(e.message, 'error')); }, []);
  if (!d) return <div className="muted">Loading…</div>;

  const stats = [
    ['Total Trades', d.totalTrades],
    ['Win Rate', `${d.winRate}%`],
    ['Average R:R', d.avgRR],
    ['Total Profit', fmtMoney(d.totalProfit), d.totalProfit >= 0 ? 'pos' : 'neg'],
  ];

  return (
    <div className="stack">
      <div className="row between">
        <h1>Dashboard</h1>
        <div className="row">
          <button className="btn btn-sm" onClick={() => api.download('/export/csv', 'trade-journal.csv')}>⤓ Export CSV</button>
          <Link className="btn btn-sm btn-primary" to="/trades/new">➕ New Trade</Link>
        </div>
      </div>

      <div className="grid cols-4">
        {stats.map(([label, value, cls]) => (
          <div key={label} className="card stat-card">
            <span className="label">{label}</span>
            <span className={`value ${cls || ''}`}>{value}</span>
          </div>
        ))}
      </div>

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3>Equity Curve</h3>
          {d.equityCurve.length === 0 ? <Empty>Close some trades to build the curve.</Empty> : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={d.equityCurve}>
                <defs><linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#232c3d" />
                <XAxis dataKey="date" tick={axis} tickFormatter={(v) => fmtDay(v)} />
                <YAxis tick={axis} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => fmtDay(v)} formatter={(v) => fmtMoney(v)} />
                <Area type="monotone" dataKey="equity" stroke="#3b82f6" fill="url(#eq)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3>Monthly Performance</h3>
          {d.monthly.length === 0 ? <Empty>No closed trades yet.</Empty> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={d.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232c3d" />
                <XAxis dataKey="month" tick={axis} />
                <YAxis tick={axis} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
                <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                  {d.monthly.map((m, i) => <Cell key={i} fill={m.profit >= 0 ? '#22c55e' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid cols-3" style={{ alignItems: 'start' }}>
        <div className="card stack">
          <h3>Average Scores</h3>
          <ScoreBar label="Discipline" value={d.scores.discipline} />
          <ScoreBar label="Execution" value={d.scores.execution} />
          <ScoreBar label="Risk Management" value={d.scores.risk} />
          <ScoreBar label="Overall" value={d.scores.overall} />
        </div>

        <div className="card">
          <h3>Most Frequent Mistakes</h3>
          {d.topMistakes.length === 0 ? <Empty>None recorded yet.</Empty> : (
            <div className="stack" style={{ gap: 8 }}>
              {d.topMistakes.map((m, i) => (
                <div key={i} className="row between">
                  <small style={{ flex: 1 }}>{m.text}</small>
                  <span className="badge loss">×{m.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Calendar</h3>
          <CalendarView days={d.calendar} />
        </div>
      </div>
    </div>
  );
}

// Compact month heat-calendar of realised P/L per day.
function CalendarView({ days }) {
  const map = Object.fromEntries(days.map((x) => [x.date, x]));
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const first = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];

  return (
    <div>
      <small className="muted">{now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</small>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginTop: 8 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-faint)' }}>{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const rec = map[key];
          const bg = !rec ? 'var(--surface-2)' : rec.profit >= 0 ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)';
          return (
            <div key={i} title={rec ? `${fmtMoney(rec.profit)} · ${rec.trades} trade(s)` : ''}
              style={{ background: bg, borderRadius: 6, textAlign: 'center', fontSize: 11, padding: '6px 0', color: 'var(--text-dim)' }}>
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
