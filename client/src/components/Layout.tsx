import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';
import { useFavoritesStore } from '../store/favoritesStore';
import { useCurrencyStore } from '../store/currencyStore';
import api from '../lib/api';
import { useLocalization } from '../hooks/useLocalization';
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
  ChevronDown,
  ChevronRight,
  Star,
  StarOff,
  BarChart3,
  Ticket,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import AnnouncementBar from './AnnouncementBar';
import GlobalSearch from './GlobalSearch';
import Breadcrumbs from './Breadcrumbs';

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

interface MenuItem {
  path: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
}

interface MenuSection {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    id: 'orders',
    label: 'Orders & Customers',
    icon: ShoppingCart,
    items: [
      { path: '/orders', labelKey: 'nav.orders', icon: ShoppingCart },
      { path: '/customers', labelKey: 'nav.customers', icon: Building2 },
      { path: '/contracts', labelKey: 'nav.contracts', icon: FileSignature },
      { path: '/availability', labelKey: 'nav.availability', icon: CalendarClock },
      { path: '/reservations', labelKey: 'nav.reservations', icon: CalendarCheck },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    icon: Factory,
    items: [
      { path: '/planner', labelKey: 'nav.planner', icon: Calendar },
      { path: '/production-schedule', labelKey: 'nav.productionSchedule', icon: BarChart3 },
      { path: '/batches', labelKey: 'nav.batches', icon: FlaskConical },
      { path: '/manufacturing', labelKey: 'nav.manufacturing', icon: Factory },
      { path: '/dispensing', labelKey: 'nav.dispensing', icon: Syringe },
    ],
  },
  {
    id: 'quality',
    label: 'Quality',
    icon: ClipboardCheck,
    items: [
      { path: '/qc', labelKey: 'nav.qc', icon: ClipboardCheck },
      { path: '/oos-investigations', labelKey: 'nav.oosInvestigations', icon: AlertTriangle },
      { path: '/release', labelKey: 'nav.release', icon: CheckCircle },
    ],
  },
  {
    id: 'logistics',
    label: 'Logistics',
    icon: Truck,
    items: [
      { path: '/shipments', labelKey: 'nav.shipments', icon: Truck },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory & Supply',
    icon: Warehouse,
    items: [
      { path: '/products', labelKey: 'nav.products', icon: Package },
      { path: '/materials', labelKey: 'nav.materials', icon: FlaskConical },
      { path: '/recipes', labelKey: 'nav.recipes', icon: FileText },
      { path: '/suppliers', labelKey: 'nav.suppliers', icon: Building2 },
      { path: '/purchase-orders', labelKey: 'nav.purchaseOrders', icon: ShoppingCart },
      { path: '/warehouses', labelKey: 'nav.warehouses', icon: Warehouse },
      { path: '/grn', labelKey: 'nav.goodsReceiving', icon: PackageCheck },
      { path: '/inventory', labelKey: 'nav.inventory', icon: Boxes },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: CreditCard,
    items: [
      { path: '/invoices', labelKey: 'nav.invoices', icon: Receipt },
      { path: '/payments', labelKey: 'nav.payments', icon: CreditCard },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: Settings,
    items: [
      { path: '/approvals', labelKey: 'nav.approvals', icon: FileCheck },
      { path: '/admin/helpdesk', labelKey: 'Support Tickets', icon: Ticket },
      { path: '/users', labelKey: 'nav.users', icon: Users },
      { path: '/roles', labelKey: 'nav.roles', icon: Shield },
      { path: '/enterprise-reports', labelKey: 'Enterprise Reports', icon: FileText },
      { path: '/settings', labelKey: 'nav.settings', icon: Settings },
      { path: '/audit', labelKey: 'nav.auditLog', icon: FileText },
    ],
  },
];

const allMenuItems = [
  { path: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  ...menuSections.flatMap(s => s.items),
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
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const getInitialExpandedSections = (): string[] => {
    const stored = localStorage.getItem('radiopharma-expanded-sections');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return ['orders', 'production'];
      }
    }
    return ['orders', 'production'];
  };
  
  const [expandedSections, setExpandedSections] = useState<string[]>(getInitialExpandedSections);
  const notificationRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { favorites, toggleFavorite } = useFavoritesStore();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [location.pathname]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();
  const { currency: selectedCurrency, setCurrency } = useCurrencyStore();
  const isRtl = language === 'ar';
  const { formatTimeOnly, formatDateOnly, formatDateTime, exchangeRates } = useLocalization();

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
    return formatTimeOnly(currentTime);
  };

  const getFormattedDate = () => {
    return formatDateOnly(currentTime);
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
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setCurrencyMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newState = prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId];
      localStorage.setItem('radiopharma-expanded-sections', JSON.stringify(newState));
      return newState;
    });
  };

  useEffect(() => {
    const activeSection = menuSections.find(section =>
      section.items.some(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'))
    );
    if (activeSection && !expandedSections.includes(activeSection.id)) {
      setExpandedSections(prev => {
        const newState = [...prev, activeSection.id];
        localStorage.setItem('radiopharma-expanded-sections', JSON.stringify(newState));
        return newState;
      });
    }
  }, [location.pathname]);

  const unreadCount = notificationData?.unreadCount || 0;
  const notifications = notificationData?.notifications || [];

  const showSidebar = isMobile ? mobileMenuOpen : true;
  const sidebarWidth = isMobile ? '16rem' : (sidebarOpen ? '16rem' : '4rem');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {isMobile && mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 35,
          }}
        />
      )}
      
      <aside
        style={{
          width: sidebarWidth,
          background: 'linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)',
          color: 'white',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          height: '100vh',
          zIndex: 40,
          left: isRtl ? 'auto' : 0,
          right: isRtl ? 0 : 'auto',
          transform: isMobile && !mobileMenuOpen 
            ? (isRtl ? 'translateX(100%)' : 'translateX(-100%)') 
            : 'translateX(0)',
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
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700 }}>RadioPharma</h1>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>OMS</span>
          </div>
          {isMobile ? (
            <button
              onClick={() => setMobileMenuOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                padding: '0.5rem',
              }}
            >
              <X size={20} />
            </button>
          ) : (
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
          )}
        </div>

        <nav style={{ flex: 1, padding: '0.5rem', overflowY: 'auto' }}>
          <Link
            to="/"
            onClick={() => isMobile && setMobileMenuOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              borderRadius: '8px',
              textDecoration: 'none',
              color: location.pathname === '/' ? 'white' : 'rgba(255,255,255,0.7)',
              background: location.pathname === '/' ? 'rgba(255,255,255,0.1)' : 'transparent',
              marginBottom: '0.25rem',
            }}
          >
            <LayoutDashboard size={20} />
            {(isMobile || sidebarOpen) && <span style={{ fontSize: '0.875rem' }}>{t('nav.dashboard')}</span>}
          </Link>

          {favorites.length > 0 && (isMobile || sidebarOpen) && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{
                fontSize: '0.6875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'rgba(255,255,255,0.5)',
                padding: '0.5rem 0.75rem 0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}>
                <Star size={12} />
                Favorites
              </div>
              {favorites.map((favPath) => {
                const item = allMenuItems.find(m => m.path === favPath);
                if (!item) return null;
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={`fav-${item.path}`}
                    to={item.path}
                    onClick={() => isMobile && setMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                      background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                      marginBottom: '0.125rem',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <Icon size={16} />
                    <span>{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {menuSections.map((section) => {
            const SectionIcon = section.icon;
            const isExpanded = expandedSections.includes(section.id);
            const hasActiveItem = section.items.some(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'));

            return (
              <div key={section.id} style={{ marginBottom: '0.25rem' }}>
                <button
                  onClick={() => toggleSection(section.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: hasActiveItem && !isExpanded ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: 'none',
                    color: hasActiveItem ? 'white' : 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <SectionIcon size={20} />
                  {(isMobile || sidebarOpen) && (
                    <>
                      <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: hasActiveItem ? 500 : 400 }}>
                        {section.label}
                      </span>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </>
                  )}
                </button>

                {isExpanded && (isMobile || sidebarOpen) && (
                  <div style={{ paddingLeft: '1rem', marginTop: '0.125rem' }}>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                      const isFav = favorites.includes(item.path);
                      return (
                        <div
                          key={item.path}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <Link
                            to={item.path}
                            onClick={() => isMobile && setMobileMenuOpen(false)}
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.625rem',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
                              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                              marginBottom: '0.125rem',
                              fontSize: '0.8125rem',
                            }}
                          >
                            <Icon size={16} />
                            <span>{t(item.labelKey)}</span>
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(item.path);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '0.375rem',
                              cursor: 'pointer',
                              color: isFav ? '#fbbf24' : 'rgba(255,255,255,0.3)',
                              opacity: isFav ? 1 : 0.5,
                            }}
                            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            {isFav ? <Star size={14} fill="#fbbf24" /> : <StarOff size={14} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
            {(isMobile || sidebarOpen) && <span style={{ fontSize: '0.875rem' }}>Logout</span>}
          </button>
        </div>
      </aside>

      <div
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : (isRtl ? 0 : (sidebarOpen ? '16rem' : '4rem')),
          marginRight: isMobile ? 0 : (isRtl ? (sidebarOpen ? '16rem' : '4rem') : 0),
          transition: 'margin 0.2s ease',
        }}
      >
        <header
          style={{
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border)',
            padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                }}
              >
                <Menu size={24} />
              </button>
            )}
            <h2 style={{ fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: 600, margin: 0 }}>
              {isMobile ? 'RadioPharma' : (t(allMenuItems.find((m) => m.path === location.pathname)?.labelKey || 'RadioPharma OMS'))}
            </h2>
          </div>

          {!isMobile && <GlobalSearch />}

          {/* Context Bar - Date, Time, Language, Currency - Hidden on mobile */}
          {!isMobile && (
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
            <div ref={currencyRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setCurrencyMenuOpen(!currencyMenuOpen)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.375rem',
                  padding: '0.25rem 0.625rem',
                  background: currencyMenuOpen ? 'var(--bg-secondary)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
              >
                <DollarSign size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{selectedCurrency}</span>
                <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
              </button>
              {currencyMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-lg)',
                  minWidth: '120px',
                  zIndex: 1000,
                  overflow: 'hidden',
                  maxHeight: '240px',
                  overflowY: 'auto',
                }}>
                  <button
                    onClick={() => { setCurrency('SAR'); setCurrencyMenuOpen(false); }}
                    style={{
                      width: '100%',
                      padding: '0.625rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: 'none',
                      background: selectedCurrency === 'SAR' ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    <span style={{ fontWeight: selectedCurrency === 'SAR' ? 600 : 400 }}>SAR</span>
                    {selectedCurrency === 'SAR' && <Check size={14} style={{ color: 'var(--primary)' }} />}
                  </button>
                  {exchangeRates.filter(r => r.fromCurrency !== 'SAR').map((rate) => (
                    <button
                      key={rate.fromCurrency}
                      onClick={() => { setCurrency(rate.fromCurrency); setCurrencyMenuOpen(false); }}
                      style={{
                        width: '100%',
                        padding: '0.625rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: 'none',
                        background: selectedCurrency === rate.fromCurrency ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      <span style={{ fontWeight: selectedCurrency === rate.fromCurrency ? 600 : 400 }}>{rate.fromCurrency}</span>
                      {selectedCurrency === rate.fromCurrency && <Check size={14} style={{ color: 'var(--primary)' }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

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
                                {formatDateTime(notification.createdAt)}
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

        <AnnouncementBar />

        <main style={{ padding: '1.5rem' }}>
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
