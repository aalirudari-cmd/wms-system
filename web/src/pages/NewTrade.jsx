import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import { Ring } from '../components/ui.jsx';
import { rrCalc } from '../lib/calc.js';

const SESSIONS = [['asian', 'Asian'], ['london', 'London'], ['newyork', 'New York'], ['other', 'Other']];
const CONDITIONS = ['Trending', 'Range', 'High Volatility', 'Low Volatility'];

export default function NewTrade() {
  const toast = useToast();
  const nav = useNavigate();
  const [template, setTemplate] = useState([]);
  const [checks, setChecks] = useState({});
  const [form, setForm] = useState({
    instrument: 'XAUUSD', direction: 'buy', opened_at: new Date().toISOString().slice(0, 16),
    entry_price: '', stop_loss: '', take_profit: '', risk_pct: '', account_balance: '',
    lot_size: '', session: 'london', setup_type: '', market_condition: 'Trending', tags: '',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/checklist').then((items) => {
      setTemplate(items);
      setChecks(Object.fromEntries(items.map((i) => [i.id, { checked: false, comment: '' }])));
    }).catch((e) => toast(e.message, 'error'));
  }, []);

  const completion = useMemo(() => {
    const total = template.reduce((s, i) => s + (i.weight || 1), 0);
    if (!total) return 0;
    const got = template.reduce((s, i) => s + (checks[i.id]?.checked ? (i.weight || 1) : 0), 0);
    return Math.round((got / total) * 1000) / 10;
  }, [template, checks]);

  const unmetRequired = template.filter((i) => i.required && !checks[i.id]?.checked);
  const rr = rrCalc({ entry: form.entry_price, stop: form.stop_loss, target: form.take_profit });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggle = (id) => setChecks({ ...checks, [id]: { ...checks[id], checked: !checks[id]?.checked } });
  const comment = (id, v) => setChecks({ ...checks, [id]: { ...checks[id], comment: v } });

  const submit = async (e) => {
    e.preventDefault();
    if (unmetRequired.length) { toast(`${unmetRequired.length} required checkpoint(s) unmet.`, 'error'); return; }
    setBusy(true);
    const num = (v) => (v === '' ? null : Number(v));
    const checklist = template.map((i) => ({
      item_id: i.id, text: i.text, weight: i.weight, required: i.required,
      checked: !!checks[i.id]?.checked, comment: checks[i.id]?.comment || null,
    }));
    try {
      const trade = await api.post('/trades', {
        ...form,
        opened_at: new Date(form.opened_at).toISOString(),
        entry_price: num(form.entry_price), stop_loss: num(form.stop_loss), take_profit: num(form.take_profit),
        risk_pct: num(form.risk_pct), account_balance: num(form.account_balance), lot_size: num(form.lot_size),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        checklist,
      });
      toast('Trade opened.'); nav(`/trades/${trade.id}`);
    } catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="stack">
      <div className="row between"><h1>New Trade</h1></div>

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        {/* Checklist gate */}
        <div className="card">
          <div className="row between">
            <h3>Pre-trade checklist</h3>
            <Ring value={completion} />
          </div>
          {template.length === 0 && <small className="muted">No checkpoints defined. Add some on the Checklist page.</small>}
          <div className="stack" style={{ gap: 10, marginTop: 8 }}>
            {template.map((i) => (
              <div key={i.id} className="card" style={{ background: 'var(--bg-elev)', padding: 12 }}>
                <label className="row" style={{ gap: 9, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!checks[i.id]?.checked} onChange={() => toggle(i.id)} />
                  <span>{i.text}</span>
                  <span style={{ marginLeft: 'auto' }} className={`badge ${i.required ? 'open' : 'tag'}`}>
                    {i.required ? 'Required' : `w${i.weight}`}
                  </span>
                </label>
                <input style={{ marginTop: 8 }} placeholder="Optional comment…"
                  value={checks[i.id]?.comment || ''} onChange={(e) => comment(i.id, e.target.value)} />
              </div>
            ))}
          </div>
          {unmetRequired.length > 0 && (
            <div className="neg" style={{ marginTop: 12, fontSize: 13 }}>
              ⚠ Blocked: {unmetRequired.length} required checkpoint(s) unmet.
            </div>
          )}
        </div>

        {/* Entry form */}
        <div className="card">
          <h3>Trade entry</h3>
          <div className="grid cols-2">
            <label className="field">Date &amp; time<input type="datetime-local" value={form.opened_at} onChange={set('opened_at')} /></label>
            <label className="field">Instrument<input value={form.instrument} onChange={set('instrument')} placeholder="XAUUSD" /></label>
            <label className="field">Direction
              <select value={form.direction} onChange={set('direction')}><option value="buy">Buy</option><option value="sell">Sell</option></select>
            </label>
            <label className="field">Session
              <select value={form.session} onChange={set('session')}>{SESSIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
            <label className="field">Entry price<input type="number" step="any" value={form.entry_price} onChange={set('entry_price')} /></label>
            <label className="field">Stop loss<input type="number" step="any" value={form.stop_loss} onChange={set('stop_loss')} /></label>
            <label className="field">Take profit<input type="number" step="any" value={form.take_profit} onChange={set('take_profit')} /></label>
            <label className="field">Risk %<input type="number" step="any" value={form.risk_pct} onChange={set('risk_pct')} /></label>
            <label className="field">Account balance<input type="number" step="any" value={form.account_balance} onChange={set('account_balance')} /></label>
            <label className="field">Lot size<input type="number" step="any" value={form.lot_size} onChange={set('lot_size')} /></label>
            <label className="field">Setup type<input value={form.setup_type} onChange={set('setup_type')} placeholder="Breakout, OB, FVG…" /></label>
            <label className="field">Market condition
              <select value={form.market_condition} onChange={set('market_condition')}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label className="field" style={{ gridColumn: '1 / -1' }}>Tags (comma separated)<input value={form.tags} onChange={set('tags')} placeholder="A+, scalp, news" /></label>
          </div>
          <div className="divider" />
          <div className="row between">
            <small className="muted">Planned R:R <strong style={{ color: 'var(--text)' }}>{rr.rr ?? '—'}</strong></small>
            <button className="btn btn-primary" disabled={busy || unmetRequired.length > 0} type="submit">
              {busy ? 'Saving…' : 'Open Trade'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
