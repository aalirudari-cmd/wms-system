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

interface CountLine {
  id: number;
  expectedQuantity: string;
  countedQuantity: string | null;
  product: { sku: string };
  location: { code: string };
}
interface CycleCount {
  id: number;
  countNumber: string;
  type: string;
  status: string;
  lines: CountLine[];
}

export function ControllingPage() {
  const { can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [counted, setCounted] = useState<Record<number, string>>({});

  const list = useQuery({ queryKey: ['/controlling'], queryFn: () => api.get('/controlling').then((r) => r.data as CycleCount[]) });

  const recordMutation = useMutation({
    mutationFn: ({ countId, lineId, countedQuantity }: { countId: number; lineId: number; countedQuantity: number }) =>
      api.patch(`/controlling/${countId}/lines/${lineId}`, { countedQuantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/controlling'] }),
  });

  const submitMutation = useMutation({
    mutationFn: (id: number) => api.post(`/controlling/${id}/submit`),
    onSuccess: () => { toast({ title: 'Submitted for approval', variant: 'success' }); queryClient.invalidateQueries({ queryKey: ['/controlling'] }); },
    onError: (err: any) => toast({ title: 'Submit failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/controlling/${id}/approve`),
    onSuccess: () => { toast({ title: 'Count approved — adjustments applied', variant: 'success' }); queryClient.invalidateQueries({ queryKey: ['/controlling'] }); queryClient.invalidateQueries({ queryKey: ['/inventory'] }); },
    onError: (err: any) => toast({ title: 'Approve failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => api.post(`/controlling/${id}/reject`),
    onSuccess: () => { toast({ title: 'Count rejected', variant: 'success' }); queryClient.invalidateQueries({ queryKey: ['/controlling'] }); },
  });

  return (
    <div>
      <PageHeader title="Controlling · Cycle Counts" description="Random checks, full checks, and cycle counts with barcode verification and approval." />
      <div className="flex flex-col gap-4">
        {list.data?.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium">{c.countNumber} <span className="text-sm text-muted-foreground">({c.type})</span></p>
              <div className="flex items-center gap-2">
                <StatusBadge status={c.status} />
                {c.status === 'IN_PROGRESS' && can('controlling:count') && (
                  <Button size="sm" onClick={() => submitMutation.mutate(c.id)}>Submit for approval</Button>
                )}
                {c.status === 'PENDING_APPROVAL' && can('controlling:approve') && (
                  <>
                    <Button size="sm" variant="success" onClick={() => approveMutation.mutate(c.id)}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate(c.id)}>Reject</Button>
                  </>
                )}
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Counted</TableHead>
                  <TableHead>Difference</TableHead>
                  {can('controlling:count') && c.status === 'IN_PROGRESS' && <TableHead>Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.lines.map((l) => {
                  const diff = l.countedQuantity !== null ? Number(l.countedQuantity) - Number(l.expectedQuantity) : null;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">{l.product.sku}</TableCell>
                      <TableCell className="font-mono text-xs">{l.location.code}</TableCell>
                      <TableCell>{l.expectedQuantity}</TableCell>
                      <TableCell>{l.countedQuantity ?? '—'}</TableCell>
                      <TableCell className={diff && diff !== 0 ? 'text-destructive' : ''}>{diff ?? '—'}</TableCell>
                      {can('controlling:count') && c.status === 'IN_PROGRESS' && (
                        <TableCell className="flex gap-2">
                          <Input
                            className="w-24"
                            placeholder="Count"
                            value={counted[l.id] ?? ''}
                            onChange={(e) => setCounted((prev) => ({ ...prev, [l.id]: e.target.value }))}
                          />
                          <Button
                            size="sm"
                            disabled={!counted[l.id]}
                            onClick={() => recordMutation.mutate({ countId: c.id, lineId: l.id, countedQuantity: Number(counted[l.id]) })}
                          >
                            Record
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
    </div>
  );
}
