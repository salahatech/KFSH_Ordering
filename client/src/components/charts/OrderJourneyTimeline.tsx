import { useMemo } from 'react';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { Package, Clock, Beaker, CheckCircle, Truck, AlertCircle } from 'lucide-react';

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: string;
  status: string;
  description: string;
  user?: string;
  duration?: number;
}

interface OrderJourneyTimelineProps {
  events: TimelineEvent[];
  title?: string;
  showDurations?: boolean;
}

const eventIcons: Record<string, any> = {
  ORDER: Package,
  BATCH: Beaker,
  QC: CheckCircle,
  SHIPMENT: Truck,
  ALERT: AlertCircle,
  DEFAULT: Clock,
};

const eventColors: Record<string, { bg: string; border: string; text: string }> = {
  SUBMITTED: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  APPROVED: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  SCHEDULED: { bg: '#e0e7ff', border: '#6366f1', text: '#4338ca' },
  IN_PRODUCTION: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  QC_PENDING: { bg: '#fed7aa', border: '#f97316', text: '#9a3412' },
  QC_PASSED: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  RELEASED: { bg: '#e9d5ff', border: '#a855f7', text: '#7c3aed' },
  SHIPPED: { bg: '#cffafe', border: '#06b6d4', text: '#0e7490' },
  DELIVERED: { bg: '#bbf7d0', border: '#22c55e', text: '#15803d' },
  FAILED: { bg: '#fecaca', border: '#ef4444', text: '#b91c1c' },
  CANCELLED: { bg: '#e5e7eb', border: '#6b7280', text: '#374151' },
};

export default function OrderJourneyTimeline({ events, title = 'Order Journey', showDurations = true }: OrderJourneyTimelineProps) {
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [events]);

  const getDuration = (current: TimelineEvent, next?: TimelineEvent) => {
    if (!next) return null;
    const minutes = differenceInMinutes(new Date(next.timestamp), new Date(current.timestamp));
    if (minutes < 60) return `${minutes}m`;
    const hours = differenceInHours(new Date(next.timestamp), new Date(current.timestamp));
    if (hours < 24) return `${hours}h`;
    return `${Math.round(hours / 24)}d`;
  };

  const getEventStyle = (status: string) => {
    return eventColors[status] || { bg: '#f3f4f6', border: '#9ca3af', text: '#4b5563' };
  };

  const getIcon = (type: string) => {
    const Icon = eventIcons[type] || eventIcons.DEFAULT;
    return Icon;
  };

  if (sortedEvents.length === 0) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        No timeline events available
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontWeight: 600, margin: 0 }}>{title}</h3>
      </div>
      
      <div style={{ padding: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '19px',
            top: '24px',
            bottom: '24px',
            width: '2px',
            background: 'var(--border)',
            zIndex: 0
          }} />
          
          {sortedEvents.map((event, index) => {
            const style = getEventStyle(event.status);
            const Icon = getIcon(event.type);
            const duration = showDurations ? getDuration(event, sortedEvents[index + 1]) : null;
            
            return (
              <div key={event.id} style={{ position: 'relative', marginBottom: index < sortedEvents.length - 1 ? '1.5rem' : 0 }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: style.bg,
                    border: `2px solid ${style.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    zIndex: 1
                  }}>
                    <Icon size={18} style={{ color: style.text }} />
                  </div>
                  
                  <div style={{ flex: 1, paddingTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                      <div>
                        <div style={{ 
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          background: style.bg,
                          color: style.text,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          marginBottom: '0.35rem'
                        }}>
                          {event.status.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                          {event.description}
                        </div>
                        {event.user && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            by {event.user}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                          {format(new Date(event.timestamp), 'MMM d, yyyy')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {format(new Date(event.timestamp), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {duration && (
                  <div style={{
                    position: 'absolute',
                    left: '48px',
                    top: '44px',
                    fontSize: '0.7rem',
                    color: 'var(--text-tertiary)',
                    background: 'var(--bg-primary)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px'
                  }}>
                    {duration}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
