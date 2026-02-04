import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  LogOut,
  Menu,
  X,
  Plus,
  Building2,
  Calendar,
  Ticket,
} from 'lucide-react';
import AnnouncementBar from './AnnouncementBar';
import HeaderBar from './shared/HeaderBar';

const portalMenuItems = [
  { path: '/portal', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/portal/book-capacity', label: 'Book Capacity', icon: Calendar },
  { path: '/portal/orders', label: 'My Orders', icon: ShoppingCart },
  { path: '/portal/orders/new', label: 'Place Order', icon: Plus },
  { path: '/portal/invoices', label: 'Invoices', icon: Receipt },
  { path: '/portal/helpdesk', label: 'Support', icon: Ticket },
  { path: '/portal/profile', label: 'My Profile', icon: Building2 },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { language } = useLanguageStore();
  const isRtl = language === 'ar';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: sidebarOpen ? '16rem' : '4rem',
          background: 'linear-gradient(180deg, #0d9488 0%, #115e59 100%)',
          color: 'white',
          transition: 'width 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          height: '100vh',
          zIndex: 40,
          left: isRtl ? 'auto' : 0,
          right: isRtl ? 0 : 'auto',
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
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Client Portal</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              padding: '0.5rem',
              cursor: 'pointer',
            }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav style={{ flex: 1, padding: '0.5rem', overflowY: 'auto' }}>
          {portalMenuItems.map((item) => {
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
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
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
          marginLeft: isRtl ? 0 : (sidebarOpen ? '16rem' : '4rem'),
          marginRight: isRtl ? (sidebarOpen ? '16rem' : '4rem') : 0,
          transition: 'margin 0.2s ease',
        }}
      >
        <header
          style={{
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border)',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Building2 size={20} style={{ color: '#0d9488' }} />
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                {portalMenuItems.find((m) => m.path === location.pathname)?.label || 'Client Portal'}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {user?.customerName || 'Customer Portal'}
              </span>
            </div>
          </div>

          <HeaderBar 
            showSearch={true} 
            notificationCenterPath="/portal/notifications"
            accentColor="#0d9488"
          />

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
                background: '#0d9488',
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
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer</div>
            </div>
          </div>
        </header>

        <AnnouncementBar />

        <main style={{ padding: '1.5rem', background: '#f8fafc', minHeight: 'calc(100vh - 73px)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
