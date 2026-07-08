import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/toast';
import { PageHeader } from '../../components/shared/PageHeader';
import { Pagination, type PaginationMeta } from '../../components/shared/Pagination';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

interface Location {
  id: number;
  code: string;
  name: string;
  type: string;
  status: string;
  capacity?: string;
  warehouse: { code: string };
  _count: { inventoryItems: number; children: number };
}

const TYPES = ['WAREHOUSE', 'ZONE', 'AREA', 'AISLE', 'RACK', 'SHELF', 'BIN'];
const emptyForm = { warehouseId: '', code: '', name: '', type: 'BIN', capacity: '' };

export function LocationsPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canManage = can('masterdata:manage');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const list = useQuery({
    queryKey: ['/locations', page, search],
    queryFn: () => api.get('/locations', { params: { page, pageSize: 20, search: search || undefined } }).then((r) => r.data as { items: Location[]; meta: PaginationMeta }),
  });
  const warehouses = useQuery({ queryKey: ['/warehouses', 'all'], queryFn: () => api.get('/warehouses', { params: { pageSize: 100 } }).then((r) => r.data.items as { id: number; code: string }[]) });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/locations', payload),
    onSuccess: () => {
      toast({ title: 'Location created', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/locations'] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast({ title: 'Save failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  return (
    <div>
      <PageHeader
        title="Locations"
        description="Warehouse → Zone → Area → Aisle → Rack → Shelf → Bin hierarchy."
        actions={canManage && <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }}><Plus className="mr-1 h-4 w-4" /> New location</Button>}
      />
      <Card>
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Input placeholder="Search code or name…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>SKUs stored</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.items.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.code}</TableCell>
                <TableCell>{l.name}</TableCell>
                <TableCell>{l.warehouse.code}</TableCell>
                <TableCell><Badge variant="outline">{l.type}</Badge></TableCell>
                <TableCell>{l.capacity ?? '—'}</TableCell>
                <TableCell>{l._count.inventoryItems}</TableCell>
                <TableCell><Badge variant={l.status === 'ACTIVE' ? 'success' : 'secondary'}>{l.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {list.data && <Pagination meta={list.data.meta} onPage={setPage} />}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New location</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Warehouse</Label>
              <Select value={form.warehouseId} onValueChange={(v) => setForm((f) => ({ ...f, warehouseId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{warehouses.data?.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Capacity</Label>
              <Input type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.warehouseId || !form.code || !form.name}
              onClick={() =>
                createMutation.mutate({
                  warehouseId: Number(form.warehouseId),
                  code: form.code,
                  name: form.name,
                  type: form.type,
                  capacity: form.capacity ? Number(form.capacity) : undefined,
                })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
