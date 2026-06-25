import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const links = [
  ['/', '📊', 'Dashboard'],
  ['/trades', '📒', 'Trades'],
  ['/trades/new', '➕', 'New Trade'],
  ['/checklist', '✅', 'Checklist'],
  ['/planning', '🗓️', 'Plans & Reviews'],
  ['/calculators', '🧮', 'Calculators'],
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const doLogout = () => { logout(); nav('/login'); };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="brand-dot" /> TradeJournal</div>
        {links.map(([to, ico, label]) => (
          <NavLink key={to} to={to} end={to === '/'} className="nav-link">
            <span className="ico">{ico}</span> {label}
          </NavLink>
        ))}
        <div className="sidebar-spacer" />
        <button className="btn btn-ghost" onClick={doLogout}>↩ Sign out</button>
      </aside>

      <div className="main">
        <nav className="mobile-bar">
          {links.map(([to, ico, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className="nav-link">{ico} {label}</NavLink>
          ))}
        </nav>
        <div className="topbar">
          <strong>Trading Checklist &amp; Journal</strong>
          <div className="row">
            <small>{user?.full_name || user?.email}</small>
            <button className="btn btn-sm btn-ghost" onClick={doLogout}>Sign out</button>
          </div>
        </div>
        <div className="content"><Outlet /></div>
      </div>
    </div>
  );
}
