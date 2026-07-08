import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../components/ui/toast';
import { BarcodeScanInput } from '../components/shared/BarcodeScanInput';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { submitOrQueue } from './offlineQueue';

interface Task {
  id: number;
  quantity: string;
  product: { sku: string; name: string };
  suggestedLocation?: { code: string };
}

export function PdaPutAwayPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  const list = useQuery({
    queryKey: ['/putaway', 'pda'],
    queryFn: () => api.get('/putaway', { params: { status: 'PENDING', pageSize: 25 } }).then((r) => r.data.items as Task[]),
  });

  async function onScanLocation(taskId: number, code: string) {
    try {
      const location = await api.get(`/locations/scan/${encodeURIComponent(code)}`).then((r) => r.data);
      const result = await submitOrQueue({
        method: 'post',
        url: `/putaway/${taskId}/confirm`,
        body: { actualLocationId: location.id },
        label: `Put away task #${taskId} → ${location.code}`,
      });
      toast({ title: result === 'submitted' ? 'Put away confirmed' : 'Queued (offline) — will sync', variant: 'success' });
      setActiveTaskId(null);
      queryClient.invalidateQueries({ queryKey: ['/putaway'] });
    } catch (err: any) {
      toast({ title: 'Could not confirm', description: err?.response?.data?.error?.message ?? 'Location not found.', variant: 'destructive' });
    }
  }

  const tasks = list.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-lg font-semibold">Put Away</h1>
      {tasks.length === 0 && <p className="text-sm text-muted-foreground">No pending put-away tasks.</p>}
      {tasks.map((t) => (
        <Card key={t.id}>
          <CardContent className="p-4">
            <p className="font-semibold">{t.product.sku}</p>
            <p className="text-sm text-muted-foreground">{t.product.name}</p>
            <p className="mt-1 text-sm">Qty: <span className="font-medium">{t.quantity}</span> · Suggested: <span className="font-mono">{t.suggestedLocation?.code ?? '—'}</span></p>
            {activeTaskId === t.id ? (
              <div className="mt-3">
                <BarcodeScanInput placeholder="Scan destination location…" onScan={(code) => onScanLocation(t.id, code)} />
              </div>
            ) : (
              <Button size="pda" className="mt-3 w-full" onClick={() => setActiveTaskId(t.id)}>
                Scan location to confirm
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
