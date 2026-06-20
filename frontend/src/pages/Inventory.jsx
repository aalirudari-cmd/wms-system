import { useMemo, useState } from 'react';
import { useFetch } from '../api/useFetch.js';
import { api } from '../api/client.js';
import { Spinner, Empty, Badge, Modal } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import Icon from '../components/Icon.jsx';

export default function Inventory() {
  const { data: rows, loading, error, reload } = useFetch('/inventory');
  const [query, setQuery] = useState('');
  const [adjust, setAdjust] = useState(null);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.sku, r.name, r.location_code, r.location_name].some((v) => v?.toLowerCase().includes(q))
    );
  }, [rows, query]);

  if (loading) return <Spinner label="Loading stock…" />;
  if (error) return <Empty icon="alert" title="Couldn't load inventory">{error}</Empty>;

  const totalUnits = filtered.reduce((s, r) => s + r.quantity, 0);

  return (
    <div className="grid">
      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input className="input" placeholder="Search SKU, product or location…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <span className="muted mono" style={{ fontSize: 12 }}>
          {filtered.length} rows · {totalUnits.toLocaleString()} units
        </span>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <Empty icon="layers" title="No stock found">Try a different search, or receive goods first.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>SKU</th><th>Product</th><th>Location</th><th className="t-num">Qty</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const low = r.quantity <= r.reorder_point;
                  return (
                    <tr key={r.id}>
                      <td className="t-code">{r.sku}</td>
                      <td>{r.name}</td>
                      <td><span className="t-code">{r.location_code}</span> <span className="muted" style={{ fontSize: 12 }}>{r.location_name}</span></td>
                      <td className="t-num" style={{ fontWeight: 600 }}>{r.quantity} <span className="muted" style={{ fontWeight: 400 }}>{r.unit}</span></td>
                      <td><Badge tone={low ? 'red' : 'green'}>{low ? 'Low' : 'OK'}</Badge></td>
                      <td className="t-num">
                        <button className="btn btn-ghost btn-sm" onClick={() => setAdjust(r)}>Adjust</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adjust && <AdjustModal row={adjust} onClose={() => setAdjust(null)} onDone={() => { setAdjust(null); reload(); }} />}
    </div>
  );
}

function AdjustModal({ row, onClose, onDone }) {
  const toast = useToast();
  const [delta, setDelta] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const n = parseInt(delta, 10);
    if (!Number.isInteger(n) || n === 0) return toast.error('Enter a non-zero whole number.');
    setBusy(true);
    try {
      await api.post('/inventory/adjust', {
        product_id: row.product_id, location_id: row.location_id, delta: n, reference,
      });
      toast.success(`Adjusted ${row.sku} by ${n > 0 ? '+' : ''}${n}.`);
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Adjust stock"
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Apply adjustment'}</button>
      </>}
    >
      <p className="muted" style={{ marginTop: 0 }}>
        <b className="mono">{row.sku}</b> · {row.name}<br />
        at <b className="mono">{row.location_code}</b> — currently <b>{row.quantity} {row.unit}</b>
      </p>
      <div className="field">
        <label>Change (use a negative number to remove)</label>
        <input className="input mono" inputMode="numeric" placeholder="e.g. -3 or 10" value={delta} onChange={(e) => setDelta(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label>Reason / reference</label>
        <input className="input" placeholder="Cycle count, damage, correction…" value={reference} onChange={(e) => setReference(e.target.value)} />
      </div>
    </Modal>
  );
}
