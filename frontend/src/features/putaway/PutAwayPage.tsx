import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/toast';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';

interface Task {
  id: number;
  quantity: string;
  status: string;
  product: { sku: string; name: string };
  suggestedLocation?: { code: string };
  actualLocation?: { code: string };
}

export function PutAwayPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [locationInputs, setLocationInputs] = useState<Record<number, string>>({});

  const list = useQuery({
    queryKey: ['/putaway'],
    queryFn: () => api.get('/putaway', { params: { status: 'PENDING', pageSize: 50 } }).then((r) => r.data.items as Task[]),
  });

  const confirmMutation = useMutation({
    mutationFn: ({ id, actualLocationId }: { id: number; actualLocationId: number }) => api.post(`/putaway/${id}/confirm`, { actualLocationId }),
    onSuccess: () => {
      toast({ title: 'Put-away confirmed', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/putaway'] });
      queryClient.invalidateQueries({ queryKey: ['/inventory'] });
    },
    onError: (err: any) => toast({ title: 'Confirm failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  return (
    <div>
      <PageHeader title="Put Away" description="Confirm placement of received stock. Suggested location shown; scan the actual bin used." />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Suggested</TableHead>
              <TableHead>Actual location (scan)</TableHead>
              <TableHead>Status</TableHead>
              {can('putaway:confirm') && <TableHead>Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.product.sku} — {t.product.name}</TableCell>
                <TableCell>{t.quantity}</TableCell>
                <TableCell className="font-mono text-xs">{t.suggestedLocation?.code ?? '—'}</TableCell>
                <TableCell>
                  <Input
                    className="w-32"
                    placeholder="Location ID"
                    value={locationInputs[t.id] ?? ''}
                    onChange={(e) => setLocationInputs((prev) => ({ ...prev, [t.id]: e.target.value }))}
                  />
                </TableCell>
                <TableCell><StatusBadge status={t.status} /></TableCell>
                {can('putaway:confirm') && (
                  <TableCell>
                    <Button
                      size="sm"
                      disabled={!locationInputs[t.id] || confirmMutation.isPending}
                      onClick={() => confirmMutation.mutate({ id: t.id, actualLocationId: Number(locationInputs[t.id]) })}
                    >
                      Confirm
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {list.data?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No pending put-away tasks.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
