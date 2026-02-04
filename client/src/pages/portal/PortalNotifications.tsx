import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Bell,
  Check,
  CheckCheck,
  Filter,
  ShoppingCart,
  FlaskConical,
  Truck,
  Receipt,
  FileCheck,
  AlertCircle,
  Info,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import api from '../../lib/api';
import { Pagination } from '../../components/shared';

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

const notificationTypeIcons: Record<string, typeof Bell> = {
  ORDER: ShoppingCart,
  BATCH: FlaskConical,
  SHIPMENT: Truck,
  INVOICE: Receipt,
  APPROVAL: FileCheck,
  ALERT: AlertCircle,
  INFO: Info,
  TICKET: HelpCircle,
};

const notificationTypeColors: Record<string, string> = {
  ORDER: '#0d9488',
  BATCH: '#8b5cf6',
  SHIPMENT: '#f59e0b',
  INVOICE: '#10b981',
  APPROVAL: '#ec4899',
  ALERT: '#ef4444',
  INFO: '#6b7280',
  TICKET: '#3b82f6',
};

function getRelatedPath(relatedType?: string, relatedId?: string): string | null {
  if (!relatedType || !relatedId) return null;
  
  const type = relatedType.toLowerCase();
  
  switch (type) {
    case 'order':
      return `/portal/orders/${relatedId}/journey`;
    case 'shipment':
      return `/portal/orders`;
    case 'invoice':
      return `/portal/invoices`;
    case 'ticket':
      return `/portal/helpdesk/${relatedId}`;
    default:
      return null;
  }
}

interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function PortalNotifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['portal-notifications', filter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter === 'unread') params.append('unreadOnly', 'true');
      params.append('limit', pageSize.toString());
      params.append('page', page.toString());
      const { data } = await api.get(`/notifications?${params.toString()}`);
      return data as NotificationResponse;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    
    const path = getRelatedPath(notification.relatedType, notification.relatedId);
    if (path) {
      navigate(path);
    }
  };

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'read' && !n.isRead) return false;
    if (typeFilter && n.type !== typeFilter) return false;
    return true;
  });

  const notificationTypes = [...new Set(notifications.map((n) => n.type))];

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(13, 148, 136, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Bell size={24} style={{ color: '#0d9488' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Notifications</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="btn"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              background: '#0d9488',
              borderColor: '#0d9488',
              color: 'white',
            }}
          >
            <CheckCheck size={16} />
            Mark All as Read
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Filter:</span>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['all', 'unread', 'read'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: filter === f ? '#0d9488' : 'var(--bg-secondary)',
                  color: filter === f ? 'white' : 'var(--text-primary)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {notificationTypes.length > 0 && (
            <>
              <div style={{ 
                width: '1px', 
                height: '24px', 
                background: 'var(--border)', 
                margin: '0 0.5rem' 
              }} />
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="form-select"
                style={{ 
                  fontSize: '0.8rem',
                  padding: '0.375rem 0.75rem',
                  minWidth: '140px'
                }}
              >
                <option value="">All Types</option>
                {notificationTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {filteredNotifications.length === 0 ? (
          <div style={{ 
            padding: '3rem', 
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}>
            <Bell size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p style={{ margin: 0, fontSize: '0.9375rem' }}>
              {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            </p>
          </div>
        ) : (
          <div>
            {filteredNotifications.map((notification, index) => {
              const Icon = notificationTypeIcons[notification.type] || Bell;
              const color = notificationTypeColors[notification.type] || '#6b7280';
              const hasLink = !!getRelatedPath(notification.relatedType, notification.relatedId);

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '1rem 1.25rem',
                    borderBottom: index < filteredNotifications.length - 1 ? '1px solid var(--border)' : 'none',
                    background: notification.isRead ? 'transparent' : 'rgba(13, 148, 136, 0.03)',
                    cursor: hasLink ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (hasLink) e.currentTarget.style.background = 'var(--bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = notification.isRead ? 'transparent' : 'rgba(13, 148, 136, 0.03)';
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: `${color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={20} style={{ color }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      justifyContent: 'space-between',
                      gap: '1rem',
                      marginBottom: '0.25rem'
                    }}>
                      <div style={{ 
                        fontWeight: notification.isRead ? 400 : 600,
                        fontSize: '0.9375rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}>
                        {notification.title}
                        {hasLink && (
                          <ExternalLink size={14} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                        )}
                      </div>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                      }}>
                        {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>

                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.875rem', 
                      color: 'var(--text-muted)',
                      lineHeight: 1.5,
                    }}>
                      {notification.message}
                    </p>

                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      marginTop: '0.5rem'
                    }}>
                      <span 
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 500,
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          background: `${color}15`,
                          color,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {notification.type}
                      </span>

                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markReadMutation.mutate(notification.id);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            color: '#0d9488',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          <Check size={12} />
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {data && data.totalCount > pageSize && (
        <div style={{ marginTop: '1rem' }}>
          <Pagination
            page={page}
            pageSize={pageSize}
            totalCount={data.totalCount}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
