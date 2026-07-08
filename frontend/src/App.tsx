import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './app/ProtectedRoute';
import { AdminLayout } from './admin/AdminLayout';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { InventoryPage } from './features/inventory/InventoryPage';
import { MovementsPage } from './features/movements/MovementsPage';
import { MasterDataPage } from './features/masterdata/MasterDataPage';
import { ProductsPage } from './features/masterdata/ProductsPage';
import { LocationsPage } from './features/masterdata/LocationsPage';
import { ReceivingListPage } from './features/receiving/ReceivingListPage';
import { ReceivingDetailPage } from './features/receiving/ReceivingDetailPage';
import { PutAwayPage } from './features/putaway/PutAwayPage';
import { TransfersPage } from './features/transfers/TransfersPage';
import { PickingPage } from './features/picking/PickingPage';
import { PackingPage } from './features/packing/PackingPage';
import { ControllingPage } from './features/controlling/ControllingPage';
import { UsersPage } from './features/users/UsersPage';
import { RolesPage } from './features/roles/RolesPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { AuditLogPage } from './features/audit/AuditLogPage';
import { PdaLayout } from './pda/PdaLayout';
import { PdaHome } from './pda/PdaHome';
import { PdaReceivingPage } from './pda/PdaReceivingPage';
import { PdaPutAwayPage } from './pda/PdaPutAwayPage';
import { PdaTransfersPage } from './pda/PdaTransfersPage';
import { PdaPickingPage } from './pda/PdaPickingPage';
import { PdaControllingPage } from './pda/PdaControllingPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/admin" replace />} />

        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route element={<ProtectedRoute permission={['inventory:view']} />}>
            <Route path="/admin/inventory" element={<InventoryPage />} />
          </Route>
          <Route element={<ProtectedRoute permission={['movements:view']} />}>
            <Route path="/admin/movements" element={<MovementsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission={['masterdata:view']} />}>
            <Route path="/admin/master-data" element={<MasterDataPage />} />
            <Route path="/admin/products" element={<ProductsPage />} />
            <Route path="/admin/locations" element={<LocationsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission={['receiving:view']} />}>
            <Route path="/admin/receiving" element={<ReceivingListPage />} />
            <Route path="/admin/receiving/:id" element={<ReceivingDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute permission={['putaway:view']} />}>
            <Route path="/admin/putaway" element={<PutAwayPage />} />
          </Route>
          <Route element={<ProtectedRoute permission={['transfers:view']} />}>
            <Route path="/admin/transfers" element={<TransfersPage />} />
          </Route>
          <Route element={<ProtectedRoute permission={['picking:view']} />}>
            <Route path="/admin/picking" element={<PickingPage />} />
          </Route>
          <Route element={<ProtectedRoute permission={['packing:view']} />}>
            <Route path="/admin/packing" element={<PackingPage />} />
          </Route>
          <Route element={<ProtectedRoute permission={['controlling:view']} />}>
            <Route path="/admin/controlling" element={<ControllingPage />} />
          </Route>
          <Route element={<ProtectedRoute permission={['reports:view']} />}>
            <Route path="/admin/reports" element={<ReportsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission={['users:view']} />}>
            <Route path="/admin/users" element={<UsersPage />} />
          </Route>
          <Route element={<ProtectedRoute permission={['roles:view']} />}>
            <Route path="/admin/roles" element={<RolesPage />} />
          </Route>
          <Route element={<ProtectedRoute permission={['audit:view']} />}>
            <Route path="/admin/audit-log" element={<AuditLogPage />} />
          </Route>
        </Route>

        <Route element={<PdaLayout />}>
          <Route path="/pda" element={<PdaHome />} />
          <Route path="/pda/receiving" element={<PdaReceivingPage />} />
          <Route path="/pda/putaway" element={<PdaPutAwayPage />} />
          <Route path="/pda/transfers" element={<PdaTransfersPage />} />
          <Route path="/pda/picking" element={<PdaPickingPage />} />
          <Route path="/pda/controlling" element={<PdaControllingPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
