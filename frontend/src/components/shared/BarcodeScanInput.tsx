import { useEffect, useRef, useState } from 'react';
import { ScanLine } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

/**
 * Feeds both keyboard-wedge hardware scanners (Zebra/Honeywell ring
 * scanners act as keyboards and send Enter) and the browser's native
 * BarcodeDetector camera API into one onScan callback. Stays focused so a
 * PDA operator never has to tap the field before scanning.
 */
export function BarcodeScanInput({
  onScan,
  placeholder = 'Scan or enter barcode…',
  autoFocus = true,
}: {
  onScan: (code: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState('');
  const [cameraSupported, setCameraSupported] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCameraSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window);
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function submit() {
    const code = value.trim();
    if (!code) return;
    onScan(code);
    setValue('');
  }

  async function scanWithCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'code_128', 'qr_code', 'upc_a'] });
      const interval = setInterval(async () => {
        try {
          const codes = await detector.detect(video);
          if (codes[0]) {
            clearInterval(interval);
            stream.getTracks().forEach((t) => t.stop());
            onScan(codes[0].rawValue);
          }
        } catch {
          /* keep trying until the video feed is ready */
        }
      }, 300);
      setTimeout(() => {
        clearInterval(interval);
        stream.getTracks().forEach((t) => t.stop());
      }, 15000);
    } catch {
      // Camera unavailable/denied — the keyboard-wedge input still works.
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        onBlur={() => autoFocus && setTimeout(() => inputRef.current?.focus(), 50)}
        className="h-12 text-base"
      />
      {cameraSupported && (
        <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={scanWithCamera} aria-label="Scan with camera">
          <ScanLine className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
