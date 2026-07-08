import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/toast';
import { PageHeader } from '../../components/shared/PageHeader';
import { Pagination, type PaginationMeta } from '../../components/shared/Pagination';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';

interface InventoryItem {
  id: number;
  quantityAvailable: string;
  quantityReserved: string;
  quantityBlocked: string;
  quantityDamaged: string;
  product: { sku: string; name: string };
  location: { code: string; warehouse: { code: string } };
}

export function InventoryPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ productId: '', locationId: '', quantityDelta: '', reason: '' });

  const list = useQuery({
    queryKey: ['/inventory', page],
    queryFn: () => api.get('/inventory', { params: { page, pageSize: 25 } }).then((r) => r.data as { items: InventoryItem[]; meta: PaginationMeta }),
  });

  const adjustMutation = useMutation({
    mutationFn: () =>
      api.post('/inventory/adjust', {
        productId: Number(adjustForm.productId),
        locationId: Number(adjustForm.locationId),
        quantityDelta: Number(adjustForm.quantityDelta),
        reason: adjustForm.reason,
      }),
    onSuccess: () => {
      toast({ title: 'Adjustment recorded', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/inventory'] });
      setAdjustOpen(false);
    },
    onError: (err: any) => toast({ title: 'Adjustment failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Current stock by product and location — available, reserved, blocked, damaged."
        actions={can('inventory:adjust') && <Button onClick={() => setAdjustOpen(true)}><SlidersHorizontal className="mr-1 h-4 w-4" /> Adjust stock</Button>}
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>Reserved</TableHead>
              <TableHead>Blocked</TableHead>
              <TableHead>Damaged</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.items.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-xs">{i.product.sku}</TableCell>
                <TableCell>{i.product.name}</TableCell>
                <TableCell>{i.location.warehouse.code}</TableCell>
                <TableCell className="font-mono text-xs">{i.location.code}</TableCell>
                <TableCell className="font-medium">{i.quantityAvailable}</TableCell>
                <TableCell>{i.quantityReserved}</TableCell>
                <TableCell>{i.quantityBlocked}</TableCell>
                <TableCell>{i.quantityDamaged}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {list.data && <Pagination meta={list.data.meta} onPage={setPage} />}
      </Card>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust stock</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5"><Label>Product ID</Label><Input value={adjustForm.productId} onChange={(e) => setAdjustForm((f) => ({ ...f, productId: e.target.value }))} /></div>
            <div className="flex flex-col gap-1.5"><Label>Location ID</Label><Input value={adjustForm.locationId} onChange={(e) => setAdjustForm((f) => ({ ...f, locationId: e.target.value }))} /></div>
            <div className="flex flex-col gap-1.5"><Label>Quantity delta (+/-)</Label><Input type="number" value={adjustForm.quantityDelta} onChange={(e) => setAdjustForm((f) => ({ ...f, quantityDelta: e.target.value }))} /></div>
            <div className="col-span-2 flex flex-col gap-1.5"><Label>Reason</Label><Input value={adjustForm.reason} onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button onClick={() => adjustMutation.mutate()} disabled={adjustMutation.isPending}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
