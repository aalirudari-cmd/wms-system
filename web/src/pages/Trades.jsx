import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import { Empty } from '../components/ui.jsx';
import { fmtMoney, fmtDay } from '../lib/calc.js';

export default function Trades() {
  const toast = useToast();
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ q: '', result: '', session: '', status: '' });

  const load = () => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    api.get(`/trades${qs ? `?${qs}` : ''}`).then(setRows).catch((e) => toast(e.message, 'error'));
  };
  useEffect(() => { load(); }, [filters]);

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <div className="stack">
      <div className="row between">
        <h1>Trades</h1>
        <Link className="btn btn-primary" to="/trades/new">➕ New Trade</Link>
      </div>

      <div className="card">
        <div className="row wrap">
          <input style={{ flex: 2, minWidth: 200 }} placeholder="Search instrument, setup, tag…" value={filters.q} onChange={set('q')} />
          <select value={filters.status} onChange={set('status')}><option value="">All status</option><option value="open">Open</option><option value="closed">Closed</option></select>
          <select value={filters.result} onChange={set('result')}><option value="">All results</option><option value="win">Win</option><option value="loss">Loss</option><option value="be">Break-even</option></select>
          <select value={filters.session} onChange={set('session')}><option value="">All sessions</option><option value="asian">Asian</option><option value="london">London</option><option value="newyork">New York</option><option value="other">Other</option></select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {rows.length === 0 ? <Empty>No trades match. <Link to="/trades/new">Log your first trade →</Link></Empty> : (
          <table>
            <thead><tr>
              <th>Date</th><th>Instrument</th><th>Dir</th><th>Session</th><th>Setup</th>
              <th>Status</th><th>Result</th><th>P/L</th><th>R:R</th><th>Checklist</th><th>Score</th>
            </tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="clickable" onClick={() => nav(`/trades/${t.id}`)}>
                  <td>{fmtDay(t.opened_at)}</td>
                  <td><strong>{t.instrument}</strong></td>
                  <td><span className={`badge ${t.direction}`}>{t.direction}</span></td>
                  <td className="muted">{t.session || '—'}</td>
                  <td className="muted">{t.setup_type || '—'}</td>
                  <td><span className={`badge ${t.status === 'open' ? 'open' : 'tag'}`}>{t.status}</span></td>
                  <td>{t.result ? <span className={`badge ${t.result}`}>{t.result}</span> : '—'}</td>
                  <td className={Number(t.profit_amount) >= 0 ? 'pos' : 'neg'}>{t.profit_amount == null ? '—' : fmtMoney(t.profit_amount)}</td>
                  <td>{t.planned_rr ?? '—'}</td>
                  <td>{t.checklist_pct}%</td>
                  <td><strong>{t.overall_score == null ? '—' : Math.round(t.overall_score)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
