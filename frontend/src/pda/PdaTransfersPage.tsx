import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToast } from '../components/ui/toast';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { submitOrQueue } from './offlineQueue';

interface Line {
  id: number;
  quantity: string;
  quantityConfirmed: string;
  product: { sku: string };
  fromLocation: { code: string };
  toLocation: { code: string };
}
interface Transfer {
  id: number;
  transferNumber: string;
  status: string;
  lines: Line[];
}

export function PdaTransfersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ['/transfers', 'pda'],
    queryFn: () => api.get('/transfers', { params: { pageSize: 25 } }).then((r) => (r.data.items as Transfer[]).filter((t) => ['APPROVED', 'IN_PROGRESS'].includes(t.status))),
  });

  async function confirm(transferId: number, line: Line) {
    const remaining = Number(line.quantity) - Number(line.quantityConfirmed);
    const result = await submitOrQueue({
      method: 'post',
      url: `/transfers/${transferId}/lines/${line.id}/confirm`,
      body: { quantityConfirmed: remaining },
      label: `Transfer ${line.product.sku} ${line.fromLocation.code} → ${line.toLocation.code}`,
    });
    toast({ title: result === 'submitted' ? 'Transfer confirmed' : 'Queued (offline) — will sync', variant: 'success' });
    queryClient.invalidateQueries({ queryKey: ['/transfers'] });
  }

  const pendingLines = (list.data ?? []).flatMap((t) => t.lines.filter((l) => Number(l.quantityConfirmed) < Number(l.quantity)).map((l) => ({ transferId: t.id, line: l })));

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-lg font-semibold">Transfer</h1>
      {pendingLines.length === 0 && <p className="text-sm text-muted-foreground">No transfers awaiting confirmation.</p>}
      {pendingLines.map(({ transferId, line }) => (
        <Card key={line.id}>
          <CardContent className="p-4">
            <p className="font-semibold">{line.product.sku}</p>
            <p className="mt-1 font-mono text-sm">{line.fromLocation.code} → {line.toLocation.code}</p>
            <p className="mt-1 text-sm">Remaining: <span className="font-medium">{Number(line.quantity) - Number(line.quantityConfirmed)}</span></p>
            <Button size="pda" className="mt-3 w-full" onClick={() => confirm(transferId, line)}>
              Confirm move
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
