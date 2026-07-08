import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function ProtectedRoute({ permission }: { permission?: string[] }) {
  const { user, loading, can } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (permission && !can(...permission)) return <Navigate to="/admin" replace />;

  return <Outlet />;
}
