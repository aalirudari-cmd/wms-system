import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { submitOrQueue } from './offlineQueue';

interface CountLine {
  id: number;
  expectedQuantity: string;
  countedQuantity: string | null;
  product: { sku: string; name: string };
  location: { code: string };
}
interface CycleCount {
  id: number;
  status: string;
  lines: CountLine[];
}

export function PdaControllingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<number, string>>({});

  const list = useQuery({
    queryKey: ['/controlling', 'pda'],
    queryFn: () => api.get('/controlling').then((r) => (r.data as CycleCount[]).filter((c) => c.status === 'IN_PROGRESS')),
  });

  async function record(countId: number, lineId: number) {
    const countedQuantity = Number(values[lineId]);
    const result = await submitOrQueue({
      method: 'patch',
      url: `/controlling/${countId}/lines/${lineId}`,
      body: { countedQuantity, barcodeVerified: true },
      label: `Cycle count line #${lineId} = ${countedQuantity}`,
    });
    toast({ title: result === 'submitted' ? 'Count recorded' : 'Queued (offline) — will sync', variant: 'success' });
    queryClient.invalidateQueries({ queryKey: ['/controlling'] });
  }

  const pendingLines = (list.data ?? []).flatMap((c) => c.lines.filter((l) => l.countedQuantity === null).map((l) => ({ countId: c.id, line: l })));

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-lg font-semibold">Cycle Count</h1>
      {pendingLines.length === 0 && <p className="text-sm text-muted-foreground">No lines waiting to be counted.</p>}
      {pendingLines.map(({ countId, line }) => (
        <Card key={line.id}>
          <CardContent className="p-4">
            <p className="font-mono text-lg font-semibold">{line.location.code}</p>
            <p className="mt-1 font-semibold">{line.product.sku}</p>
            <p className="text-sm text-muted-foreground">{line.product.name}</p>
            <div className="mt-3 flex gap-2">
              <Input
                type="number"
                placeholder="Counted qty"
                className="h-12 text-base"
                value={values[line.id] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [line.id]: e.target.value }))}
              />
              <Button size="pda" disabled={!values[line.id]} onClick={() => record(countId, line.id)}>
                Record
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
