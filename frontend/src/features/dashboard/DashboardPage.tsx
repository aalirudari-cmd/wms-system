import { useQuery } from '@tanstack/react-query';
import { Inbox, MoveRight, ClipboardList, AlertTriangle, ListTodo, Warehouse } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

interface Kpis {
  todayReceipts: number;
  todayTransfers: number;
  todayPicks: number;
  todayErrors: number;
  pendingTasks: number;
  totalUnitsOnHand: number;
  warehouseCapacityUsedPct: number | null;
}

interface ThroughputDay {
  date: string;
  receipts: number;
  transfers: number;
  picks: number;
}

interface ActivityItem {
  id: number;
  type: string;
  quantityDelta: string;
  createdAt: string;
  product: { sku: string; name: string };
  fromLocation?: { code: string } | null;
  toLocation?: { code: string } | null;
  user?: { fullName: string } | null;
}

function KpiCard({ icon: Icon, label, value }: { icon: typeof Inbox; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ThroughputChart({ data }: { data: ThroughputDay[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.receipts, d.transfers, d.picks]));
  return (
    <div className="flex h-40 items-end gap-3">
      {data.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-32 w-full items-end justify-center gap-0.5">
            <div className="w-2 rounded-t bg-primary" style={{ height: `${(d.receipts / max) * 100}%` }} title={`Receipts: ${d.receipts}`} />
            <div className="w-2 rounded-t bg-warning" style={{ height: `${(d.transfers / max) * 100}%` }} title={`Transfers: ${d.transfers}`} />
            <div className="w-2 rounded-t bg-success" style={{ height: `${(d.picks / max) * 100}%` }} title={`Picks: ${d.picks}`} />
          </div>
          <span className="text-[10px] text-muted-foreground">{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const kpis = useQuery({ queryKey: ['dashboard', 'kpis'], queryFn: () => api.get<Kpis>('/dashboard/kpis').then((r) => r.data) });
  const throughput = useQuery({
    queryKey: ['dashboard', 'throughput'],
    queryFn: () => api.get<ThroughputDay[]>('/dashboard/throughput').then((r) => r.data),
  });
  const activity = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => api.get<ActivityItem[]>('/dashboard/activity').then((r) => r.data),
    refetchInterval: 15_000,
  });

  return (
    <div>
      <PageHeader title="Dashboard" description="Real-time warehouse KPIs and activity." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={Inbox} label="Today's receipts" value={kpis.data?.todayReceipts ?? '—'} />
        <KpiCard icon={MoveRight} label="Today's transfers" value={kpis.data?.todayTransfers ?? '—'} />
        <KpiCard icon={ClipboardList} label="Today's picks" value={kpis.data?.todayPicks ?? '—'} />
        <KpiCard icon={AlertTriangle} label="Today's errors" value={kpis.data?.todayErrors ?? '—'} />
        <KpiCard icon={ListTodo} label="Pending tasks" value={kpis.data?.pendingTasks ?? '—'} />
        <KpiCard icon={Warehouse} label="Units on hand" value={kpis.data?.totalUnitsOnHand ?? '—'} />
        <KpiCard
          icon={Warehouse}
          label="Warehouse capacity used"
          value={kpis.data?.warehouseCapacityUsedPct != null ? `${kpis.data.warehouseCapacityUsedPct}%` : '—'}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>7-day throughput</CardTitle>
          </CardHeader>
          <CardContent>
            {throughput.data && <ThroughputChart data={throughput.data} />}
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Receipts</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> Transfers</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Picks</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live activity</CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 overflow-y-auto">
            <ul className="flex flex-col gap-3">
              {activity.data?.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-2 border-b border-border pb-2 text-sm last:border-0">
                  <div>
                    <p className="font-medium">
                      {a.type} &middot; {a.product.sku}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.fromLocation?.code ?? '—'} → {a.toLocation?.code ?? '—'} &middot; {a.user?.fullName ?? 'System'}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleTimeString()}</span>
                </li>
              ))}
              {activity.data?.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
