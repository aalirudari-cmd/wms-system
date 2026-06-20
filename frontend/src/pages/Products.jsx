import { useState } from 'react';
import { useFetch } from '../api/useFetch.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Spinner, Empty, Badge, Modal } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import Icon from '../components/Icon.jsx';

const BLANK = { sku: '', barcode: '', name: '', category: '', unit: 'EA', reorder_point: 0, description: '' };

export default function Products() {
  const { can } = useAuth();
  const [query, setQuery] = useState('');
  const { data: products, loading, error, reload } = useFetch(
    `/products${query ? `?q=${encodeURIComponent(query)}` : ''}`, [query]
  );
  const [editing, setEditing] = useState(null);
  const canEdit = can('manager');

  return (
    <div className="grid">
      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input className="input" placeholder="Search SKU, name, barcode or category…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="topbar-spacer" />
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setEditing(BLANK)}>
            <Icon name="plus" size={16} /> New product
          </button>
        )}
      </div>

      {loading ? <Spinner label="Loading catalog…" /> : error ? (
        <Empty icon="alert" title="Couldn't load products">{error}</Empty>
      ) : (
        <div className="card">
          {products.length === 0 ? (
            <Empty icon="box" title="No products" >{canEdit ? 'Add your first product to get started.' : 'Nothing matches your search.'}</Empty>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>SKU</th><th>Barcode</th><th>Product</th><th>Category</th><th className="t-num">On hand</th><th className="t-num">Reorder</th>{canEdit && <th></th>}</tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="t-code">{p.sku}</td>
                      <td className="t-code muted">{p.barcode || '—'}</td>
                      <td>{p.name}</td>
                      <td>{p.category ? <span className="badge badge-gray">{p.category}</span> : <span className="muted">—</span>}</td>
                      <td className="t-num" style={{ fontWeight: 600 }}>{p.on_hand} <span className="muted" style={{ fontWeight: 400 }}>{p.unit}</span></td>
                      <td className="t-num muted">{p.reorder_point}</td>
                      {canEdit && <td className="t-num"><button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}>Edit</button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {editing && <ProductModal product={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function ProductModal({ product, onClose, onDone }) {
  const toast = useToast();
  const isNew = !product.id;
  const [form, setForm] = useState({ ...BLANK, ...product });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    if (!form.sku || !form.name) return toast.error('SKU and name are required.');
    setBusy(true);
    try {
      const body = { ...form, reorder_point: parseInt(form.reorder_point, 10) || 0 };
      if (isNew) await api.post('/products', body);
      else await api.patch(`/products/${product.id}`, body);
      toast.success(isNew ? 'Product created.' : 'Product updated.');
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${product.sku}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.delete(`/products/${product.id}`);
      toast.success('Product deleted.');
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={isNew ? 'New product' : `Edit ${product.sku}`}
      onClose={onClose}
      wide
      footer={<>
        {!isNew && <button className="btn btn-danger" onClick={remove} disabled={busy} style={{ marginRight: 'auto' }}>Delete</button>}
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </>}
    >
      <div className="form-row">
        <div className="field"><label>SKU</label><input className="input mono" value={form.sku} onChange={set('sku')} disabled={!isNew} /></div>
        <div className="field"><label>Barcode</label><input className="input mono" value={form.barcode || ''} onChange={set('barcode')} /></div>
      </div>
      <div className="field"><label>Name</label><input className="input" value={form.name} onChange={set('name')} /></div>
      <div className="form-row">
        <div className="field"><label>Category</label><input className="input" value={form.category || ''} onChange={set('category')} /></div>
        <div className="field"><label>Unit</label><input className="input mono" value={form.unit || 'EA'} onChange={set('unit')} /></div>
      </div>
      <div className="form-row">
        <div className="field"><label>Reorder point</label><input className="input mono" inputMode="numeric" value={form.reorder_point} onChange={set('reorder_point')} /></div>
        <div />
      </div>
      <div className="field"><label>Description</label><textarea className="input" rows={3} value={form.description || ''} onChange={set('description')} /></div>
    </Modal>
  );
}
