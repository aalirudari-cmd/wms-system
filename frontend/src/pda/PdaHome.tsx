import { Link } from 'react-router-dom';
import { Inbox, PackageCheck, MoveRight, ClipboardList, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { cn } from '../lib/utils';

const ACTIONS = [
  { to: '/pda/receiving', label: 'Receive', icon: Inbox, permission: ['receiving:process'], color: 'bg-primary/10 text-primary' },
  { to: '/pda/putaway', label: 'Put Away', icon: PackageCheck, permission: ['putaway:confirm'], color: 'bg-success/10 text-success' },
  { to: '/pda/transfers', label: 'Transfer', icon: MoveRight, permission: ['transfers:complete'], color: 'bg-warning/10 text-warning' },
  { to: '/pda/picking', label: 'Pick', icon: ClipboardList, permission: ['picking:pick'], color: 'bg-primary/10 text-primary' },
  { to: '/pda/controlling', label: 'Count', icon: ShieldCheck, permission: ['controlling:count'], color: 'bg-destructive/10 text-destructive' },
];

export function PdaHome() {
  const { can } = useAuth();
  const actions = ACTIONS.filter((a) => can(...a.permission));

  return (
    <div>
      <h1 className="font-display mb-4 text-xl font-semibold">What are you doing?</h1>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="pda-tap-target flex flex-col items-center justify-center gap-3 rounded-2xl border border-border p-6 shadow-sm active:scale-95 transition-transform"
          >
            <span className={cn('rounded-2xl p-4', a.color)}>
              <a.icon className="h-9 w-9" />
            </span>
            <span className="text-base font-semibold">{a.label}</span>
          </Link>
        ))}
        {actions.length === 0 && <p className="col-span-2 text-center text-muted-foreground">No scan tasks available for your role.</p>}
      </div>
    </div>
  );
}
