import { useState } from 'react';
import { useFetch } from '../api/useFetch.js';
import { Spinner, Empty, Badge } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

const MOVE_TONE = { receipt: 'green', shipment: 'blue', adjustment: 'amber', transfer: 'gray' };
const TYPES = ['', 'receipt', 'shipment', 'adjustment', 'transfer'];

export default function Movements() {
  const [type, setType] = useState('');
  const { data: rows, loading, error } = useFetch(`/movements${type ? `?type=${type}` : ''}`, [type]);

  return (
    <div className="grid">
      <div className="toolbar">
        <div className="row" style={{ gap: 6 }}>
          {TYPES.map((t) => (
            <button
              key={t || 'all'}
              className={`btn btn-sm ${type === t ? 'btn-dark' : 'btn-ghost'}`}
              onClick={() => setType(t)}
            >
              {t ? t[0].toUpperCase() + t.slice(1) : 'All'}
            </button>
          ))}
        </div>
        <div className="topbar-spacer" />
        {rows && <span className="muted mono" style={{ fontSize: 12 }}>{rows.length} movements</span>}
      </div>

      {loading ? <Spinner label="Loading movements…" /> : error ? (
        <Empty icon="alert" title="Couldn't load movements">{error}</Empty>
      ) : rows.length === 0 ? (
        <div className="card"><Empty icon="movements" title="No movements">Nothing matches this filter.</Empty></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>When</th><th>Type</th><th>SKU</th><th>Product</th><th>Location</th><th className="t-num">Change</th><th>Reference</th><th>User</th></tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td className="muted mono" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(m.created_at).toLocaleString()}</td>
                    <td><Badge tone={MOVE_TONE[m.type]}>{m.type}</Badge></td>
                    <td className="t-code">{m.sku}</td>
                    <td>{m.product_name}</td>
                    <td className="t-code">{m.location_code}</td>
                    <td className="t-num" style={{ color: m.quantity_delta >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                      {m.quantity_delta >= 0 ? '+' : ''}{m.quantity_delta}
                    </td>
                    <td className="muted">{m.reference || '—'}</td>
                    <td className="muted">{m.user_name || 'system'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
