import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/shared/PageHeader';
import { Pagination, type PaginationMeta } from '../../components/shared/Pagination';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';

interface Movement {
  id: number;
  type: string;
  quantityDelta: string;
  createdAt: string;
  documentType?: string;
  documentId?: number;
  reason?: string;
  product: { sku: string; name: string };
  fromLocation?: { code: string } | null;
  toLocation?: { code: string } | null;
  user?: { fullName: string } | null;
}

export function MovementsPage() {
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ['/movements', page],
    queryFn: () => api.get('/movements', { params: { page, pageSize: 30 } }).then((r) => r.data as { items: Movement[]; meta: PaginationMeta }),
  });

  return (
    <div>
      <PageHeader title="Stock Movement History" description="Append-only audit trail of every quantity change: who, when, where, why." />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.items.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="whitespace-nowrap text-xs">{new Date(m.createdAt).toLocaleString()}</TableCell>
                <TableCell><Badge variant="outline">{m.type}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{m.product.sku}</TableCell>
                <TableCell>{m.quantityDelta}</TableCell>
                <TableCell className="font-mono text-xs">{m.fromLocation?.code ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs">{m.toLocation?.code ?? '—'}</TableCell>
                <TableCell className="text-xs">{m.documentType ? `${m.documentType}#${m.documentId}` : '—'}</TableCell>
                <TableCell className="text-xs">{m.user?.fullName ?? 'System'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{m.reason ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {list.data && <Pagination meta={list.data.meta} onPage={setPage} />}
      </Card>
    </div>
  );
}
