import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import Icon from '../components/Icon.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) { navigate('/', { replace: true }); return null; }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      {/* Left: the brand panel — a dark loading dock with a hi-vis scanline. */}
      <div className="login-brand">
        <div className="login-scanline" />
        <div className="login-brand-inner">
          <div className="brand-mark" style={{ width: 46, height: 46 }}>
            <Icon name="layers" size={26} />
          </div>
          <h1 className="login-title">Stockhaus</h1>
          <p className="login-tagline">
            Warehouse control terminal. Receive, store, pick and ship —
            every unit tracked from dock to door.
          </p>
          <div className="login-meta mono">
            <span><span className="dot" style={{ background: 'var(--amber)' }} /> SCAN-READY</span>
            <span><span className="dot" style={{ background: 'var(--green)' }} /> REAL-TIME STOCK</span>
            <span><span className="dot" style={{ background: '#7aa2ff' }} /> ROLE-BASED</span>
          </div>
        </div>
      </div>

      {/* Right: the sign-in form. */}
      <div className="login-form-wrap">
        <form className="login-form" onSubmit={onSubmit}>
          <div className="section-title">Sign in to continue</div>
          <h2 style={{ fontSize: 24, marginBottom: 22 }}>Welcome back</h2>

          {error && (
            <div className="login-error"><Icon name="alert" size={16} /> {error}</div>
          )}

          <div className="field">
            <label>Username</label>
            <input
              className="input mono" autoFocus value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin" autoCapitalize="none" autoComplete="username"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              className="input" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="current-password"
            />
          </div>

          <button className="btn btn-primary btn-block" disabled={busy} style={{ marginTop: 6 }}>
            {busy ? <span className="spinner" style={{ width: 16, height: 16, borderTopColor: '#fff' }} /> : <Icon name="logout" size={16} />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="login-hint mono">
            Demo: <b>admin</b>/admin123 · <b>manager</b>/manager123 · <b>worker</b>/worker123
          </div>
        </form>
      </div>

      <style>{`
        .login { min-height: 100vh; display: grid; grid-template-columns: 1.1fr 1fr; }
        .login-brand { position: relative; background: var(--ink); color: #fff; overflow: hidden; display: grid; align-items: center; }
        .login-brand::before { content: ''; position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
          background-size: 28px 28px; }
        .login-scanline { position: absolute; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, var(--amber), transparent);
          box-shadow: 0 0 18px 2px rgba(242,100,12,.7); animation: scan 4.5s ease-in-out infinite; }
        @keyframes scan { 0%,100% { top: 12%; } 50% { top: 88%; } }
        .login-brand-inner { position: relative; padding: 56px; max-width: 460px; }
        .login-title { font-size: 44px; margin: 22px 0 14px; letter-spacing: -.03em; }
        .login-tagline { color: #aab4c2; font-size: 15.5px; line-height: 1.6; max-width: 380px; }
        .login-meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 30px; font-size: 11px; letter-spacing: .1em; color: #c7d0dc; }
        .login-meta span { display: inline-flex; align-items: center; gap: 7px; }
        .login-form-wrap { display: grid; place-items: center; padding: 32px; background: var(--surface); }
        .login-form { width: 100%; max-width: 360px; }
        .login-error { display: flex; align-items: center; gap: 8px; background: var(--red-soft); color: var(--red);
          padding: 10px 12px; border-radius: var(--r-sm); font-size: 13px; margin-bottom: 16px; }
        .login-hint { margin-top: 20px; font-size: 11px; color: var(--muted); text-align: center; line-height: 1.7; }
        @media (max-width: 820px) { .login { grid-template-columns: 1fr; } .login-brand { display: none; } }
      `}</style>
    </div>
  );
}
