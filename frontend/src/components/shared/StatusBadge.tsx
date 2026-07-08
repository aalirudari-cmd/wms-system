import { Badge } from '../ui/badge';

const TONE: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  WAITING: 'secondary',
  RECEIVING: 'warning',
  RECEIVED: 'warning',
  COMPLETED: 'success',
  REJECTED: 'destructive',
  PENDING: 'secondary',
  CONFIRMED: 'success',
  EXCEPTION: 'destructive',
  DRAFT: 'secondary',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  IN_PROGRESS: 'warning',
  CANCELLED: 'destructive',
  ASSIGNED: 'warning',
  PICKED: 'success',
  SHORT: 'destructive',
  OPEN: 'secondary',
  CLOSED: 'success',
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  BLOCKED: 'destructive',
  FULL: 'warning',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={TONE[status] ?? 'outline'}>{status.replace(/_/g, ' ')}</Badge>;
}
