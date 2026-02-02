import { useNavigate } from 'react-router-dom';
import { ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { StatusBadge } from '../shared';

export interface QueueItem {
  id: string;
  identifier: string;
  title: string;
  subtitle?: string;
  eta?: Date | string;
  status: string;
  nextAction?: string;
  isLate?: boolean;
  linkTo: string;
}

interface QueueListProps {
  title: string;
  items: QueueItem[];
  viewAllLink?: string;
  maxItems?: number;
  emptyMessage?: string;
  icon?: React.ReactNode;
  accentColor?: string;
}

export function QueueList({ 
  title, 
  items, 
  viewAllLink, 
  maxItems = 6,
  emptyMessage = 'No items in queue',
  icon,
  accentColor = 'var(--primary)'
}: QueueListProps) {
  const navigate = useNavigate();
  const displayItems = items.slice(0, maxItems);
  const hasMore = items.length > maxItems;

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '1rem 1.25rem', 
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeft: `3px solid ${accentColor}`,
        borderTopLeftRadius: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {icon}
          <h3 style={{ fontWeight: 600, fontSize: '0.9375rem', margin: 0 }}>{title}</h3>
          <span style={{ 
            backgroundColor: 'var(--bg-tertiary)', 
            padding: '0.125rem 0.5rem', 
            borderRadius: '999px', 
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-secondary)'
          }}>
            {items.length}
          </span>
        </div>
        {viewAllLink && items.length > 0 && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => navigate(viewAllLink)}
            style={{ fontSize: '0.75rem' }}
          >
            View all <ChevronRight size={14} />
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {displayItems.length > 0 ? (
          displayItems.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => navigate(item.linkTo)}
              style={{
                padding: '0.875rem 1.25rem',
                borderBottom: idx < displayItems.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                    {item.identifier}
                  </span>
                  {item.isLate && (
                    <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
                  )}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.title}
                </div>
                {item.subtitle && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {item.subtitle}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                <StatusBadge status={item.status} size="sm" />
                {item.eta && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    <Clock size={10} />
                    {typeof item.eta === 'string' ? item.eta : format(item.eta, 'HH:mm')}
                  </div>
                )}
                {item.nextAction && (
                  <div style={{ fontSize: '0.6875rem', color: 'var(--primary)', fontWeight: 500 }}>
                    {item.nextAction}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {emptyMessage}
          </div>
        )}
      </div>
      {hasMore && viewAllLink && (
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => navigate(viewAllLink)}
            style={{ width: '100%' }}
          >
            +{items.length - maxItems} more
          </button>
        </div>
      )}
    </div>
  );
}

export default QueueList;
