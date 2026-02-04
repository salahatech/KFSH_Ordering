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
  ExternalLink,
} from 'lucide-react';
import api from '../lib/api';
import { Pagination } from '../components/shared';

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
};

const notificationTypeColors: Record<string, string> = {
  ORDER: '#3b82f6',
  BATCH: '#8b5cf6',
  SHIPMENT: '#f59e0b',
  INVOICE: '#10b981',
  APPROVAL: '#ec4899',
  ALERT: '#ef4444',
  INFO: '#6b7280',
};

function getRelatedPath(relatedType?: string, relatedId?: string): string | null {
  if (!relatedType || !relatedId) return null;
  
  const type = relatedType.toLowerCase();
  
  switch (type) {
    case 'order':
      return `/orders/${relatedId}/journey`;
    case 'batch':
      return `/batches/${relatedId}/journey`;
    case 'shipment':
      return `/shipments/${relatedId}`;
    case 'invoice':
      return `/invoices`;
    case 'customer':
      return `/customers`;
    case 'approval':
      return `/approvals`;
    case 'payment':
      return `/payments`;
    case 'product':
      return `/products`;
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

export default function NotificationCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['all-notifications', filter, page],
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
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
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
          <Bell size={28} style={{ color: 'var(--primary)' }} />
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Notification Center</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
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
                  background: filter === f ? 'var(--primary)' : 'var(--bg-secondary)',
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

      <div className="card" style={{ overflow: 'hidden' }}>
        {filteredNotifications.length === 0 ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}>
            <Bell size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <div style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              No notifications
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              {filter !== 'all' 
                ? `No ${filter} notifications to display.`
                : 'You\'re all caught up!'}
            </div>
          </div>
        ) : (
          filteredNotifications.map((notification, index) => {
            const Icon = notificationTypeIcons[notification.type] || Bell;
            const color = notificationTypeColors[notification.type] || '#6b7280';
            const hasLink = !!getRelatedPath(notification.relatedType, notification.relatedId);
            
            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: index < filteredNotifications.length - 1 ? '1px solid var(--border)' : 'none',
                  background: notification.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.03)',
                  cursor: hasLink ? 'pointer' : 'default',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (hasLink) {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = notification.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.03)';
                }}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
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
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      gap: '1rem',
                      marginBottom: '0.25rem',
                    }}>
                      <div style={{
                        fontWeight: notification.isRead ? 500 : 600,
                        fontSize: '0.925rem',
                        color: notification.isRead ? 'var(--text-primary)' : 'var(--text-primary)',
                      }}>
                        {notification.title}
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        flexShrink: 0,
                      }}>
                        {!notification.isRead && (
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                          }} />
                        )}
                        <span style={{ 
                          fontSize: '0.75rem', 
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                        }}>
                          {format(new Date(notification.createdAt), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.5,
                      marginBottom: '0.5rem',
                    }}>
                      {notification.message}
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                    }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background: `${color}15`,
                        color: color,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}>
                        {notification.type}
                      </span>
                      
                      {hasLink && (
                        <span style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem', 
                          color: 'var(--primary)',
                        }}>
                          <ExternalLink size={12} />
                          View Details
                        </span>
                      )}
                      
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
                            padding: '0.25rem 0.5rem',
                            border: 'none',
                            background: 'none',
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            marginLeft: 'auto',
                          }}
                        >
                          <Check size={12} />
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {data && data.totalCount > 0 && (
        <div style={{ marginTop: '1rem', borderRadius: '8px', overflow: 'hidden' }}>
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
