import { useEffect } from 'react';
import Icon from './Icon.jsx';

// Small shared primitives used across pages.

export function Spinner({ label }) {
  return (
    <div className="center-screen">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        {label && <div className="muted mono" style={{ fontSize: 12 }}>{label}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon = 'box', title, children }) {
  return (
    <div className="empty">
      <Icon name={icon} size={38} />
      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{title}</div>
      {children && <div style={{ fontSize: 13 }}>{children}</div>}
    </div>
  );
}

// Status badge maps a known status/level to a coloured chip.
const TONE = {
  posted: 'green', shipped: 'green', active: 'green',
  draft: 'amber', cancelled: 'gray',
  low: 'red', ok: 'green',
};
export function Badge({ children, tone }) {
  const t = tone || TONE[String(children).toLowerCase()] || 'gray';
  return <span className={`badge badge-${t}`}><span className="dot" />{children}</span>;
}

export function Modal({ title, onClose, children, footer, wide }) {
  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 720 } : undefined} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3 style={{ flex: 1 }}>{title}</h3>
          <button className="iconbtn" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// Stat tile for the dashboard.
export function Stat({ label, value, icon }) {
  return (
    <div className="stat">
      {icon && <span className="stat-icon"><Icon name={icon} /></span>}
      <div className="stat-label">{label}</div>
      <div className="stat-value mono">{value}</div>
    </div>
  );
}

// Lightweight dependency-free bar chart (SVG) for dashboard/reports.
export function BarChart({ data, series, height = 180 }) {
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.key] || 0)));
  const bw = 100 / data.length;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      {data.map((d, i) => {
        const groupX = i * bw;
        const innerW = bw / series.length;
        return series.map((s, j) => {
          const h = ((d[s.key] || 0) / max) * (height - 26);
          return (
            <rect
              key={s.key}
              x={groupX + j * innerW + innerW * 0.18}
              y={height - 20 - h}
              width={innerW * 0.64}
              height={Math.max(h, 0.5)}
              rx="1.2"
              fill={s.color}
            />
          );
        });
      })}
      {data.map((d, i) => (
        <text
          key={`l${i}`}
          x={i * bw + bw / 2}
          y={height - 6}
          fontSize="5"
          fill="var(--muted)"
          textAnchor="middle"
          fontFamily="var(--font-mono)"
        >
          {d.label}
        </text>
      ))}
    </svg>
  );
}
