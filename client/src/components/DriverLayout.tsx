import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useBranding } from '../hooks/useBranding';
import { Home, Truck, LogOut, User } from 'lucide-react';
import AnnouncementBar from './AnnouncementBar';
import HeaderBar from './shared/HeaderBar';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { siteLogo, siteName } = useBranding();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/driver', icon: Home, label: 'Dashboard' },
    { path: '/driver/shipments', icon: Truck, label: 'Shipments' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
      <header style={{
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {siteLogo ? (
              <img 
                src={siteLogo} 
                alt={siteName} 
                style={{ 
                  width: '36px', 
                  height: '36px', 
                  objectFit: 'contain',
                  borderRadius: '8px',
                }} 
              />
            ) : (
              <div style={{
                width: '36px',
                height: '36px',
                backgroundColor: 'var(--primary)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}>
                <Truck size={20} />
              </div>
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Driver Portal</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{siteName} OMS</div>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: '0.5rem' }}>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path !== '/driver' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius)',
                    backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                    textDecoration: 'none',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '0.875rem',
                  }}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <HeaderBar 
          showSearch={false} 
          notificationCenterPath="/driver/notifications"
          accentColor="var(--primary)"
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}>
              <User size={16} />
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              {user?.firstName} {user?.lastName}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>
      <AnnouncementBar />
      <main style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
