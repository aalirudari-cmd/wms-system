import { Download } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../auth/AuthContext';

const REPORTS = [
  { key: 'inventory', title: 'Inventory Report', description: 'Current stock by product and location.' },
  { key: 'movements', title: 'Product Movement Report', description: 'Full stock movement history.' },
  { key: 'receiving', title: 'Receiving Report', description: 'Goods receipts and line totals.' },
  { key: 'operator-performance', title: 'Operator Performance', description: 'Movements recorded per user.' },
];

export function ReportsPage() {
  const { can } = useAuth();

  function download(key: string) {
    // Downloads go through the browser's normal navigation so the auth
    // cookie/token flow doesn't need to be replicated for a file download.
    window.open(`/api/reports/${key}`, '_blank');
  }

  return (
    <div>
      <PageHeader title="Reports" description="Export warehouse activity as CSV. Excel/PDF export is on the roadmap (see ARCHITECTURE.md)." />
      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Card key={r.key}>
            <CardHeader>
              <CardTitle>{r.title}</CardTitle>
              <CardDescription>{r.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled={!can('reports:export')} onClick={() => download(r.key)}>
                <Download className="mr-1 h-4 w-4" /> Export CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
