import { useState } from 'react';
import { riskCalc, rrCalc, fmtMoney } from '../lib/calc.js';

export default function Calculators() {
  return (
    <div className="stack">
      <h1>Calculators</h1>
      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <RiskCalculator />
        <RRCalculator />
      </div>
    </div>
  );
}

function RiskCalculator() {
  const [f, setF] = useState({ balance: 10000, riskPct: 1, entry: 2000, stop: 1990, pipValue: 1 });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const out = riskCalc({
    balance: Number(f.balance), riskPct: Number(f.riskPct), entry: Number(f.entry),
    stop: Number(f.stop), pipValue: Number(f.pipValue), unitsPerLot: 1,
  });
  return (
    <div className="card stack">
      <h3>Risk Calculator</h3>
      <small className="muted">How much capital is at risk and a suggested size for your stop distance.</small>
      <div className="grid cols-2">
        <label className="field">Account balance<input type="number" value={f.balance} onChange={set('balance')} /></label>
        <label className="field">Risk %<input type="number" step="any" value={f.riskPct} onChange={set('riskPct')} /></label>
        <label className="field">Entry price<input type="number" step="any" value={f.entry} onChange={set('entry')} /></label>
        <label className="field">Stop price<input type="number" step="any" value={f.stop} onChange={set('stop')} /></label>
        <label className="field">Value per point / unit<input type="number" step="any" value={f.pipValue} onChange={set('pipValue')} /></label>
      </div>
      <div className="divider" />
      <div className="row between"><span className="muted">Risk amount</span><strong className="neg">{fmtMoney(out.riskAmount)}</strong></div>
      <div className="row between"><span className="muted">Stop distance</span><strong>{out.stopDistance}</strong></div>
      <div className="row between"><span className="muted">Suggested size</span><strong className="pos">{out.suggestedLots ?? '—'}</strong></div>
    </div>
  );
}

function RRCalculator() {
  const [f, setF] = useState({ entry: 2000, stop: 1990, target: 2030 });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const out = rrCalc({ entry: Number(f.entry), stop: Number(f.stop), target: Number(f.target) });
  return (
    <div className="card stack">
      <h3>Reward : Risk Calculator</h3>
      <small className="muted">Evaluate a setup before committing.</small>
      <div className="grid cols-3">
        <label className="field">Entry<input type="number" step="any" value={f.entry} onChange={set('entry')} /></label>
        <label className="field">Stop<input type="number" step="any" value={f.stop} onChange={set('stop')} /></label>
        <label className="field">Target<input type="number" step="any" value={f.target} onChange={set('target')} /></label>
      </div>
      <div className="divider" />
      <div className="row between"><span className="muted">Risk</span><strong>{out.risk}</strong></div>
      <div className="row between"><span className="muted">Reward</span><strong>{out.reward}</strong></div>
      <div className="row between"><span className="muted">Reward : Risk</span>
        <strong style={{ color: out.rr >= 2 ? 'var(--green)' : out.rr >= 1 ? 'var(--amber)' : 'var(--red)' }}>{out.rr ?? '—'} : 1</strong>
      </div>
    </div>
  );
}
