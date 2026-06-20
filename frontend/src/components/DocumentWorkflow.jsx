import { useState } from 'react';
import { useFetch } from '../api/useFetch.js';
import { api } from '../api/client.js';
import { Spinner, Empty, Badge, Modal } from './ui.jsx';
import { useToast } from './Toast.jsx';
import Icon from './Icon.jsx';

// Drives both Receiving and Shipping. `cfg` supplies the labels, endpoint and
// the verb used to finalise a document (post / ship).
export default function DocumentWorkflow({ cfg }) {
  const { data: docs, loading, error, reload } = useFetch(cfg.endpoint);
  const [creating, setCreating] = useState(false);
  const [viewId, setViewId] = useState(null);

  return (
    <div className="grid">
      <div className="toolbar">
        <span className="muted mono" style={{ fontSize: 12 }}>{docs?.length || 0} {cfg.noun}s</span>
        <div className="topbar-spacer" />
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Icon name={cfg.icon} size={16} /> New {cfg.noun}
        </button>
      </div>

      {loading ? <Spinner label={`Loading ${cfg.noun}s…`} /> : error ? (
        <Empty icon="alert" title={`Couldn't load ${cfg.noun}s`}>{error}</Empty>
      ) : docs.length === 0 ? (
        <div className="card"><Empty icon={cfg.icon} title={`No ${cfg.noun}s yet`}>Create one to {cfg.verb} goods.</Empty></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Reference</th><th>{cfg.partyLabel}</th><th className="t-num">Lines</th>
                  <th className="t-num">Units</th><th>Status</th><th>Created by</th><th>Date</th><th></th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td className="t-code">{d.reference}</td>
                    <td>{d[cfg.partyField] || <span className="muted">—</span>}</td>
                    <td className="t-num">{d.line_count}</td>
                    <td className="t-num" style={{ fontWeight: 600 }}>{d.total_qty}</td>
                    <td><Badge>{d.status}</Badge></td>
                    <td className="muted">{d.created_by_name || '—'}</td>
                    <td className="muted mono" style={{ fontSize: 12 }}>{new Date(d.created_at).toLocaleDateString()}</td>
                    <td className="t-num"><button className="btn btn-ghost btn-sm" onClick={() => setViewId(d.id)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {creating && <CreateModal cfg={cfg} onClose={() => setCreating(false)} onDone={() => { setCreating(false); reload(); }} />}
      {viewId && <DetailModal cfg={cfg} id={viewId} onClose={() => setViewId(null)} onChanged={reload} />}
    </div>
  );
}

function CreateModal({ cfg, onClose, onDone }) {
  const toast = useToast();
  const { data: products } = useFetch('/products');
  const { data: locations } = useFetch('/locations');
  const [reference, setReference] = useState(cfg.suggestRef());
  const [party, setParty] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ product_id: '', location_id: '', quantity: '' }]);
  const [busy, setBusy] = useState(false);

  const setLine = (i, key, val) => setLines(lines.map((l, idx) => (idx === i ? { ...l, [key]: val } : l)));
  const addLine = () => setLines([...lines, { product_id: '', location_id: '', quantity: '' }]);
  const removeLine = (i) => setLines(lines.filter((_, idx) => idx !== i));

  async function save() {
    const clean = lines
      .filter((l) => l.product_id && l.location_id && l.quantity)
      .map((l) => ({ product_id: +l.product_id, location_id: +l.location_id, quantity: +l.quantity }));
    if (!reference.trim()) return toast.error('Enter a reference.');
    if (clean.length === 0) return toast.error('Add at least one valid line.');
    setBusy(true);
    try {
      await api.post(cfg.endpoint, { reference, [cfg.partyField]: party, notes, lines: clean });
      toast.success(`${cfg.Noun} ${reference} created as draft.`);
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`New ${cfg.noun}`}
      onClose={onClose}
      wide
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : `Create draft`}</button>
      </>}
    >
      <div className="form-row">
        <div className="field"><label>Reference</label><input className="input mono" value={reference} onChange={(e) => setReference(e.target.value)} /></div>
        <div className="field"><label>{cfg.partyLabel}</label><input className="input" value={party} onChange={(e) => setParty(e.target.value)} placeholder={cfg.partyPlaceholder} /></div>
      </div>

      <div className="section-title" style={{ marginTop: 8 }}>Lines</div>
      {lines.map((l, i) => (
        <div key={i} className="row" style={{ marginBottom: 8, gap: 8 }}>
          <select className="select" style={{ flex: 2 }} value={l.product_id} onChange={(e) => setLine(i, 'product_id', e.target.value)}>
            <option value="">Product…</option>
            {products?.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}
          </select>
          <select className="select" style={{ flex: 1.4 }} value={l.location_id} onChange={(e) => setLine(i, 'location_id', e.target.value)}>
            <option value="">Location…</option>
            {locations?.map((loc) => <option key={loc.id} value={loc.id}>{loc.code}</option>)}
          </select>
          <input className="input mono" style={{ width: 80 }} inputMode="numeric" placeholder="Qty" value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} />
          <button className="iconbtn" onClick={() => removeLine(i)} disabled={lines.length === 1} aria-label="Remove line"><Icon name="close" size={16} /></button>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={addLine}><Icon name="plus" size={15} /> Add line</button>

      <div className="field" style={{ marginTop: 16 }}>
        <label>Notes</label>
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}

function DetailModal({ cfg, id, onClose, onChanged }) {
  const toast = useToast();
  const { data: doc, loading, reload } = useFetch(`${cfg.endpoint}/${id}`, [id]);
  const [busy, setBusy] = useState(false);

  async function finalise() {
    setBusy(true);
    try {
      await api.post(`${cfg.endpoint}/${id}/${cfg.finalise}`);
      toast.success(`${cfg.Noun} ${doc.reference} ${cfg.finalisedWord}.`);
      reload();
      onChanged();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={doc ? `${cfg.Noun} ${doc.reference}` : `${cfg.Noun}`}
      onClose={onClose}
      wide
      footer={doc && doc.status === 'draft' ? (
        <>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={finalise} disabled={busy}>
            <Icon name="check" size={16} /> {busy ? 'Working…' : cfg.finaliseLabel}
          </button>
        </>
      ) : <button className="btn btn-ghost" onClick={onClose}>Close</button>}
    >
      {loading || !doc ? <Spinner /> : (
        <>
          <div className="between" style={{ marginBottom: 16 }}>
            <div>
              <Badge>{doc.status}</Badge>
              <span className="muted" style={{ marginLeft: 10 }}>{doc[cfg.partyField] || ''}</span>
            </div>
            <span className="muted mono" style={{ fontSize: 12 }}>{new Date(doc.created_at).toLocaleString()}</span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>SKU</th><th>Product</th><th>Location</th><th className="t-num">Qty</th></tr></thead>
              <tbody>
                {doc.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="t-code">{l.sku}</td>
                    <td>{l.product_name}</td>
                    <td className="t-code">{l.location_code}</td>
                    <td className="t-num" style={{ fontWeight: 600 }}>{l.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {doc.notes && <p className="muted" style={{ marginTop: 14 }}>{doc.notes}</p>}
          {doc.status === 'draft' && (
            <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
              <Icon name="alert" size={13} style={{ verticalAlign: '-2px' }} /> {cfg.finaliseHint}
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
