import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import { fmtDay } from '../lib/calc.js';

const KINDS = [
  ['daily_plan', 'Daily Trading Plan', 'Bias, key levels, watchlist, max trades, rules for today…'],
  ['weekly_review', 'Weekly Review', 'What worked, recurring mistakes, stats, focus for next week…'],
  ['monthly_review', 'Monthly Review', 'Equity progress, discipline trends, goals for next month…'],
];

export default function Planning() {
  return (
    <div className="stack">
      <h1>Plans &amp; Reviews</h1>
      <div className="grid cols-3" style={{ alignItems: 'start' }}>
        {KINDS.map(([kind, label, placeholder]) => (
          <NoteEditor key={kind} kind={kind} label={label} placeholder={placeholder} />
        ))}
      </div>
    </div>
  );
}

function NoteEditor({ kind, label, placeholder }) {
  const toast = useToast();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState('');
  const [history, setHistory] = useState([]);

  const load = () => api.get(`/notes?kind=${kind}`).then((rows) => {
    setHistory(rows);
    const todays = rows.find((r) => r.note_date.slice(0, 10) === date);
    setContent(todays?.content || '');
  }).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, [date]);

  const save = async () => {
    try { await api.put('/notes', { kind, note_date: date, content }); toast('Saved.'); load(); }
    catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div className="card stack">
      <h3>{label}</h3>
      <label className="field">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <textarea style={{ minHeight: 180 }} placeholder={placeholder} value={content} onChange={(e) => setContent(e.target.value)} />
      <button className="btn btn-primary" onClick={save}>Save</button>
      {history.length > 0 && (
        <div>
          <small className="muted">Recent entries</small>
          <div className="stack" style={{ gap: 4, marginTop: 6 }}>
            {history.slice(0, 6).map((h) => (
              <a key={h.id} href="#" onClick={(e) => { e.preventDefault(); setDate(h.note_date.slice(0, 10)); }} className="muted" style={{ fontSize: 12 }}>
                {fmtDay(h.note_date)}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
