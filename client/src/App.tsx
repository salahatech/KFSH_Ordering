import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import PortalLayout from './components/PortalLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
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
import Contracts from './pages/Contracts';
import Invoices from './pages/Invoices';
import PortalDashboard from './pages/portal/PortalDashboard';
import PortalOrders from './pages/portal/PortalOrders';
import PortalNewOrder from './pages/portal/PortalNewOrder';
import PortalInvoices from './pages/portal/PortalInvoices';

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
                <Route path="/invoices" element={<PortalInvoices />} />
              </Routes>
            </PortalLayout>
          </CustomerRoute>
        }
      />
      
      <Route
        path="/*"
        element={
          <InternalRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/products" element={<Products />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/new" element={<OrderForm />} />
                <Route path="/orders/:id" element={<OrderForm />} />
                <Route path="/planner" element={<Planner />} />
                <Route path="/batches" element={<Batches />} />
                <Route path="/qc" element={<QC />} />
                <Route path="/release" element={<Release />} />
                <Route path="/shipments" element={<Shipments />} />
                <Route path="/users" element={<Users />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/audit" element={<AuditLog />} />
                <Route path="/approvals" element={<Approvals />} />
                <Route path="/dispensing" element={<Dispensing />} />
                <Route path="/availability" element={<Availability />} />
                <Route path="/contracts" element={<Contracts />} />
                <Route path="/invoices" element={<Invoices />} />
              </Routes>
            </Layout>
          </InternalRoute>
        }
      />
    </Routes>
  );
}
