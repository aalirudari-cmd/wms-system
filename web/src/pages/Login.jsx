import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Login() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: 'demo@journal.app', password: 'demo1234', fullName: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register({ email: form.email, password: form.password, fullName: form.fullName });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center-page">
      <div className="card" style={{ width: 380, maxWidth: '100%' }}>
        <div className="brand" style={{ paddingLeft: 0 }}><span className="brand-dot" /> TradeJournal</div>
        <p className="muted" style={{ marginTop: 0 }}>
          {mode === 'login' ? 'Sign in to your trading journal.' : 'Create your trading journal.'}
        </p>
        <form onSubmit={submit} className="stack" style={{ gap: 12 }}>
          {mode === 'register' && (
            <label className="field">Full name
              <input value={form.fullName} onChange={set('fullName')} placeholder="Jane Trader" />
            </label>
          )}
          <label className="field">Email
            <input type="email" value={form.email} onChange={set('email')} required />
          </label>
          <label className="field">Password
            <input type="password" value={form.password} onChange={set('password')} required />
          </label>
          {error && <div className="neg" style={{ fontSize: 13 }}>{error}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <div className="divider" />
        <small>
          {mode === 'login' ? "No account? " : 'Already registered? '}
          <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </a>
        </small>
        {mode === 'login' && <div><small className="muted">Demo: demo@journal.app / demo1234</small></div>}
      </div>
    </div>
  );
}
