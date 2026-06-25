import { useState } from 'react';
import { scoreColor } from '../lib/calc.js';

// Horizontal score bar with a value label.
export function ScoreBar({ label, value }) {
  return (
    <div>
      <div className="row between" style={{ marginBottom: 5 }}>
        <small>{label}</small>
        <strong style={{ color: scoreColor(value) }}>{value == null ? '—' : Math.round(value)}</strong>
      </div>
      <div className="score-bar">
        <div style={{ width: `${value || 0}%`, background: scoreColor(value) }} />
      </div>
    </div>
  );
}

// Circular completion ring (checklist %).
export function Ring({ value = 0, size = 72 }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="progress-ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth="7" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(value)} strokeWidth="7"
        strokeDasharray={c} strokeDashoffset={c - (c * (value || 0)) / 100} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fill="var(--text)" fontSize="15" fontWeight="700">
        {Math.round(value || 0)}%
      </text>
    </svg>
  );
}

// Click-to-zoom image with a lightbox overlay.
export function ZoomImage({ src, alt }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img className="img-thumb" src={src} alt={alt} onClick={() => setOpen(true)} />
      {open && (
        <div className="lightbox" onClick={() => setOpen(false)}>
          <img src={src} alt={alt} />
        </div>
      )}
    </>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}
