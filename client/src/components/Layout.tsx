import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { format } from 'date-fns';
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
  AlertTriangle,
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
  CreditCard,
  Check,
  Shield,
  Warehouse,
  PackageCheck,
  Boxes,
  Factory,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
  relatedType?: string;
}

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/approvals', label: 'Approvals', icon: FileCheck },
  { path: '/customers', label: 'Customers', icon: Building2 },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/materials', label: 'Materials', icon: FlaskConical },
  { path: '/recipes', label: 'Recipes/BOM', icon: FileText },
  { path: '/suppliers', label: 'Suppliers', icon: Building2 },
  { path: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
  { path: '/warehouses', label: 'Warehouses', icon: Warehouse },
  { path: '/grn', label: 'Goods Receiving', icon: PackageCheck },
  { path: '/inventory', label: 'Inventory', icon: Boxes },
  { path: '/manufacturing', label: 'Manufacturing', icon: Factory },
  { path: '/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/availability', label: 'Availability', icon: CalendarClock },
  { path: '/reservations', label: 'Reservations', icon: CalendarCheck },
  { path: '/planner', label: 'Planner', icon: Calendar },
  { path: '/batches', label: 'Batches', icon: FlaskConical },
  { path: '/qc', label: 'QC Testing', icon: ClipboardCheck },
  { path: '/oos-investigations', label: 'OOS/OOT Investigations', icon: AlertTriangle },
  { path: '/release', label: 'QP Release', icon: CheckCircle },
  { path: '/dispensing', label: 'Dispensing', icon: Syringe },
  { path: '/shipments', label: 'Logistics', icon: Truck },
  { path: '/contracts', label: 'Contracts', icon: FileSignature },
  { path: '/invoices', label: 'Invoicing', icon: Receipt },
  { path: '/payments', label: 'Payment Approvals', icon: CreditCard },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/roles', label: 'Roles', icon: Shield },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/audit', label: 'Audit Log', icon: FileText },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();

  const { data: notificationData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications?limit=10');
      return data as { notifications: Notification[]; unreadCount: number };
    },
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const unreadCount = notificationData?.unreadCount || 0;
  const notifications = notificationData?.notifications || [];

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
            <div ref={notificationRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                style={{
                  background: notificationOpen ? 'var(--bg-secondary)' : 'none',
                  border: 'none',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {notificationOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  width: '360px',
                  maxHeight: '480px',
                  background: 'var(--bg-primary)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  zIndex: 100,
                }}>
                  <div style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <h4 style={{ margin: 0, fontWeight: 600 }}>Notifications</h4>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllReadMutation.mutate()}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <Check size={12} />
                        Mark all read
                      </button>
                    )}
                  </div>
                  
                  <div style={{ maxHeight: '360px', overflow: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                      }}>
                        <Bell size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                        <div>No notifications</div>
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => {
                            if (!notification.isRead) {
                              markReadMutation.mutate(notification.id);
                            }
                          }}
                          style={{
                            padding: '0.875rem 1rem',
                            borderBottom: '1px solid var(--border)',
                            background: notification.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                            cursor: notification.isRead ? 'default' : 'pointer',
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                          }}>
                            {!notification.isRead && (
                              <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: 'var(--primary)',
                                marginTop: '6px',
                                flexShrink: 0,
                              }} />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: notification.isRead ? 400 : 600,
                                fontSize: '0.875rem',
                                marginBottom: '0.25rem',
                              }}>
                                {notification.title}
                              </div>
                              <div style={{
                                fontSize: '0.8rem',
                                color: 'var(--text-muted)',
                                lineHeight: 1.4,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}>
                                {notification.message}
                              </div>
                              <div style={{
                                fontSize: '0.7rem',
                                color: 'var(--text-muted)',
                                marginTop: '0.375rem',
                              }}>
                                {format(new Date(notification.createdAt), 'MMM dd, HH:mm')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderTop: '1px solid var(--border)',
                    textAlign: 'center',
                  }}>
                    <Link
                      to="/notifications"
                      onClick={() => setNotificationOpen(false)}
                      style={{
                        color: 'var(--primary)',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textDecoration: 'none',
                      }}
                    >
                      View All Notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>
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
