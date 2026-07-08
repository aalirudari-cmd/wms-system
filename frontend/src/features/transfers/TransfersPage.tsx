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

export function TransfersPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ transferNumber: '', productId: '', fromLocationId: '', toLocationId: '', quantity: '' });

  const list = useQuery({ queryKey: ['/transfers'], queryFn: () => api.get('/transfers', { params: { pageSize: 50 } }).then((r) => r.data.items as Transfer[]) });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/transfers', {
        transferNumber: form.transferNumber,
        lines: [{ productId: Number(form.productId), fromLocationId: Number(form.fromLocationId), toLocationId: Number(form.toLocationId), quantity: Number(form.quantity) }],
      }),
    onSuccess: () => {
      toast({ title: 'Transfer created', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/transfers'] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast({ title: 'Create failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/transfers/${id}/approve`),
    onSuccess: () => { toast({ title: 'Transfer approved', variant: 'success' }); queryClient.invalidateQueries({ queryKey: ['/transfers'] }); },
  });

  const confirmLineMutation = useMutation({
    mutationFn: ({ transferId, lineId, quantityConfirmed }: { transferId: number; lineId: number; quantityConfirmed: number }) =>
      api.post(`/transfers/${transferId}/lines/${lineId}/confirm`, { quantityConfirmed }),
    onSuccess: () => {
      toast({ title: 'Line confirmed', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/transfers'] });
      queryClient.invalidateQueries({ queryKey: ['/inventory'] });
    },
    onError: (err: any) => toast({ title: 'Confirm failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  return (
    <div>
      <PageHeader
        title="Internal Transfers"
        description="Move inventory between locations with an approval step."
        actions={can('transfers:create') && <Button onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" /> New transfer</Button>}
      />
      <div className="flex flex-col gap-4">
        {list.data?.map((t) => (
          <Card key={t.id} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium">{t.transferNumber}</p>
              <div className="flex items-center gap-2">
                <StatusBadge status={t.status} />
                {t.status === 'PENDING_APPROVAL' && can('transfers:approve') && (
                  <Button size="sm" onClick={() => approveMutation.mutate(t.id)}>Approve</Button>
                )}
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Confirmed</TableHead>
                  {can('transfers:complete') && <TableHead>Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {t.lines.map((l) => {
                  const remaining = Number(l.quantity) - Number(l.quantityConfirmed);
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">{l.product.sku}</TableCell>
                      <TableCell className="font-mono text-xs">{l.fromLocation.code}</TableCell>
                      <TableCell className="font-mono text-xs">{l.toLocation.code}</TableCell>
                      <TableCell>{l.quantity}</TableCell>
                      <TableCell>{l.quantityConfirmed}</TableCell>
                      {can('transfers:complete') && ['APPROVED', 'IN_PROGRESS'].includes(t.status) && remaining > 0 && (
                        <TableCell>
                          <Button size="sm" onClick={() => confirmLineMutation.mutate({ transferId: t.id, lineId: l.id, quantityConfirmed: remaining })}>
                            Confirm {remaining}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New transfer</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5"><Label>Transfer number</Label><Input value={form.transferNumber} onChange={(e) => setForm((f) => ({ ...f, transferNumber: e.target.value }))} /></div>
            <div className="flex flex-col gap-1.5"><Label>Product ID</Label><Input value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))} /></div>
            <div className="flex flex-col gap-1.5"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} /></div>
            <div className="flex flex-col gap-1.5"><Label>From location ID</Label><Input value={form.fromLocationId} onChange={(e) => setForm((f) => ({ ...f, fromLocationId: e.target.value }))} /></div>
            <div className="flex flex-col gap-1.5"><Label>To location ID</Label><Input value={form.toLocationId} onChange={(e) => setForm((f) => ({ ...f, toLocationId: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
