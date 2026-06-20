import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useFetch } from '../api/useFetch.js';
import Icon from './Icon.jsx';

// Handheld home: a stack of large, full-width colored action rows — the
// launcher pattern warehouse workers expect on a rugged PDA. Each row is one
// tap target sized for gloved fingers, with a live count badge where it helps.
const TILES = [
  { to: '/receiving', label: 'Receiving', sub: 'Book in inbound goods', icon: 'inbound', color: '#2563EB', role: 'worker', badge: (d) => d?.totals.open_receipts },
  { to: '/shipping', label: 'Shipping', sub: 'Pick & ship orders', icon: 'outbound', color: '#15A66B', role: 'worker', badge: (d) => d?.totals.open_shipments },
  { to: '/inventory', label: 'Inventory', sub: 'Stock on hand & moves', icon: 'layers', color: '#F2640C', role: 'worker', badge: (d) => d?.lowStock.length },
  { to: '/scan', label: 'Scan', sub: 'Look up by barcode', icon: 'scan', color: '#334155', role: 'worker' },
  { to: '/products', label: 'Products', sub: 'Catalog & barcodes', icon: 'box', color: '#7C3AED', role: 'worker' },
  { to: '/movements', label: 'Movements', sub: 'Stock audit trail', icon: 'movements', color: '#0D9488', role: 'worker' },
  { to: '/reports', label: 'Reports', sub: 'KPIs & CSV export', icon: 'report', color: '#E11D48', role: 'manager' },
  { to: '/users', label: 'Users', sub: 'Accounts & roles', icon: 'users', color: '#475569', role: 'admin' },
];

export default function MobileMenu() {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const { data } = useFetch('/dashboard');
  const tiles = TILES.filter((t) => can(t.role));
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <div>
      <div className="menu-head">
        <div className="menu-hello">Hi, {firstName}</div>
        <div className="menu-summary">
          {data
            ? `${data.totals.units_on_hand.toLocaleString()} units · ${data.totals.products} products · ${data.lowStock.length} low`
            : 'Loading warehouse status…'}
        </div>
      </div>

      <div className="menu-tiles">
        {tiles.map((t) => {
          const count = t.badge ? t.badge(data) : 0;
          return (
            <button key={t.to} className="menu-tile" style={{ '--tile': t.color }} onClick={() => navigate(t.to)}>
              <span className="menu-tile-ic"><Icon name={t.icon} size={24} /></span>
              <span className="menu-tile-tx">
                <span className="menu-tile-tt">{t.label}</span>
                <span className="menu-tile-sb">{t.sub}</span>
              </span>
              {count > 0 && <span className="menu-tile-badge">{count}</span>}
              <Icon name="chevron" size={20} className="menu-chev" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
