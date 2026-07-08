import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Menu, LogOut, Boxes, Smartphone } from 'lucide-react';
import { adminNav } from '../app/nav';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from '../components/shared/ThemeToggle';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';

function SidebarLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAuth();
  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
      {adminNav
        .filter((item) => !item.permission || can(...item.permission))
        .map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
    </nav>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-2 px-4 py-4">
          <Boxes className="h-6 w-6 text-primary" />
          <span className="font-display text-lg font-semibold">Stockhaus</span>
        </div>
        <SidebarLinks />
        <div className="border-t border-border p-3">
          <a href="/pda" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
            <Smartphone className="h-4 w-4" /> Open PDA mode
          </a>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative flex w-64 flex-col bg-card">
            <div className="flex items-center gap-2 px-4 py-4">
              <Boxes className="h-6 w-6 text-primary" />
              <span className="font-display text-lg font-semibold">Stockhaus</span>
            </div>
            <SidebarLinks onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium leading-none">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Log out" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
