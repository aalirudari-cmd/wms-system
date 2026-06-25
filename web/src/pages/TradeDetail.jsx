import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import { ScoreBar, Ring, ZoomImage, Empty } from '../components/ui.jsx';
import { fmtMoney, fmtDate } from '../lib/calc.js';

const CATEGORIES = [['before', 'Before Entry'], ['during', 'During Trade'], ['after', 'After Exit']];

export default function TradeDetail() {
  const { id } = useParams();
  const toast = useToast();
  const nav = useNavigate();
  const [t, setT] = useState(null);
  const [journal, setJournal] = useState({});

  const load = () => api.get(`/trades/${id}`).then((data) => {
    setT(data);
    setJournal({
      status: data.status, result: data.result || '', profit_amount: data.profit_amount ?? '',
      profit_pct: data.profit_pct ?? '', emotions_before: data.emotions_before || '',
      emotions_during: data.emotions_during || '', emotions_after: data.emotions_after || '',
      what_went_well: data.what_went_well || '', what_went_wrong: data.what_went_wrong || '',
      improvements: data.improvements || '',
    });
  }).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, [id]);

  if (!t) return <div className="muted">Loading…</div>;
  const setJ = (k) => (e) => setJournal({ ...journal, [k]: e.target.value });

  const saveJournal = async () => {
    const num = (v) => (v === '' ? null : Number(v));
    try {
      await api.put(`/trades/${id}`, {
        ...journal,
        status: 'closed',
        result: journal.result || null,
        profit_amount: num(journal.profit_amount), profit_pct: num(journal.profit_pct),
        closed_at: new Date().toISOString(),
      });
      toast('Journal saved & re-analysed.'); load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const remove = async () => {
    if (!confirm('Delete this trade permanently?')) return;
    try { await api.del(`/trades/${id}`); toast('Trade deleted.'); nav('/trades'); }
    catch (err) { toast(err.message, 'error'); }
  };

  const review = t.ai_review;

  return (
    <div className="stack">
      <div className="row between wrap">
        <div className="row">
          <h1 style={{ margin: 0 }}>{t.instrument}</h1>
          <span className={`badge ${t.direction}`}>{t.direction}</span>
          <span className={`badge ${t.status === 'open' ? 'open' : 'tag'}`}>{t.status}</span>
          {t.result && <span className={`badge ${t.result}`}>{t.result}</span>}
        </div>
        <button className="btn btn-sm btn-danger" onClick={remove}>Delete</button>
      </div>
      <small className="muted">Opened {fmtDate(t.opened_at)} · {t.session || '—'} session · {t.setup_type || 'no setup'}</small>

      {/* Scores + entry snapshot */}
      <div className="grid cols-3" style={{ alignItems: 'start' }}>
        <div className="card stack">
          <div className="row between"><h3>Analysis</h3><Ring value={t.checklist_pct} /></div>
          <ScoreBar label="Discipline" value={t.discipline_score} />
          <ScoreBar label="Execution" value={t.execution_score} />
          <ScoreBar label="Risk Management" value={t.risk_score} />
          <ScoreBar label="Overall" value={t.overall_score} />
        </div>

        <div className="card">
          <h3>Entry</h3>
          <Facts rows={[
            ['Entry', t.entry_price], ['Stop loss', t.stop_loss], ['Take profit', t.take_profit],
            ['Planned R:R', t.planned_rr], ['Risk %', t.risk_pct ? `${t.risk_pct}%` : null],
            ['Lot size', t.lot_size], ['Balance', t.account_balance ? fmtMoney(t.account_balance) : null],
            ['Condition', t.market_condition],
          ]} />
          {t.tags?.length > 0 && <div className="row wrap" style={{ marginTop: 10 }}>{t.tags.map((tg) => <span key={tg} className="badge tag">{tg}</span>)}</div>}
        </div>

        <div className="card review-block">
          <h3>🤖 AI Review</h3>
          {!review ? <Empty>Analysis pending.</Empty> : (
            <div className="stack" style={{ gap: 8 }}>
              <div><span className={`badge ${review.planned ? 'win' : 'be'}`}>{review.planned ? 'Planned' : 'Impulsive risk'}</span></div>
              <p style={{ margin: 0 }}>{review.verdict}</p>
              <ReviewList title="What went well" cls="pos" items={review.good} />
              <ReviewList title="Key mistakes" cls="neg" items={review.mistakes} />
              <ReviewList title="Suggestions" cls="" items={review.suggestions} />
            </div>
          )}
        </div>
      </div>

      {/* Checklist snapshot */}
      <div className="card">
        <h3>Checklist snapshot</h3>
        <div className="stack" style={{ gap: 6 }}>
          {t.checklist.map((c) => (
            <div key={c.id} className="row between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
              <div className="row" style={{ gap: 8 }}>
                <span>{c.checked ? '✅' : '⬜'}</span>
                <span>{c.text}</span>
                {c.required && <span className="badge open">req</span>}
              </div>
              {c.comment && <small className="muted">{c.comment}</small>}
            </div>
          ))}
        </div>
      </div>

      {/* Images by category */}
      <div className="card">
        <h3>Screenshots</h3>
        <div className="grid cols-3" style={{ alignItems: 'start' }}>
          {CATEGORIES.map(([cat, label]) => (
            <ImageColumn key={cat} tradeId={id} category={cat} label={label}
              images={t.images.filter((i) => i.category === cat)} onChange={load} />
          ))}
        </div>
      </div>

      {/* Journal */}
      <div className="card">
        <h3>Trade Journal</h3>
        <div className="grid cols-3">
          <label className="field">Result
            <select value={journal.result} onChange={setJ('result')}>
              <option value="">—</option><option value="win">Win</option><option value="loss">Loss</option><option value="be">Break-even</option>
            </select>
          </label>
          <label className="field">Profit / Loss ($)<input type="number" step="any" value={journal.profit_amount} onChange={setJ('profit_amount')} /></label>
          <label className="field">Profit / Loss (%)<input type="number" step="any" value={journal.profit_pct} onChange={setJ('profit_pct')} /></label>
          <label className="field">Emotions before<textarea value={journal.emotions_before} onChange={setJ('emotions_before')} /></label>
          <label className="field">Emotions during<textarea value={journal.emotions_during} onChange={setJ('emotions_during')} /></label>
          <label className="field">Emotions after<textarea value={journal.emotions_after} onChange={setJ('emotions_after')} /></label>
          <label className="field">What went well?<textarea value={journal.what_went_well} onChange={setJ('what_went_well')} /></label>
          <label className="field">What went wrong?<textarea value={journal.what_went_wrong} onChange={setJ('what_went_wrong')} /></label>
          <label className="field">What will I improve?<textarea value={journal.improvements} onChange={setJ('improvements')} /></label>
        </div>
        <div className="divider" />
        <button className="btn btn-primary" onClick={saveJournal}>Save journal &amp; close trade</button>
      </div>
    </div>
  );
}

function ReviewList({ title, cls, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <strong className={cls}>{title}</strong>
      <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}

function Facts({ rows }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      {rows.filter(([, v]) => v != null && v !== '').map(([k, v]) => (
        <div key={k} className="row between"><small className="muted">{k}</small><strong>{v}</strong></div>
      ))}
    </div>
  );
}

function ImageColumn({ tradeId, category, label, images, onChange }) {
  const toast = useToast();
  const fileRef = useRef();
  const [meta, setMeta] = useState({ title: '', comment: '' });

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file); fd.append('category', category);
    fd.append('title', meta.title); fd.append('comment', meta.comment);
    try { await api.upload(`/images/trade/${tradeId}`, fd); setMeta({ title: '', comment: '' }); onChange(); toast('Image uploaded.'); }
    catch (err) { toast(err.message, 'error'); }
    finally { if (fileRef.current) fileRef.current.value = ''; }
  };

  const remove = async (imgId) => {
    try { await api.del(`/images/${imgId}`); onChange(); }
    catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div className="card" style={{ background: 'var(--bg-elev)' }}>
      <div className="chip-cat">{label}</div>
      <div className="stack" style={{ gap: 8 }}>
        {images.length === 0 && <small className="muted">No images yet.</small>}
        {images.map((img) => (
          <div key={img.id}>
            <ZoomImage src={img.url} alt={img.title || label} />
            {img.title && <strong style={{ fontSize: 13 }}>{img.title}</strong>}
            {img.comment && <div><small className="muted">{img.comment}</small></div>}
            <button className="btn btn-sm btn-danger btn-ghost" onClick={() => remove(img.id)}>Remove</button>
          </div>
        ))}
      </div>
      <div className="divider" />
      <input placeholder="Title" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} style={{ marginBottom: 6 }} />
      <input placeholder="Comment" value={meta.comment} onChange={(e) => setMeta({ ...meta, comment: e.target.value })} style={{ marginBottom: 6 }} />
      <input ref={fileRef} type="file" accept="image/*" onChange={upload} />
    </div>
  );
}
