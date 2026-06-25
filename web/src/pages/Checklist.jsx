import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import { Empty } from '../components/ui.jsx';

const blank = { text: '', weight: 1, required: false };

export default function Checklist() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(blank);
  const [editing, setEditing] = useState(null);

  const load = () => api.get('/checklist').then(setItems).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!draft.text.trim()) return;
    try {
      await api.post('/checklist', { ...draft, position: items.length });
      setDraft(blank); load(); toast('Checkpoint added.');
    } catch (err) { toast(err.message, 'error'); }
  };

  const save = async (item) => {
    try { await api.put(`/checklist/${item.id}`, item); setEditing(null); load(); toast('Saved.'); }
    catch (err) { toast(err.message, 'error'); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this checkpoint? Past trades keep their snapshot.')) return;
    try { await api.del(`/checklist/${id}`); load(); toast('Deleted.'); }
    catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div className="stack">
      <div className="row between">
        <div><h1>Trading Checklist</h1><small className="muted">Define the checkpoints validated before every trade. Required items block opening a trade.</small></div>
      </div>

      <div className="card">
        <h3>Add checkpoint</h3>
        <form onSubmit={add} className="row wrap" style={{ alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: 2, minWidth: 220 }}>Question / checkpoint
            <input value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} placeholder="e.g. Trend aligned on HTF" />
          </label>
          <label className="field" style={{ width: 110 }}>Weight
            <input type="number" min="1" value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) })} />
          </label>
          <label className="field" style={{ width: 120 }}>Required
            <select value={draft.required ? '1' : '0'} onChange={(e) => setDraft({ ...draft, required: e.target.value === '1' })}>
              <option value="0">Optional</option>
              <option value="1">Required</option>
            </select>
          </label>
          <button className="btn btn-primary" type="submit">Add</button>
        </form>
      </div>

      <div className="card">
        {items.length === 0 ? <Empty>No checkpoints yet. Add your first above.</Empty> : (
          <table>
            <thead><tr><th>Checkpoint</th><th style={{ width: 90 }}>Weight</th><th style={{ width: 110 }}>Type</th><th style={{ width: 160 }}></th></tr></thead>
            <tbody>
              {items.map((it) => editing === it.id ? (
                <tr key={it.id}>
                  <td><input value={it.text} onChange={(e) => setItems(items.map((x) => x.id === it.id ? { ...x, text: e.target.value } : x))} /></td>
                  <td><input type="number" min="1" value={it.weight} onChange={(e) => setItems(items.map((x) => x.id === it.id ? { ...x, weight: Number(e.target.value) } : x))} /></td>
                  <td>
                    <select value={it.required ? '1' : '0'} onChange={(e) => setItems(items.map((x) => x.id === it.id ? { ...x, required: e.target.value === '1' } : x))}>
                      <option value="0">Optional</option><option value="1">Required</option>
                    </select>
                  </td>
                  <td><div className="row"><button className="btn btn-sm btn-primary" onClick={() => save(it)}>Save</button><button className="btn btn-sm btn-ghost" onClick={() => { setEditing(null); load(); }}>Cancel</button></div></td>
                </tr>
              ) : (
                <tr key={it.id}>
                  <td>{it.text}</td>
                  <td>{it.weight}</td>
                  <td>{it.required ? <span className="badge open">Required</span> : <span className="badge tag">Optional</span>}</td>
                  <td><div className="row"><button className="btn btn-sm btn-ghost" onClick={() => setEditing(it.id)}>Edit</button><button className="btn btn-sm btn-danger" onClick={() => remove(it.id)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
