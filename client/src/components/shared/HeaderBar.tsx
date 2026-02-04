import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguageStore } from '../../store/languageStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { useLocalization } from '../../hooks/useLocalization';
import api from '../../lib/api';
import GlobalSearch from '../GlobalSearch';
import ThemeToggle from '../ThemeToggle';
import {
  Calendar,
  Clock,
  Languages,
  DollarSign,
  Check,
  ChevronDown,
  Bell,
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

interface HeaderBarProps {
  showSearch?: boolean;
  notificationCenterPath?: string;
  accentColor?: string;
}

export default function HeaderBar({ 
  showSearch = true, 
  notificationCenterPath = '/notifications',
  accentColor = 'var(--primary)',
}: HeaderBarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language, setLanguage } = useLanguageStore();
  const { currency: selectedCurrency, setCurrency } = useCurrencyStore();
  const { exchangeRates } = useLocalization();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  
  const languageRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setLanguageMenuOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setCurrencyMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: notificationData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const response = await api.get('/api/notifications?limit=5&unreadOnly=true');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const timezoneAbbr = 'AST';
  
  const getFormattedDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
  };

  const getFormattedTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const unreadCount = notificationData?.unreadCount || 0;
  const notifications: Notification[] = notificationData?.notifications || [];

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.relatedType && notification.relatedId) {
      const routes: Record<string, string> = {
        ORDER: `/orders/${notification.relatedId}`,
        BATCH: `/batches/${notification.relatedId}`,
        SHIPMENT: `/shipments/${notification.relatedId}`,
        INVOICE: `/invoices/${notification.relatedId}`,
      };
      if (routes[notification.relatedType]) {
        navigate(routes[notification.relatedType]);
      }
    }
    setNotificationOpen(false);
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '1rem',
      flex: 1,
      justifyContent: 'flex-end',
    }}>
      {showSearch && <GlobalSearch />}

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
                {language === 'en' && <Check size={14} style={{ marginLeft: 'auto', color: accentColor }} />}
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
                {language === 'ar' && <Check size={14} style={{ marginLeft: 'auto', color: accentColor }} />}
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
                {selectedCurrency === 'SAR' && <Check size={14} style={{ color: accentColor }} />}
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
                  {selectedCurrency === rate.fromCurrency && <Check size={14} style={{ color: accentColor }} />}
                </button>
              ))}
            </div>
          )}
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
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              zIndex: 1000,
            }}>
              <div style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Notifications</h3>
                {unreadCount > 0 && (
                  <span style={{
                    background: '#fef2f2',
                    color: '#ef4444',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}>
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}>
                    <Bell size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>No new notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      style={{
                        width: '100%',
                        padding: '0.875rem 1rem',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start',
                        border: 'none',
                        background: notification.isRead ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: notification.isRead ? 'transparent' : accentColor,
                        marginTop: '6px',
                        flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: '0.875rem', 
                          fontWeight: notification.isRead ? 400 : 600,
                          marginBottom: '0.25rem',
                        }}>
                          {notification.title}
                        </div>
                        <div style={{ 
                          fontSize: '0.8125rem', 
                          color: 'var(--text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {notification.message}
                        </div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: 'var(--text-muted)',
                          marginTop: '0.25rem',
                        }}>
                          {new Date(notification.createdAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <Link
                to={notificationCenterPath}
                onClick={() => setNotificationOpen(false)}
                style={{
                  display: 'block',
                  padding: '0.875rem',
                  textAlign: 'center',
                  borderTop: '1px solid var(--border)',
                  color: accentColor,
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
