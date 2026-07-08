import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../components/ui/toast';
import { BarcodeScanInput } from '../components/shared/BarcodeScanInput';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { submitOrQueue } from './offlineQueue';

interface ReceiptLine {
  id: number;
  quantityExpected: string;
  quantityReceived: string;
  locationId?: number;
  product: { sku: string; name: string };
}
interface Receipt {
  id: number;
  receiptNumber: string;
  status: string;
  lines: ReceiptLine[];
}

export function PdaReceivingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scannedLocation, setScannedLocation] = useState<Record<number, { id: number; code: string }>>({});
  const [quantities, setQuantities] = useState<Record<number, string>>({});

  const list = useQuery({
    queryKey: ['/receiving', 'pda'],
    queryFn: () => api.get('/receiving', { params: { pageSize: 25 } }).then((r) => (r.data.items as Receipt[]).filter((rc) => ['WAITING', 'RECEIVING'].includes(rc.status))),
  });

  async function onScanLocation(lineId: number, code: string) {
    try {
      const location = await api.get(`/locations/scan/${encodeURIComponent(code)}`).then((r) => r.data);
      setScannedLocation((prev) => ({ ...prev, [lineId]: { id: location.id, code: location.code } }));
    } catch {
      toast({ title: 'Location not found', variant: 'destructive' });
    }
  }

  async function confirmLine(receiptId: number, line: ReceiptLine) {
    const location = scannedLocation[line.id];
    const qty = Number(quantities[line.id]);
    if (!location || !qty) return;
    const result = await submitOrQueue({
      method: 'patch',
      url: `/receiving/lines/${line.id}`,
      body: { locationId: location.id, quantityReceived: qty },
      label: `Receive ${line.product.sku} → ${location.code}`,
    });
    toast({ title: result === 'submitted' ? 'Line updated' : 'Queued (offline) — will sync', variant: 'success' });
    queryClient.invalidateQueries({ queryKey: ['/receiving'] });
  }

  const pendingLines = (list.data ?? []).flatMap((r) => r.lines.filter((l) => Number(l.quantityReceived) < Number(l.quantityExpected)).map((l) => ({ receiptId: r.id, receiptNumber: r.receiptNumber, line: l })));

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-lg font-semibold">Receive</h1>
      {pendingLines.length === 0 && <p className="text-sm text-muted-foreground">No open receipt lines.</p>}
      {pendingLines.map(({ receiptId, receiptNumber, line }) => (
        <Card key={line.id}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{receiptNumber}</p>
            <p className="font-semibold">{line.product.sku}</p>
            <p className="text-sm text-muted-foreground">{line.product.name} · expects {line.quantityExpected}</p>
            <div className="mt-3">
              <BarcodeScanInput placeholder="Scan staging location…" onScan={(code) => onScanLocation(line.id, code)} autoFocus={false} />
              {scannedLocation[line.id] && <p className="mt-1 text-xs text-success">Location: {scannedLocation[line.id].code}</p>}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                type="number"
                placeholder="Qty received"
                className="h-12 text-base"
                value={quantities[line.id] ?? ''}
                onChange={(e) => setQuantities((prev) => ({ ...prev, [line.id]: e.target.value }))}
              />
              <Button size="pda" disabled={!scannedLocation[line.id] || !quantities[line.id]} onClick={() => confirmLine(receiptId, line)}>
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
