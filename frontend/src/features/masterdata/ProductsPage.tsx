import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';

interface Product {
  id: number;
  sku: string;
  barcode?: string;
  name: string;
  reorderPoint: number;
  active: boolean;
  category?: { id: number; name: string };
  brand?: { id: number; name: string };
  unit: { id: number; code: string };
}
interface Option { id: number; name?: string; code?: string }

const emptyForm = { sku: '', barcode: '', name: '', categoryId: '', brandId: '', unitId: '', reorderPoint: '0' };

export function ProductsPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canManage = can('masterdata:manage');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const list = useQuery({
    queryKey: ['/products', page, search],
    queryFn: () => api.get('/products', { params: { page, pageSize: 20, search: search || undefined } }).then((r) => r.data as { items: Product[]; meta: PaginationMeta }),
  });
  const categories = useQuery({ queryKey: ['/categories', 'all'], queryFn: () => api.get('/categories', { params: { pageSize: 200 } }).then((r) => r.data.items as Option[]) });
  const brands = useQuery({ queryKey: ['/brands', 'all'], queryFn: () => api.get('/brands', { params: { pageSize: 200 } }).then((r) => r.data.items as Option[]) });
  const units = useQuery({ queryKey: ['/units', 'all'], queryFn: () => api.get('/units', { params: { pageSize: 200 } }).then((r) => r.data.items as Option[]) });

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => (editingId ? api.patch(`/products/${editingId}`, payload) : api.post('/products', payload)),
    onSuccess: () => {
      toast({ title: editingId ? 'Product updated' : 'Product created', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/products'] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast({ title: 'Save failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => {
      toast({ title: 'Product deleted', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/products'] });
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      sku: p.sku,
      barcode: p.barcode ?? '',
      name: p.name,
      categoryId: p.category ? String(p.category.id) : '',
      brandId: p.brand ? String(p.brand.id) : '',
      unitId: String(p.unit.id),
      reorderPoint: String(p.reorderPoint),
    });
    setDialogOpen(true);
  }

  function submit() {
    saveMutation.mutate({
      sku: form.sku,
      barcode: form.barcode || undefined,
      name: form.name,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      brandId: form.brandId ? Number(form.brandId) : undefined,
      unitId: Number(form.unitId),
      reorderPoint: Number(form.reorderPoint || 0),
    });
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Product catalog — SKU, barcode, category, unit of measure."
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> New product
            </Button>
          )
        }
      />

      <Card>
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Input placeholder="Search SKU, name, barcode…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Reorder pt.</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.items.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell className="font-mono text-xs">{p.barcode ?? '—'}</TableCell>
                <TableCell>{p.category?.name ?? '—'}</TableCell>
                <TableCell>{p.unit.code}</TableCell>
                <TableCell>{p.reorderPoint}</TableCell>
                <TableCell><Badge variant={p.active ? 'success' : 'secondary'}>{p.active ? 'Active' : 'Inactive'}</Badge></TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => confirm('Delete this product?') && deleteMutation.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {list.data && <Pagination meta={list.data.meta} onPage={setPage} />}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit product' : 'New product'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="prod-name">Name</Label>
              <Input id="prod-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prod-sku">SKU</Label>
              <Input id="prod-sku" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prod-barcode">Barcode</Label>
              <Input id="prod-barcode" value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {categories.data?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Brand</Label>
              <Select value={form.brandId} onValueChange={(v) => setForm((f) => ({ ...f, brandId: v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {brands.data?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Unit</Label>
              <Select value={form.unitId} onValueChange={(v) => setForm((f) => ({ ...f, unitId: v }))}>
                <SelectTrigger aria-label="Unit"><SelectValue placeholder="Select unit" /></SelectTrigger>
                <SelectContent>
                  {units.data?.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Reorder point</Label>
              <Input type="number" value={form.reorderPoint} onChange={(e) => setForm((f) => ({ ...f, reorderPoint: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saveMutation.isPending || !form.unitId}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
