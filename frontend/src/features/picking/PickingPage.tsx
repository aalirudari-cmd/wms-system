import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/toast';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';

interface PickLine {
  id: number;
  quantityToPick: string;
  quantityPicked: string;
  status: string;
  product: { sku: string };
  location: { code: string };
}
interface PickingList {
  id: number;
  type: string;
  status: string;
  lines: PickLine[];
}

export function PickingPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [salesOrderIds, setSalesOrderIds] = useState('');

  const list = useQuery({ queryKey: ['/picking/lists'], queryFn: () => api.get('/picking/lists', { params: { pageSize: 50 } }).then((r) => r.data.items as PickingList[]) });

  const createMutation = useMutation({
    mutationFn: () => api.post('/picking/lists', { type: 'SINGLE', salesOrderIds: salesOrderIds.split(',').map((s) => Number(s.trim())).filter(Boolean) }),
    onSuccess: () => {
      toast({ title: 'Picking list created', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/picking/lists'] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast({ title: 'Create failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  const confirmMutation = useMutation({
    mutationFn: ({ listId, lineId, quantityPicked }: { listId: number; lineId: number; quantityPicked: number }) =>
      api.post(`/picking/lists/${listId}/lines/${lineId}/confirm`, { quantityPicked }),
    onSuccess: () => {
      toast({ title: 'Pick confirmed', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/picking/lists'] });
      queryClient.invalidateQueries({ queryKey: ['/inventory'] });
    },
    onError: (err: any) => toast({ title: 'Pick failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  return (
    <div>
      <PageHeader
        title="Picking"
        description="Picking lists generated from sales orders. Confirm each line as it's scanned and picked."
        actions={can('picking:create') && <Button onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" /> New picking list</Button>}
      />
      <div className="flex flex-col gap-4">
        {list.data?.map((pl) => (
          <Card key={pl.id} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium">Picking list #{pl.id} <span className="text-sm text-muted-foreground">({pl.type})</span></p>
              <StatusBadge status={pl.status} />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>To pick</TableHead>
                  <TableHead>Picked</TableHead>
                  <TableHead>Status</TableHead>
                  {can('picking:pick') && <TableHead>Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pl.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs">{l.product.sku}</TableCell>
                    <TableCell className="font-mono text-xs">{l.location.code}</TableCell>
                    <TableCell>{l.quantityToPick}</TableCell>
                    <TableCell>{l.quantityPicked}</TableCell>
                    <TableCell><StatusBadge status={l.status} /></TableCell>
                    {can('picking:pick') && l.status === 'PENDING' && (
                      <TableCell>
                        <Button size="sm" onClick={() => confirmMutation.mutate({ listId: pl.id, lineId: l.id, quantityPicked: Number(l.quantityToPick) })}>
                          Confirm full pick
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New picking list</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label>Sales order IDs (comma-separated)</Label>
            <Input value={salesOrderIds} onChange={(e) => setSalesOrderIds(e.target.value)} placeholder="1, 2" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !salesOrderIds}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
