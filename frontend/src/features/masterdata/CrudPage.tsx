import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/toast';
import { PageHeader } from '../../components/shared/PageHeader';
import { Pagination, type PaginationMeta } from '../../components/shared/Pagination';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';

export interface CrudField {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'number';
  required?: boolean;
}

export interface CrudColumn<T> {
  header: string;
  render: (row: T) => ReactNode;
}

export function CrudPage<T extends { id: number }>({
  title,
  description,
  endpoint,
  fields,
  columns,
}: {
  title: string;
  description?: string;
  endpoint: string;
  fields: CrudField[];
  columns: CrudColumn<T>[];
}) {
  const { can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<T | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const canManage = can('masterdata:manage');
  const listKey = [endpoint, page, search];

  const list = useQuery({
    queryKey: listKey,
    queryFn: () => api.get(endpoint, { params: { page, pageSize: 20, search: search || undefined } }).then((r) => r.data as { items: T[]; meta: PaginationMeta }),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editing ? api.patch(`${endpoint}/${editing.id}`, payload) : api.post(endpoint, payload),
    onSuccess: () => {
      toast({ title: editing ? 'Updated' : 'Created', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast({ title: 'Save failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`${endpoint}/${id}`),
    onSuccess: () => {
      toast({ title: 'Deleted', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: [endpoint] });
    },
    onError: (err: any) => toast({ title: 'Delete failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  function openCreate() {
    setEditing(null);
    setForm(Object.fromEntries(fields.map((f) => [f.name, ''])));
    setDialogOpen(true);
  }

  function openEdit(row: T) {
    setEditing(row);
    setForm(Object.fromEntries(fields.map((f) => [f.name, String((row as any)[f.name] ?? '')])));
    setDialogOpen(true);
  }

  function submit() {
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = form[f.name];
      payload[f.name] = f.type === 'number' && raw !== '' ? Number(raw) : raw || undefined;
    }
    saveMutation.mutate(payload);
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> New
            </Button>
          )
        }
      />

      <Card>
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.header}>{c.header}</TableHead>
              ))}
              {canManage && <TableHead className="w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.items.map((row) => (
              <TableRow key={row.id}>
                {columns.map((c) => (
                  <TableCell key={c.header}>{c.render(row)}</TableCell>
                ))}
                {canManage && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => confirm('Delete this record?') && deleteMutation.mutate(row.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
            <DialogTitle>{editing ? `Edit ${title.slice(0, -1)}` : `New ${title.slice(0, -1)}`}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {fields.map((f) => (
              <div key={f.name} className="flex flex-col gap-1.5">
                <Label htmlFor={f.name}>{f.label}</Label>
                <Input
                  id={f.name}
                  type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : 'text'}
                  required={f.required}
                  value={form[f.name] ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saveMutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
