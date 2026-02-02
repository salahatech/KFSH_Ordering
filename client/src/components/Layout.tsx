import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard,
  Users,
  Building2,
  Package,
  ShoppingCart,
  Calendar,
  CalendarCheck,
  FlaskConical,
  ClipboardCheck,
  CheckCircle,
  Truck,
  BarChart3,
  FileText,
  LogOut,
  Menu,
  X,
  Bell,
  FileCheck,
  Syringe,
  CalendarClock,
  FileSignature,
  Receipt,
  Settings,
} from 'lucide-react';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/approvals', label: 'Approvals', icon: FileCheck },
  { path: '/customers', label: 'Customers', icon: Building2 },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/availability', label: 'Availability', icon: CalendarClock },
  { path: '/reservations', label: 'Reservations', icon: CalendarCheck },
  { path: '/planner', label: 'Planner', icon: Calendar },
  { path: '/batches', label: 'Batches', icon: FlaskConical },
  { path: '/qc', label: 'QC Testing', icon: ClipboardCheck },
  { path: '/release', label: 'QP Release', icon: CheckCircle },
  { path: '/dispensing', label: 'Dispensing', icon: Syringe },
  { path: '/shipments', label: 'Logistics', icon: Truck },
  { path: '/contracts', label: 'Contracts', icon: FileSignature },
  { path: '/invoices', label: 'Invoicing', icon: Receipt },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/audit', label: 'Audit Log', icon: FileText },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: sidebarOpen ? '16rem' : '4rem',
          background: 'linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)',
          color: 'white',
          transition: 'width 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          height: '100vh',
          zIndex: 40,
        }}
      >
        <div
          style={{
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {sidebarOpen && (
            <div>
              <h1 style={{ fontSize: '1.125rem', fontWeight: 700 }}>RadioPharma</h1>
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>OMS</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              padding: '0.5rem',
            }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav style={{ flex: 1, padding: '0.5rem', overflowY: 'auto' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  marginBottom: '0.25rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={20} />
                {sidebarOpen && <span style={{ fontSize: '0.875rem' }}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div
          style={{
            padding: '1rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            <LogOut size={20} />
            {sidebarOpen && <span style={{ fontSize: '0.875rem' }}>Logout</span>}
          </button>
        </div>
      </aside>

      <div
        style={{
          flex: 1,
          marginLeft: sidebarOpen ? '16rem' : '4rem',
          transition: 'margin-left 0.2s ease',
        }}
      >
        <header
          style={{
            background: 'white',
            borderBottom: '1px solid var(--border)',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {menuItems.find((m) => m.path === location.pathname)?.label || 'RadioPharma OMS'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              style={{
                background: 'none',
                border: 'none',
                padding: '0.5rem',
                position: 'relative',
              }}
            >
              <Bell size={20} />
            </button>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'var(--bg-secondary)',
                borderRadius: '9999px',
              }}
            >
              <div
                style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  {user?.firstName} {user?.lastName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role}</div>
              </div>
            </div>
          </div>
        </header>

        <main style={{ padding: '1.5rem' }}>{children}</main>
      </div>
    </div>
  );
}
