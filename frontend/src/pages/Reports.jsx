import { useState } from 'react';
import { useFetch } from '../api/useFetch.js';
import { Spinner, Empty, Badge, BarChart } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

const TYPE_COLOR = { receipt: 'var(--green)', shipment: 'var(--blue)', adjustment: 'var(--amber)', transfer: 'var(--muted)' };

export default function Reports() {
  const [days, setDays] = useState(30);
  const soh = useFetch('/reports/stock-on-hand');
  const tp = useFetch(`/reports/throughput?days=${days}`, [days]);
  const movers = useFetch(`/reports/top-movers?days=${days}`, [days]);

  function exportCsv() {
    if (!soh.data) return;
    const header = ['SKU', 'Name', 'Category', 'Unit', 'On hand', 'Reorder', 'Below reorder'];
    const lines = soh.data.map((r) => [r.sku, r.name, r.category || '', r.unit, r.on_hand, r.reorder_point, r.below_reorder]);
    const csv = [header, ...lines].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `stock-on-hand-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid">
      <div className="toolbar">
        <span className="section-title" style={{ margin: 0 }}>Window</span>
        {[7, 30, 90].map((d) => (
          <button key={d} className={`btn btn-sm ${days === d ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setDays(d)}>{d} days</button>
        ))}
        <div className="topbar-spacer" />
        <button className="btn btn-ghost btn-sm" onClick={exportCsv}><Icon name="report" size={15} /> Export stock CSV</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
        {/* Throughput by type */}
        <div className="card">
          <div className="card-head"><Icon name="movements" size={18} /><h3>Throughput by type</h3></div>
          <div className="card-pad">
            {tp.loading ? <Spinner /> : tp.error ? <Empty icon="alert" title="Error">{tp.error}</Empty> : tp.data.rows.length === 0 ? (
              <Empty icon="movements" title="No movement" >Nothing recorded in this window.</Empty>
            ) : (
              <BarChart
                data={tp.data.rows.map((r) => ({ label: r.type.slice(0, 4), units: r.units, color: TYPE_COLOR[r.type] }))}
                series={[{ key: 'units', color: 'var(--amber)' }]}
                height={170}
              />
            )}
          </div>
        </div>

        {/* Top movers */}
        <div className="card">
          <div className="card-head"><Icon name="box" size={18} /><h3>Top movers</h3></div>
          {movers.loading ? <div className="card-pad"><Spinner /></div> : movers.data?.length === 0 ? (
            <Empty icon="box" title="No movement">Nothing moved in this window.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>SKU</th><th>Product</th><th className="t-num">Units moved</th></tr></thead>
                <tbody>
                  {movers.data?.map((m) => (
                    <tr key={m.sku}><td className="t-code">{m.sku}</td><td>{m.name}</td><td className="t-num" style={{ fontWeight: 600 }}>{m.units_moved}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Stock on hand */}
      <div className="card">
        <div className="card-head"><Icon name="layers" size={18} /><h3>Stock on hand</h3></div>
        {soh.loading ? <div className="card-pad"><Spinner /></div> : soh.error ? <Empty icon="alert" title="Error">{soh.error}</Empty> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>SKU</th><th>Product</th><th>Category</th><th className="t-num">On hand</th><th className="t-num">Reorder</th><th>Status</th></tr></thead>
              <tbody>
                {soh.data.map((r) => (
                  <tr key={r.sku}>
                    <td className="t-code">{r.sku}</td>
                    <td>{r.name}</td>
                    <td>{r.category || <span className="muted">—</span>}</td>
                    <td className="t-num" style={{ fontWeight: 600 }}>{r.on_hand} <span className="muted" style={{ fontWeight: 400 }}>{r.unit}</span></td>
                    <td className="t-num muted">{r.reorder_point}</td>
                    <td><Badge tone={r.below_reorder ? 'red' : 'green'}>{r.below_reorder ? 'Reorder' : 'OK'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
