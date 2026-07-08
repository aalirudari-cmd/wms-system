import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/toast';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';

interface Package {
  id: number;
  packageNumber: string;
  status: string;
  salesOrder: { orderNumber: string; customer: { name: string } };
  lines: { id: number; quantity: string; product: { sku: string } }[];
}

export function PackingPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const list = useQuery({ queryKey: ['/packing'], queryFn: () => api.get('/packing').then((r) => r.data as Package[]) });

  const closeMutation = useMutation({
    mutationFn: (id: number) => api.post(`/packing/${id}/close`, {}),
    onSuccess: () => { toast({ title: 'Package closed', variant: 'success' }); queryClient.invalidateQueries({ queryKey: ['/packing'] }); },
    onError: (err: any) => toast({ title: 'Close failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  return (
    <div>
      <PageHeader title="Packing" description="Pack picked items into shipping packages and close them for dispatch." />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Package #</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Lines</TableHead>
              <TableHead>Status</TableHead>
              {can('packing:pack') && <TableHead>Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.packageNumber}</TableCell>
                <TableCell>{p.salesOrder.orderNumber}</TableCell>
                <TableCell>{p.salesOrder.customer.name}</TableCell>
                <TableCell>{p.lines.length}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                {can('packing:pack') && p.status === 'OPEN' && (
                  <TableCell><Button size="sm" onClick={() => closeMutation.mutate(p.id)}>Close package</Button></TableCell>
                )}
              </TableRow>
            ))}
            {list.data?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No packages yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
