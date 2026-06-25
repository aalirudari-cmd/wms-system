import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Trades from './pages/Trades.jsx';
import NewTrade from './pages/NewTrade.jsx';
import TradeDetail from './pages/TradeDetail.jsx';
import Checklist from './pages/Checklist.jsx';
import Planning from './pages/Planning.jsx';
import Calculators from './pages/Calculators.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-page muted">Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/trades" element={<Trades />} />
        <Route path="/trades/new" element={<NewTrade />} />
        <Route path="/trades/:id" element={<TradeDetail />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/planning" element={<Planning />} />
        <Route path="/calculators" element={<Calculators />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
