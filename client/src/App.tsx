import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
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
        path="/*"
        element={
          <ProtectedRoute>
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
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
