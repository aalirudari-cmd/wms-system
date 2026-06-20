import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import { Spinner } from './components/ui.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import Products from './pages/Products.jsx';
import Receiving from './pages/Receiving.jsx';
import Shipping from './pages/Shipping.jsx';
import Movements from './pages/Movements.jsx';
import Scan from './pages/Scan.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';

// Wrap an authenticated page in the shell.
const page = (el, role) => (
  <ProtectedRoute role={role}>
    <Layout>{el}</Layout>
  </ProtectedRoute>
);

export default function App() {
  const { loading } = useAuth();
  if (loading) return <Spinner label="Connecting to terminal…" />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={page(<Dashboard />)} />
      <Route path="/scan" element={page(<Scan />)} />
      <Route path="/inventory" element={page(<Inventory />)} />
      <Route path="/products" element={page(<Products />)} />
      <Route path="/receiving" element={page(<Receiving />)} />
      <Route path="/shipping" element={page(<Shipping />)} />
      <Route path="/movements" element={page(<Movements />)} />
      <Route path="/reports" element={page(<Reports />, 'manager')} />
      <Route path="/users" element={page(<Users />, 'admin')} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
