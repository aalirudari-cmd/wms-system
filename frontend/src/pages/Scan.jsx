import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { Badge } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import Icon from '../components/Icon.jsx';

// The Scan station. Two input paths, both feeding one lookup:
//   1. Keyboard-wedge: warehouse PDA scanners act as keyboards and end with
//      Enter — the always-focused input captures those with zero setup.
//   2. Camera: uses the native BarcodeDetector API where the browser supports
//      it (modern Android Chrome). Falls back gracefully when unavailable.
export default function Scan() {
  const toast = useToast();
  const inputRef = useRef(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);   // { product, stock } | { notFound: code }
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [camOn, setCamOn] = useState(false);

  const cameraSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  const lookup = useCallback(async (raw) => {
    const value = String(raw).trim();
    if (!value) return;
    setBusy(true);
    try {
      const { data: product } = await api.get(`/products/barcode/${encodeURIComponent(value)}`);
      const { data: stock } = await api.get(`/products/${product.id}/stock`);
      setResult({ product, stock });
      setHistory((h) => [{ code: value, name: product.sku, ok: true, t: Date.now() }, ...h].slice(0, 8));
    } catch {
      setResult({ notFound: value });
      setHistory((h) => [{ code: value, ok: false, t: Date.now() }, ...h].slice(0, 8));
    } finally {
      setBusy(false);
      setCode('');
      inputRef.current?.focus();
    }
  }, []);

  // Keep the wedge input focused so handheld scanners always land here.
  useEffect(() => {
    inputRef.current?.focus();
  }, [result]);

  return (
    <div className="scan-grid">
      <div className="grid">
        {/* Scanner reticle — the station's signature element */}
        <div className="card scanner">
          {camOn && cameraSupported
            ? <CameraView onDetected={(v) => lookup(v)} onError={(m) => { toast.error(m); setCamOn(false); }} />
            : (
              <div className="reticle">
                <span className="corner tl" /><span className="corner tr" />
                <span className="corner bl" /><span className="corner br" />
                <div className="reticle-line" />
                <Icon name="scan" size={42} />
                <div className="reticle-hint mono">{busy ? 'LOOKING UP…' : 'READY TO SCAN'}</div>
              </div>
            )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); lookup(code); }}
          className="card card-pad"
        >
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Scan or type a barcode / SKU</label>
            <input
              ref={inputRef}
              className="input mono"
              style={{ fontSize: 18, padding: '14px 16px', letterSpacing: '.04em' }}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Point scanner here…"
              autoComplete="off" autoCapitalize="none" autoFocus
            />
          </div>
          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={busy} style={{ flex: 1 }}>
              <Icon name="search" size={16} /> Look up
            </button>
            {cameraSupported && (
              <button type="button" className={`btn ${camOn ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setCamOn((v) => !v)}>
                <Icon name="scan" size={16} /> {camOn ? 'Stop camera' : 'Camera'}
              </button>
            )}
          </div>
          {!cameraSupported && (
            <p className="muted" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
              Camera scanning isn't supported on this browser. Use a handheld scanner or type the code — both work here.
            </p>
          )}
        </form>

        {result && <ResultPanel result={result} onReset={() => { setResult(null); inputRef.current?.focus(); }} />}
      </div>

      {/* Recent scans */}
      <div className="card" style={{ alignSelf: 'start' }}>
        <div className="card-head"><Icon name="movements" size={18} /><h3>Recent scans</h3></div>
        {history.length === 0 ? (
          <div className="empty" style={{ padding: 28 }}><span className="muted mono" style={{ fontSize: 12 }}>No scans yet</span></div>
        ) : (
          <div style={{ padding: 8 }}>
            {history.map((h, i) => (
              <div key={i} className="between" style={{ padding: '9px 12px', borderBottom: i < history.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span className="mono" style={{ fontSize: 13 }}>{h.code}</span>
                {h.ok ? <Badge tone="green">{h.name}</Badge> : <Badge tone="red">No match</Badge>}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .scan-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 18px; align-items: start; }
        .scanner { background: var(--ink); padding: 26px; display: grid; place-items: center; min-height: 230px; overflow: hidden; }
        .reticle { position: relative; width: 240px; height: 150px; display: grid; place-items: center; color: var(--amber); }
        .reticle-hint { color: #c7d0dc; font-size: 11px; letter-spacing: .2em; margin-top: 12px; }
        .corner { position: absolute; width: 22px; height: 22px; border: 2.5px solid var(--amber); }
        .corner.tl { top: 0; left: 0; border-right: none; border-bottom: none; }
        .corner.tr { top: 0; right: 0; border-left: none; border-bottom: none; }
        .corner.bl { bottom: 0; left: 0; border-right: none; border-top: none; }
        .corner.br { bottom: 0; right: 0; border-left: none; border-top: none; }
        .reticle-line { position: absolute; left: 8px; right: 8px; height: 2px; background: var(--amber);
          box-shadow: 0 0 14px 2px rgba(242,100,12,.8); animation: sweep 2.2s ease-in-out infinite; }
        @keyframes sweep { 0%,100% { top: 12%; } 50% { top: 84%; } }
        .scan-cam { width: 100%; max-width: 360px; border-radius: var(--r); }
        @media (max-width: 900px) { .scan-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

function ResultPanel({ result, onReset }) {
  if (result.notFound) {
    return (
      <div className="card card-pad" style={{ borderColor: 'var(--red)' }}>
        <div className="row" style={{ color: 'var(--red)', marginBottom: 6 }}>
          <Icon name="alert" size={20} /><h3 style={{ color: 'var(--red)' }}>No match</h3>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Nothing in the catalog matches <b className="mono">{result.notFound}</b>. Check the code or add it under Products.
        </p>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} onClick={onReset}>Scan another</button>
      </div>
    );
  }

  const { product, stock } = result;
  const total = stock.reduce((s, r) => s + r.quantity, 0);
  const low = total <= product.reorder_point;

  return (
    <div className="card">
      <div className="card-head">
        <Icon name="check" size={18} style={{ color: 'var(--green)' }} />
        <h3>{product.name}</h3>
        <div className="topbar-spacer" />
        <Badge tone={low ? 'red' : 'green'}>{low ? 'Low stock' : 'In stock'}</Badge>
      </div>
      <div className="card-pad">
        <div className="row" style={{ gap: 24, flexWrap: 'wrap', marginBottom: 18 }}>
          <Field label="SKU" value={product.sku} mono />
          <Field label="Barcode" value={product.barcode || '—'} mono />
          <Field label="On hand" value={`${total} ${product.unit}`} />
          <Field label="Reorder at" value={product.reorder_point} />
        </div>
        <div className="section-title">Stock by location</div>
        {stock.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No stock currently held.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Location</th><th>Name</th><th className="t-num">Qty</th></tr></thead>
              <tbody>
                {stock.map((s) => (
                  <tr key={s.location_id}><td className="t-code">{s.code}</td><td>{s.name}</td><td className="t-num" style={{ fontWeight: 600 }}>{s.quantity}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={onReset}>Scan another</button>
      </div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className={mono ? 'mono' : ''} style={{ fontSize: 17, fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  );
}

// Camera scanning via the native BarcodeDetector API.
function CameraView({ onDetected, onError }) {
  const videoRef = useRef(null);

  useEffect(() => {
    let stream;
    let raf;
    let stopped = false;
    const detector = new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
    });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) { onDetected(codes[0].rawValue); return; }
          } catch { /* frame not ready; keep going */ }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        onError('Could not access the camera. Check permissions.');
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected, onError]);

  return <video ref={videoRef} className="scan-cam" muted playsInline />;
}
