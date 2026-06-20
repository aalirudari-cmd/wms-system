import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

// Gate a route on authentication and, optionally, a minimum role.
export default function ProtectedRoute({ children, role }) {
  const { user, can } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && !can(role)) return <Navigate to="/" replace />;
  return children;
}
