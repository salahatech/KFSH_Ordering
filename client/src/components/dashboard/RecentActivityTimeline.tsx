import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  CheckCircle, 
  Clock, 
  Package, 
  Truck, 
  FlaskConical, 
  Shield, 
  AlertTriangle,
  FileCheck,
  Send
} from 'lucide-react';

export interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: Date | string;
  entityType: 'order' | 'batch' | 'shipment' | 'invoice' | 'other';
  entityId?: string;
  linkTo?: string;
  user?: string;
}

interface RecentActivityTimelineProps {
  events: ActivityEvent[];
  title?: string;
  maxEvents?: number;
}

const eventIcons: Record<string, { icon: any; color: string; bg: string }> = {
  order_created: { icon: Package, color: '#2563eb', bg: '#eff6ff' },
  order_validated: { icon: CheckCircle, color: '#16a34a', bg: '#f0fdf4' },
  order_scheduled: { icon: Clock, color: '#0891b2', bg: '#ecfeff' },
  batch_started: { icon: FlaskConical, color: '#d97706', bg: '#fffbeb' },
  batch_completed: { icon: FlaskConical, color: '#16a34a', bg: '#f0fdf4' },
  qc_passed: { icon: FileCheck, color: '#16a34a', bg: '#f0fdf4' },
  qc_failed: { icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2' },
  batch_released: { icon: Shield, color: '#7c3aed', bg: '#f5f3ff' },
  shipment_dispatched: { icon: Send, color: '#0891b2', bg: '#ecfeff' },
  shipment_delivered: { icon: Truck, color: '#16a34a', bg: '#f0fdf4' },
  default: { icon: Clock, color: '#64748b', bg: '#f1f5f9' },
};

export function RecentActivityTimeline({ 
  events, 
  title = 'Recent Activity',
  maxEvents = 15 
}: RecentActivityTimelineProps) {
  const navigate = useNavigate();
  const displayEvents = events.slice(0, maxEvents);

  return (
    <div className="card" style={{ height: '100%' }}>
      <div style={{ 
        padding: '1rem 1.25rem', 
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ fontWeight: 600, fontSize: '0.9375rem', margin: 0 }}>{title}</h3>
        <span style={{ 
          backgroundColor: 'var(--bg-tertiary)', 
          padding: '0.125rem 0.5rem', 
          borderRadius: '999px', 
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          Last {displayEvents.length} events
        </span>
      </div>
      <div style={{ maxHeight: '400px', overflow: 'auto' }}>
        {displayEvents.length > 0 ? (
          <div style={{ padding: '0.5rem 0' }}>
            {displayEvents.map((event, idx) => {
              const eventStyle = eventIcons[event.type] || eventIcons.default;
              const IconComponent = eventStyle.icon;
              const timestamp = typeof event.timestamp === 'string' ? new Date(event.timestamp) : event.timestamp;
              
              return (
                <div
                  key={event.id}
                  onClick={() => event.linkTo && navigate(event.linkTo)}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    padding: '0.75rem 1.25rem',
                    cursor: event.linkTo ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => event.linkTo && (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ 
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: eventStyle.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <IconComponent size={16} style={{ color: eventStyle.color }} />
                    </div>
                    {idx < displayEvents.length - 1 && (
                      <div style={{
                        width: '2px',
                        flex: 1,
                        backgroundColor: 'var(--border)',
                        marginTop: '0.25rem',
                        minHeight: '20px',
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.125rem' }}>
                      {event.title}
                    </div>
                    {event.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                        {event.description}
                      </div>
                    )}
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span>{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
                      {event.user && (
                        <>
                          <span>•</span>
                          <span>{event.user}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No recent activity
          </div>
        )}
      </div>
    </div>
  );
}

export default RecentActivityTimeline;
