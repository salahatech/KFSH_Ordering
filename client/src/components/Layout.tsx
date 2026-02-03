import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';
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
  Clock,
  Globe,
  DollarSign,
  Languages,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

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
  { path: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/approvals', labelKey: 'nav.approvals', icon: FileCheck },
  { path: '/customers', labelKey: 'nav.customers', icon: Building2 },
  { path: '/products', labelKey: 'nav.products', icon: Package },
  { path: '/materials', labelKey: 'nav.materials', icon: FlaskConical },
  { path: '/recipes', labelKey: 'nav.recipes', icon: FileText },
  { path: '/suppliers', labelKey: 'nav.suppliers', icon: Building2 },
  { path: '/purchase-orders', labelKey: 'nav.purchaseOrders', icon: ShoppingCart },
  { path: '/warehouses', labelKey: 'nav.warehouses', icon: Warehouse },
  { path: '/grn', labelKey: 'nav.goodsReceiving', icon: PackageCheck },
  { path: '/inventory', labelKey: 'nav.inventory', icon: Boxes },
  { path: '/manufacturing', labelKey: 'nav.manufacturing', icon: Factory },
  { path: '/orders', labelKey: 'nav.orders', icon: ShoppingCart },
  { path: '/availability', labelKey: 'nav.availability', icon: CalendarClock },
  { path: '/reservations', labelKey: 'nav.reservations', icon: CalendarCheck },
  { path: '/planner', labelKey: 'nav.planner', icon: Calendar },
  { path: '/batches', labelKey: 'nav.batches', icon: FlaskConical },
  { path: '/qc', labelKey: 'nav.qc', icon: ClipboardCheck },
  { path: '/oos-investigations', labelKey: 'nav.oosInvestigations', icon: AlertTriangle },
  { path: '/release', labelKey: 'nav.release', icon: CheckCircle },
  { path: '/dispensing', labelKey: 'nav.dispensing', icon: Syringe },
  { path: '/shipments', labelKey: 'nav.shipments', icon: Truck },
  { path: '/contracts', labelKey: 'nav.contracts', icon: FileSignature },
  { path: '/invoices', labelKey: 'nav.invoices', icon: Receipt },
  { path: '/payments', labelKey: 'nav.payments', icon: CreditCard },
  { path: '/enterprise-reports', labelKey: 'Enterprise Reports', icon: FileText },
  { path: '/users', labelKey: 'nav.users', icon: Users },
  { path: '/roles', labelKey: 'nav.roles', icon: Shield },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings },
  { path: '/audit', labelKey: 'nav.auditLog', icon: FileText },
];

interface SystemSettings {
  timezone: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  currencyCode: string;
  currency?: {
    code: string;
    symbol: string;
    name: string;
  };
}

const TIMEZONE_ABBR: Record<string, string> = {
  'Asia/Riyadh': 'AST',
  'Asia/Dubai': 'GST',
  'Asia/Kuwait': 'AST',
  'Asia/Bahrain': 'AST',
  'Asia/Qatar': 'AST',
  'Europe/London': 'GMT',
  'Europe/Paris': 'CET',
  'America/New_York': 'EST',
  'America/Los_Angeles': 'PST',
  'UTC': 'UTC',
};

const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'EN',
  'ar': 'AR',
  'fr': 'FR',
  'es': 'ES',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const notificationRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();

  const { data: systemSettings } = useQuery<SystemSettings>({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings/system');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const getFormattedTime = () => {
    if (!systemSettings?.timezone) return format(currentTime, 'HH:mm');
    try {
      return currentTime.toLocaleTimeString('en-US', {
        timeZone: systemSettings.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return format(currentTime, 'HH:mm');
    }
  };

  const getFormattedDate = () => {
    if (!systemSettings?.timezone) return format(currentTime, 'EEE, MMM d, yyyy');
    try {
      return currentTime.toLocaleDateString('en-US', {
        timeZone: systemSettings.timezone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return format(currentTime, 'EEE, MMM d, yyyy');
    }
  };

  const timezoneAbbr = systemSettings?.timezone ? (TIMEZONE_ABBR[systemSettings.timezone] || systemSettings.timezone.split('/').pop()) : 'AST';
  const languageCode = LANGUAGE_NAMES[systemSettings?.language || 'en'] || 'EN';
  const currencyCode = systemSettings?.currency?.code || systemSettings?.currencyCode || 'SAR';

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
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setLanguageMenuOpen(false);
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
                {sidebarOpen && <span style={{ fontSize: '0.875rem' }}>{t(item.labelKey)}</span>}
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
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border)',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
              {menuItems.find((m) => m.path === location.pathname)?.label || 'RadioPharma OMS'}
            </h2>
          </div>

          {/* Context Bar - Date, Time, Language, Currency */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.25rem',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '0.375rem 0.5rem',
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.375rem',
              padding: '0.25rem 0.625rem',
              borderRight: '1px solid var(--border)',
            }}>
              <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                {getFormattedDate()}
              </span>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.375rem',
              padding: '0.25rem 0.625rem',
              borderRight: '1px solid var(--border)',
            }}>
              <Clock size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                {getFormattedTime()}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{timezoneAbbr}</span>
            </div>
            <div ref={languageRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.375rem',
                  padding: '0.25rem 0.625rem',
                  borderRight: '1px solid var(--border)',
                  background: languageMenuOpen ? 'var(--bg-secondary)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
              >
                <Languages size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{language === 'ar' ? 'AR' : 'EN'}</span>
              </button>
              {languageMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-lg)',
                  minWidth: '140px',
                  zIndex: 1000,
                  overflow: 'hidden',
                }}>
                  <button
                    onClick={() => { setLanguage('en'); setLanguageMenuOpen(false); }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      border: 'none',
                      background: language === 'en' ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontWeight: language === 'en' ? 600 : 400 }}>English</span>
                    {language === 'en' && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--primary)' }} />}
                  </button>
                  <button
                    onClick={() => { setLanguage('ar'); setLanguageMenuOpen(false); }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      border: 'none',
                      background: language === 'ar' ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      textAlign: 'left',
                      fontFamily: "'Cairo', sans-serif",
                    }}
                  >
                    <span style={{ fontWeight: language === 'ar' ? 600 : 400 }}>العربية</span>
                    {language === 'ar' && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--primary)' }} />}
                  </button>
                </div>
              )}
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.375rem',
              padding: '0.25rem 0.625rem',
            }}>
              <DollarSign size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{currencyCode}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ThemeToggle />
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
              onClick={() => {
                const isAdmin = user?.role === 'Admin' || user?.role === 'ADMIN' || user?.role?.toLowerCase() === 'admin';
                navigate(isAdmin ? '/settings' : '/profile');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'var(--bg-secondary)',
                borderRadius: '9999px',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              title={user?.role === 'Admin' || user?.role === 'ADMIN' ? 'Go to Settings' : 'Go to Profile'}
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
