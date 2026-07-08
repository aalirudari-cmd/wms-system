import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/shared/PageHeader';
import { Pagination, type PaginationMeta } from '../../components/shared/Pagination';
import { Card } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';

interface AuditEntry {
  id: number;
  action: string;
  entityType: string;
  entityId?: number;
  createdAt: string;
  user?: { fullName: string };
}

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ['/audit-logs', page],
    queryFn: () => api.get('/audit-logs', { params: { page, pageSize: 30 } }).then((r) => r.data as { items: AuditEntry[]; meta: PaginationMeta }),
  });

  return (
    <div>
      <PageHeader title="Audit Log" description="System-level configuration and record changes." />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.items.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs">{new Date(e.createdAt).toLocaleString()}</TableCell>
                <TableCell className="text-xs">{e.user?.fullName ?? 'System'}</TableCell>
                <TableCell className="text-xs">{e.action}</TableCell>
                <TableCell className="text-xs">{e.entityType}{e.entityId ? `#${e.entityId}` : ''}</TableCell>
              </TableRow>
            ))}
            {list.data?.items.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No audit entries yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        {list.data && <Pagination meta={list.data.meta} onPage={setPage} />}
      </Card>
    </div>
  );
}
