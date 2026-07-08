import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/toast';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

interface ReceiptLine {
  id: number;
  productId: number;
  locationId?: number;
  batchNumber?: string;
  quantityExpected: string;
  quantityReceived: string;
  quantityDamaged: string;
  quantityMissing: string;
  comments?: string;
  product: { sku: string; name: string };
}
interface Receipt {
  id: number;
  receiptNumber: string;
  status: string;
  lines: ReceiptLine[];
}

function LineEditor({ receiptId, line, editable }: { receiptId: number; line: ReceiptLine; editable: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    locationId: line.locationId ? String(line.locationId) : '',
    batchNumber: line.batchNumber ?? '',
    quantityReceived: line.quantityReceived,
    quantityDamaged: line.quantityDamaged,
    quantityMissing: line.quantityMissing,
    comments: line.comments ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.patch(`/receiving/lines/${line.id}`, {
        locationId: form.locationId ? Number(form.locationId) : undefined,
        batchNumber: form.batchNumber || undefined,
        quantityReceived: Number(form.quantityReceived || 0),
        quantityDamaged: Number(form.quantityDamaged || 0),
        quantityMissing: Number(form.quantityMissing || 0),
        comments: form.comments || undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Line updated', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/receiving', receiptId] });
    },
    onError: (err: any) => toast({ title: 'Update failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  return (
    <div className="rounded-lg border border-border p-4">
      <p className="mb-3 font-medium">{line.product.sku} — {line.product.name} <span className="text-muted-foreground">(expected {line.quantityExpected})</span></p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="flex flex-col gap-1"><Label className="text-xs">Location ID (scan)</Label><Input disabled={!editable} value={form.locationId} onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))} /></div>
        <div className="flex flex-col gap-1"><Label className="text-xs">Batch #</Label><Input disabled={!editable} value={form.batchNumber} onChange={(e) => setForm((f) => ({ ...f, batchNumber: e.target.value }))} /></div>
        <div className="flex flex-col gap-1"><Label className="text-xs">Received</Label><Input disabled={!editable} type="number" value={form.quantityReceived} onChange={(e) => setForm((f) => ({ ...f, quantityReceived: e.target.value }))} /></div>
        <div className="flex flex-col gap-1"><Label className="text-xs">Damaged</Label><Input disabled={!editable} type="number" value={form.quantityDamaged} onChange={(e) => setForm((f) => ({ ...f, quantityDamaged: e.target.value }))} /></div>
        <div className="flex flex-col gap-1"><Label className="text-xs">Missing</Label><Input disabled={!editable} type="number" value={form.quantityMissing} onChange={(e) => setForm((f) => ({ ...f, quantityMissing: e.target.value }))} /></div>
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <Label className="text-xs">Comments</Label>
        <Input disabled={!editable} value={form.comments} onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))} />
      </div>
      {editable && (
        <Button size="sm" className="mt-3" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          Save line
        </Button>
      )}
    </div>
  );
}

export function ReceivingDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['/receiving', id],
    queryFn: () => api.get(`/receiving/${id}`).then((r) => r.data as Receipt),
  });

  const action = useMutation({
    mutationFn: (verb: 'start' | 'complete' | 'reject') => api.post(`/receiving/${id}/${verb}`),
    onSuccess: (_data, verb) => {
      toast({ title: `Receipt ${verb === 'start' ? 'started' : verb === 'complete' ? 'completed' : 'rejected'}`, variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/receiving'] });
    },
    onError: (err: any) => toast({ title: 'Action failed', description: err?.response?.data?.error?.message, variant: 'destructive' }),
  });

  if (!query.data) return null;
  const receipt = query.data;
  const editable = ['WAITING', 'RECEIVING'].includes(receipt.status) && can('receiving:process');

  return (
    <div>
      <PageHeader
        title={`Receipt ${receipt.receiptNumber}`}
        description="Scan destination location, batch/serial, quantities, damage and missing counts per line."
        actions={
          <div className="flex gap-2">
            <StatusBadge status={receipt.status} />
            {receipt.status === 'WAITING' && can('receiving:process') && (
              <Button size="sm" onClick={() => action.mutate('start')}>Start receiving</Button>
            )}
            {['WAITING', 'RECEIVING'].includes(receipt.status) && can('receiving:complete') && (
              <>
                <Button size="sm" variant="success" onClick={() => action.mutate('complete')}>Complete</Button>
                <Button size="sm" variant="destructive" onClick={() => action.mutate('reject')}>Reject</Button>
              </>
            )}
          </div>
        }
      />
      <Card>
        <CardHeader><CardTitle>Lines</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          {receipt.lines.map((line) => (
            <LineEditor key={line.id} receiptId={receipt.id} line={line} editable={editable} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
