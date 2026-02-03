import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ToastProvider } from './components/ui/Toast';
import Layout from './components/Layout';
import PortalLayout from './components/PortalLayout';
import DriverLayout from './components/DriverLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerForm from './pages/CustomerForm';
import Products from './pages/Products';
import Orders from './pages/Orders';
import OrderForm from './pages/OrderForm';
import Planner from './pages/Planner';
import Batches from './pages/Batches';
import QC from './pages/QC';
import Release from './pages/Release';
import Shipments from './pages/Shipments';
import Users from './pages/Users';
import Reports from './pages/Reports';
import AuditLog from './pages/AuditLog';
import Approvals from './pages/Approvals';
import Dispensing from './pages/Dispensing';
import Availability from './pages/Availability';
import Reservations from './pages/Reservations';
import Contracts from './pages/Contracts';
import Invoices from './pages/Invoices';
import OrderJourney from './pages/OrderJourney';
import BatchJourney from './pages/BatchJourney';
import PortalDashboard from './pages/portal/PortalDashboard';
import PortalOrders from './pages/portal/PortalOrders';
import PortalNewOrder from './pages/portal/PortalNewOrder';
import PortalInvoices from './pages/portal/PortalInvoices';
import PortalOrderJourney from './pages/portal/PortalOrderJourney';
import PortalProfile from './pages/portal/PortalProfile';
import Settings from './pages/Settings';
import DashboardQC from './pages/DashboardQC';
import DashboardQP from './pages/DashboardQP';
import DashboardDispensing from './pages/DashboardDispensing';
import DashboardLogistics from './pages/DashboardLogistics';
import PaymentApprovals from './pages/admin/PaymentApprovals';
import AdminDemo from './pages/AdminDemo';
import Drivers from './pages/Drivers';
import ShipmentDetail from './pages/ShipmentDetail';
import DriverDashboard from './pages/driver/DriverDashboard';
import DriverShipments from './pages/driver/DriverShipments';
import DriverShipmentDetail from './pages/driver/DriverShipmentDetail';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="loading-overlay" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function CustomerRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="loading-overlay" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'Customer') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function DriverRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="loading-overlay" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'Driver') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function InternalRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="loading-overlay" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'Customer') {
    return <Navigate to="/portal" replace />;
  }

  if (user?.role === 'Driver') {
    return <Navigate to="/driver" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="loading-overlay" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/portal/*"
          element={
            <CustomerRoute>
              <PortalLayout>
                <Routes>
                  <Route path="/" element={<PortalDashboard />} />
                  <Route path="/orders" element={<PortalOrders />} />
                  <Route path="/orders/new" element={<PortalNewOrder />} />
                  <Route path="/orders/:id/journey" element={<PortalOrderJourney />} />
                  <Route path="/invoices" element={<PortalInvoices />} />
                  <Route path="/profile" element={<PortalProfile />} />
                </Routes>
              </PortalLayout>
            </CustomerRoute>
          }
        />
        
        <Route
          path="/driver/*"
          element={
            <DriverRoute>
              <DriverLayout>
                <Routes>
                  <Route path="/" element={<DriverDashboard />} />
                  <Route path="/shipments" element={<DriverShipments />} />
                  <Route path="/shipments/:id" element={<DriverShipmentDetail />} />
                </Routes>
              </DriverLayout>
            </DriverRoute>
          }
        />
        
        <Route
          path="/*"
          element={
            <InternalRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard/qc" element={<DashboardQC />} />
                  <Route path="/dashboard/qp" element={<DashboardQP />} />
                  <Route path="/dashboard/dispensing" element={<DashboardDispensing />} />
                  <Route path="/dashboard/logistics" element={<DashboardLogistics />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/customers/new" element={<CustomerForm />} />
                  <Route path="/customers/:id/edit" element={<CustomerForm />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/orders/new" element={<OrderForm />} />
                  <Route path="/orders/:id" element={<OrderForm />} />
                  <Route path="/orders/:id/journey" element={<OrderJourney />} />
                  <Route path="/planner" element={<Planner />} />
                  <Route path="/batches" element={<Batches />} />
                  <Route path="/batches/:id/journey" element={<BatchJourney />} />
                  <Route path="/qc" element={<QC />} />
                  <Route path="/release" element={<Release />} />
                  <Route path="/shipments" element={<Shipments />} />
                  <Route path="/shipments/:id" element={<ShipmentDetail />} />
                  <Route path="/drivers" element={<Drivers />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/audit" element={<AuditLog />} />
                  <Route path="/approvals" element={<Approvals />} />
                  <Route path="/dispensing" element={<Dispensing />} />
                  <Route path="/availability" element={<Availability />} />
                  <Route path="/reservations" element={<Reservations />} />
                  <Route path="/contracts" element={<Contracts />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/payments" element={<PaymentApprovals />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/admin/demo" element={<AdminDemo />} />
                </Routes>
              </Layout>
            </InternalRoute>
          }
        />
      </Routes>
    </ToastProvider>
  );
}
