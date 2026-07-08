import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/toast';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Pagination, type PaginationMeta } from '../../components/shared/Pagination';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

interface Receipt {
  id: number;
  receiptNumber: string;
  status: string;
  createdAt: string;
  supplier?: { name: string };
  lines: unknown[];
}

export function ReceivingListPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ receiptNumber: '', supplierId: '', productId: '', quantityExpected: '' });

  const list = useQuery({
    queryKey: ['/receiving', page],
    queryFn: () => api.get('/receiving', { params: { page, pageSize: 20 } }).then((r) => r.data as { items: Receipt[]; meta: PaginationMeta }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/receiving', {
        receiptNumber: form.receiptNumber,
        supplierId: form.supplierId ? Number(form.supplierId) : undefined,
        lines: [{ productId: Number(form.productId), quantityExpected: Number(form.quantityExpected || 0) }],
      }),
    onSuccess: () => {
      toast({ title: 'Goods receipt created', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/receiving'] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast({ title: 'Create failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  return (
    <div>
      <PageHeader
        title="Receiving"
        description="Receive against a PO, an ASN, or without a PO. Scan barcodes/pallets/serials/batches on the detail screen."
        actions={can('receiving:create') && <Button onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" /> New receipt</Button>}
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Lines</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.items.map((r) => (
              <TableRow key={r.id} className="cursor-pointer">
                <TableCell><Link className="font-medium text-primary hover:underline" to={`/admin/receiving/${r.id}`}>{r.receiptNumber}</Link></TableCell>
                <TableCell>{r.supplier?.name ?? '—'}</TableCell>
                <TableCell>{r.lines.length}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell className="text-xs">{new Date(r.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {list.data && <Pagination meta={list.data.meta} onPage={setPage} />}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New goods receipt</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Quick-start with one line; add more lines from the detail screen next.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5"><Label>Receipt number</Label><Input value={form.receiptNumber} onChange={(e) => setForm((f) => ({ ...f, receiptNumber: e.target.value }))} /></div>
            <div className="flex flex-col gap-1.5"><Label>Supplier ID (optional)</Label><Input value={form.supplierId} onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))} /></div>
            <div className="flex flex-col gap-1.5"><Label>Product ID</Label><Input value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))} /></div>
            <div className="flex flex-col gap-1.5"><Label>Quantity expected</Label><Input type="number" value={form.quantityExpected} onChange={(e) => setForm((f) => ({ ...f, quantityExpected: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.receiptNumber || !form.productId}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
