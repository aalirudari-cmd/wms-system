import { useFetch } from '../api/useFetch.js';
import { Stat, Spinner, Badge, BarChart, Empty } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

const MOVE_TONE = { receipt: 'green', shipment: 'blue', adjustment: 'amber', transfer: 'gray' };

export default function Dashboard() {
  const { data, loading, error } = useFetch('/dashboard');

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (error) return <Empty icon="alert" title="Couldn't load the dashboard">{error}</Empty>;

  const { totals, lowStock, recentMovements, throughput } = data;

  return (
    <div className="grid">
      <div className="stats">
        <Stat label="Units on hand" value={totals.units_on_hand.toLocaleString()} icon="layers" />
        <Stat label="Products" value={totals.products} icon="box" />
        <Stat label="Active locations" value={totals.locations} icon="location" />
        <Stat label="Open receipts" value={totals.open_receipts} icon="inbound" />
        <Stat label="Open shipments" value={totals.open_shipments} icon="outbound" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)' }}>
        {/* Throughput chart */}
        <div className="card">
          <div className="card-head">
            <Icon name="movements" size={18} />
            <h3>Throughput · last 7 days</h3>
            <div className="topbar-spacer" />
            <span className="badge badge-green"><span className="dot" />Inbound</span>
            <span className="badge badge-blue"><span className="dot" />Outbound</span>
          </div>
          <div className="card-pad">
            <BarChart
              data={throughput}
              series={[
                { key: 'inbound', color: 'var(--green)' },
                { key: 'outbound', color: 'var(--blue)' },
              ]}
            />
          </div>
        </div>

        {/* Low stock */}
        <div className="card">
          <div className="card-head">
            <Icon name="alert" size={18} />
            <h3>Low stock</h3>
          </div>
          {lowStock.length === 0 ? (
            <Empty icon="check" title="All stocked up">Nothing is at or below its reorder point.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>SKU</th><th>Product</th><th className="t-num">On hand</th><th className="t-num">Reorder</th></tr></thead>
                <tbody>
                  {lowStock.map((p) => (
                    <tr key={p.id}>
                      <td className="t-code">{p.sku}</td>
                      <td>{p.name}</td>
                      <td className="t-num"><Badge tone={p.on_hand <= p.reorder_point ? 'red' : 'green'}>{p.on_hand}</Badge></td>
                      <td className="t-num muted">{p.reorder_point}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="card-head"><Icon name="movements" size={18} /><h3>Recent activity</h3></div>
        {recentMovements.length === 0 ? (
          <Empty icon="movements" title="No movements yet">Receive or ship goods to see activity here.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Type</th><th>SKU</th><th>Product</th><th>Location</th><th className="t-num">Change</th><th>Reference</th><th>When</th></tr>
              </thead>
              <tbody>
                {recentMovements.map((m) => (
                  <tr key={m.id}>
                    <td><Badge tone={MOVE_TONE[m.type]}>{m.type}</Badge></td>
                    <td className="t-code">{m.sku}</td>
                    <td>{m.product_name}</td>
                    <td className="t-code">{m.location_code}</td>
                    <td className="t-num" style={{ color: m.quantity_delta >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                      {m.quantity_delta >= 0 ? '+' : ''}{m.quantity_delta}
                    </td>
                    <td className="muted">{m.reference || '—'}</td>
                    <td className="muted mono" style={{ fontSize: 12 }}>{new Date(m.created_at).toLocaleString()}</td>
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
