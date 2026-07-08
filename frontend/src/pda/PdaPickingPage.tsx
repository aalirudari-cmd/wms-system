import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { submitOrQueue } from './offlineQueue';

interface Line {
  id: number;
  quantityToPick: string;
  status: string;
  product: { sku: string; name: string };
  location: { code: string };
}
interface PickingList {
  id: number;
  status: string;
  lines: Line[];
}

export function PdaPickingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ['/picking/lists', 'pda'],
    queryFn: () => api.get('/picking/lists', { params: { pageSize: 25 } }).then((r) => (r.data.items as PickingList[]).filter((l) => ['ASSIGNED', 'IN_PROGRESS', 'PENDING'].includes(l.status))),
  });

  async function confirmPick(listId: number, line: Line) {
    const result = await submitOrQueue({
      method: 'post',
      url: `/picking/lists/${listId}/lines/${line.id}/confirm`,
      body: { quantityPicked: Number(line.quantityToPick) },
      label: `Pick ${line.product.sku} @ ${line.location.code}`,
    });
    toast({ title: result === 'submitted' ? 'Pick confirmed' : 'Queued (offline) — will sync', variant: 'success' });
    queryClient.invalidateQueries({ queryKey: ['/picking/lists'] });
  }

  const pendingLines = (list.data ?? []).flatMap((pl) => pl.lines.filter((l) => l.status === 'PENDING').map((l) => ({ listId: pl.id, line: l })));

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-lg font-semibold">Pick</h1>
      {pendingLines.length === 0 && <p className="text-sm text-muted-foreground">No pending picks.</p>}
      {pendingLines.map(({ listId, line }) => (
        <Card key={line.id}>
          <CardContent className="p-4">
            <p className="font-mono text-lg font-semibold">{line.location.code}</p>
            <p className="mt-1 font-semibold">{line.product.sku}</p>
            <p className="text-sm text-muted-foreground">{line.product.name}</p>
            <p className="mt-1 text-sm">Pick qty: <span className="font-medium">{line.quantityToPick}</span></p>
            <Button size="pda" className="mt-3 w-full" onClick={() => confirmPick(listId, line)}>
              Confirm pick
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
