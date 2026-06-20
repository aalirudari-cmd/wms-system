import { useState } from 'react';
import { useFetch } from '../api/useFetch.js';
import { api } from '../api/client.js';
import { Spinner, Empty, Badge, Modal } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import Icon from '../components/Icon.jsx';

const ROLE_TONE = { admin: 'amber', manager: 'blue', worker: 'gray' };
const BLANK = { username: '', full_name: '', role: 'worker', password: '' };

export default function Users() {
  const { data: users, loading, error, reload } = useFetch('/users');
  const [editing, setEditing] = useState(null);

  return (
    <div className="grid">
      <div className="toolbar">
        <span className="muted mono" style={{ fontSize: 12 }}>{users?.length || 0} users</span>
        <div className="topbar-spacer" />
        <button className="btn btn-primary" onClick={() => setEditing(BLANK)}><Icon name="plus" size={16} /> New user</button>
      </div>

      {loading ? <Spinner label="Loading users…" /> : error ? (
        <Empty icon="alert" title="Couldn't load users">{error}</Empty>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Status</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="t-code">{u.username}</td>
                    <td>{u.full_name}</td>
                    <td><Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge></td>
                    <td><Badge tone={u.active ? 'green' : 'gray'}>{u.active ? 'Active' : 'Disabled'}</Badge></td>
                    <td className="muted mono" style={{ fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="t-num"><button className="btn btn-ghost btn-sm" onClick={() => setEditing(u)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && <UserModal user={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function UserModal({ user, onClose, onDone }) {
  const toast = useToast();
  const isNew = !user.id;
  const [form, setForm] = useState({ ...BLANK, ...user, password: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    if (isNew && (!form.username || !form.full_name || !form.password)) {
      return toast.error('Username, name and password are required.');
    }
    setBusy(true);
    try {
      if (isNew) {
        await api.post('/users', form);
      } else {
        const body = { full_name: form.full_name, role: form.role, active: form.active };
        if (form.password) body.password = form.password;
        await api.patch(`/users/${user.id}`, body);
      }
      toast.success(isNew ? 'User created.' : 'User updated.');
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={isNew ? 'New user' : `Edit ${user.username}`}
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </>}
    >
      <div className="form-row">
        <div className="field"><label>Username</label><input className="input mono" value={form.username} onChange={set('username')} disabled={!isNew} autoCapitalize="none" /></div>
        <div className="field"><label>Full name</label><input className="input" value={form.full_name} onChange={set('full_name')} /></div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Role</label>
          <select className="select" value={form.role} onChange={set('role')}>
            <option value="worker">Worker — receive, ship, adjust</option>
            <option value="manager">Manager — + catalog & reports</option>
            <option value="admin">Admin — + user management</option>
          </select>
        </div>
        {!isNew && (
          <div className="field">
            <label>Status</label>
            <select className="select" value={form.active ? '1' : '0'} onChange={(e) => setForm({ ...form, active: e.target.value === '1' })}>
              <option value="1">Active</option>
              <option value="0">Disabled</option>
            </select>
          </div>
        )}
      </div>
      <div className="field">
        <label>{isNew ? 'Password' : 'New password (leave blank to keep)'}</label>
        <input className="input" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
      </div>
    </Modal>
  );
}
