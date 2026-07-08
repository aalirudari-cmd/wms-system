import { NavLink, Outlet } from 'react-router-dom';
import { Home, Inbox, PackageCheck, MoveRight, ClipboardList, ShieldCheck, WifiOff, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from '../components/shared/ThemeToggle';
import { useOfflineSync } from './useOfflineSync';
import { cn } from '../lib/utils';

const TABS = [
  { to: '/pda', label: 'Home', icon: Home, end: true },
  { to: '/pda/receiving', label: 'Receive', icon: Inbox, permission: ['receiving:process'] },
  { to: '/pda/putaway', label: 'Put Away', icon: PackageCheck, permission: ['putaway:confirm'] },
  { to: '/pda/transfers', label: 'Transfer', icon: MoveRight, permission: ['transfers:complete'] },
  { to: '/pda/picking', label: 'Pick', icon: ClipboardList, permission: ['picking:pick'] },
  { to: '/pda/controlling', label: 'Count', icon: ShieldCheck, permission: ['controlling:count'] },
];

export function PdaLayout() {
  const { user, can, logout } = useAuth();
  const { pending, online } = useOfflineSync();

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div>
          <p className="font-display text-sm font-semibold leading-none">{user?.fullName}</p>
          <p className="text-xs text-muted-foreground">{user?.role}</p>
        </div>
        <div className="flex items-center gap-2">
          {!online && (
            <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-1 text-xs font-medium text-warning">
              <WifiOff className="h-3.5 w-3.5" /> Offline{pending > 0 ? ` · ${pending} queued` : ''}
            </span>
          )}
          {online && pending > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-1 text-xs font-medium text-primary">Syncing {pending}…</span>
          )}
          <ThemeToggle />
          <button onClick={() => logout()} className="pda-tap-target p-2 text-muted-foreground" aria-label="Log out">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-card">
        {TABS.filter((t) => !t.permission || can(...t.permission)).map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'pda-tap-target flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            <tab.icon className="h-6 w-6" />
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
