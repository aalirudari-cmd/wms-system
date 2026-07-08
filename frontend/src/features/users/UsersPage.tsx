import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil } from 'lucide-react';
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
import { Switch } from '../../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

interface UserRow {
  id: number;
  username: string;
  email: string;
  fullName: string;
  active: boolean;
  lastLoginAt?: string;
  role: { id: number; name: string };
}
interface Role { id: number; name: string }

const emptyForm = { username: '', email: '', password: '', fullName: '', roleId: '' };

export function UsersPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canManage = can('users:manage');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const list = useQuery({
    queryKey: ['/users', page],
    queryFn: () => api.get('/users', { params: { page, pageSize: 20 } }).then((r) => r.data as { items: UserRow[]; meta: PaginationMeta }),
  });
  const roles = useQuery({ queryKey: ['/roles', 'all'], queryFn: () => api.get('/roles').then((r) => r.data as Role[]) });

  const saveMutation = useMutation({
    mutationFn: () =>
      editingId
        ? api.patch(`/users/${editingId}`, { email: form.email, fullName: form.fullName, roleId: Number(form.roleId), ...(form.password ? { password: form.password } : {}) })
        : api.post('/users', { username: form.username, email: form.email, password: form.password, fullName: form.fullName, roleId: Number(form.roleId) }),
    onSuccess: () => {
      toast({ title: editingId ? 'User updated' : 'User created', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/users'] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast({ title: 'Save failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => api.patch(`/users/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/users'] }),
  });

  function openEdit(u: UserRow) {
    setEditingId(u.id);
    setForm({ username: u.username, email: u.email, password: '', fullName: u.fullName, roleId: String(u.role.id) });
    setDialogOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Warehouse staff accounts and their assigned role."
        actions={canManage && <Button onClick={() => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); }}><Plus className="mr-1 h-4 w-4" /> New user</Button>}
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Full name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Active</TableHead>
              {canManage && <TableHead className="w-16">Edit</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.items.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-mono text-xs">{u.username}</TableCell>
                <TableCell>{u.fullName}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell><Badge variant="outline">{u.role.name}</Badge></TableCell>
                <TableCell>
                  <Switch checked={u.active} disabled={!canManage} onCheckedChange={(active) => toggleActiveMutation.mutate({ id: u.id, active })} />
                </TableCell>
                {canManage && (
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>{editingId ? 'Edit user' : 'New user'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {!editingId && (
              <div className="flex flex-col gap-1.5"><Label>Username</Label><Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} /></div>
            )}
            <div className="flex flex-col gap-1.5"><Label>Full name</Label><Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} /></div>
            <div className="flex flex-col gap-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div className="flex flex-col gap-1.5">
              <Label>{editingId ? 'New password (optional)' : 'Password'}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <Select value={form.roleId} onValueChange={(v) => setForm((f) => ({ ...f, roleId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{roles.data?.map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.roleId}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
