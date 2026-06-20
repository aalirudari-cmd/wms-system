import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { NAV, BOTTOM_NAV } from './nav.js';
import Icon from './Icon.jsx';

function initials(name = '') {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
}

export default function Layout({ children }) {
  const { user, logout, can } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const visible = NAV.filter((n) => can(n.role));
  const current = [...visible].sort((a, b) => b.to.length - a.to.length)
    .find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));

  function onLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app">
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

      <aside className={`sidebar ${drawer ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Icon name="layers" size={20} /></div>
          <div>
            <div className="brand-name">Stockhaus</div>
            <div className="brand-sub">WMS Terminal</div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-label">Operations</div>
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setDrawer(false)}
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="userchip">
            <div className="avatar">{initials(user?.full_name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="userchip-name">{user?.full_name}</div>
              <div className="userchip-role">{user?.role}</div>
            </div>
            <button className="iconbtn" style={{ color: '#8b97a8' }} onClick={onLogout} aria-label="Sign out">
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="hamburger iconbtn" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Icon name="menu" size={22} />
          </button>
          <div>
            <h1>{current?.label || 'Stockhaus'}</h1>
          </div>
          <div className="topbar-spacer" />
          <NavLink to="/scan" className="btn btn-primary btn-sm">
            <Icon name="scan" size={16} /> Scan
          </NavLink>
        </header>

        <main className="content">{children}</main>
      </div>

      {/* Handheld / mobile bottom navigation */}
      <nav className="bottomnav">
        {BOTTOM_NAV.map((to) => {
          const item = NAV.find((n) => n.to === to);
          if (!item || !can(item.role)) return null;
          const active = item.end ? location.pathname === to : location.pathname.startsWith(to);
          return (
            <button
              key={to}
              className={`bn-item ${item.primary ? 'scan' : ''} ${active ? 'active' : ''}`}
              onClick={() => navigate(to)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
