import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, User, FileText, AlertTriangle, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  actor?: string;
  actorRole?: string;
  metadata?: Record<string, any>;
  fromStatus?: string;
  toStatus?: string;
  note?: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
}

interface TimelineProps {
  events: TimelineEvent[];
  maxVisible?: number;
  showMetadata?: boolean;
  emptyMessage?: string;
}

const severityIcons = {
  info: <Clock size={14} />,
  success: <CheckCircle size={14} />,
  warning: <AlertTriangle size={14} />,
  error: <XCircle size={14} />,
};

const severityColors = {
  info: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

export function Timeline({ events, maxVisible = 5, showMetadata = false, emptyMessage = 'No events yet' }: TimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const displayEvents = expanded ? events : events.slice(0, maxVisible);
  const hasMore = events.length > maxVisible;

  const toggleEventMetadata = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  if (events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        <Clock size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {displayEvents.map((event, index) => {
          const severity = event.severity || 'info';
          const color = severityColors[severity];
          const isLast = index === displayEvents.length - 1;
          const hasMetadata = event.metadata && Object.keys(event.metadata).length > 0;
          const isEventExpanded = expandedEvents.has(event.id);

          return (
            <div key={event.id} style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: `${color}20`,
                  border: `2px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: color,
                  flexShrink: 0,
                }}>
                  {severityIcons[severity]}
                </div>
                {!isLast && (
                  <div style={{
                    width: '2px',
                    flex: 1,
                    minHeight: '1rem',
                    backgroundColor: 'var(--border)',
                  }} />
                )}
              </div>
              <div style={{ flex: 1, paddingBottom: isLast ? 0 : '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {event.title}
                    </div>
                    {event.fromStatus && event.toStatus && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.125rem' }}>
                        <span className={`badge badge-sm`}>{event.fromStatus.replace(/_/g, ' ')}</span>
                        <ArrowRight size={12} />
                        <span className={`badge badge-sm`}>{event.toStatus.replace(/_/g, ' ')}</span>
                      </div>
                    )}
                    {event.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {event.description}
                      </div>
                    )}
                    {event.note && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontStyle: 'italic', display: 'flex', alignItems: 'flex-start', gap: '0.25rem' }}>
                        <FileText size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                        "{event.note}"
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                      {format(new Date(event.timestamp), 'MMM dd, HH:mm')}
                    </div>
                    {event.actor && (
                      <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end', marginTop: '0.125rem' }}>
                        <User size={10} />
                        {event.actor}
                        {event.actorRole && <span>({event.actorRole})</span>}
                      </div>
                    )}
                  </div>
                </div>
                {showMetadata && hasMetadata && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => toggleEventMetadata(event.id)}
                      style={{ fontSize: '0.625rem', padding: '0.125rem 0.5rem' }}
                    >
                      {isEventExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      Metadata
                    </button>
                    {isEventExpanded && (
                      <pre style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: '4px',
                        fontSize: '0.625rem',
                        overflow: 'auto',
                        maxHeight: '150px',
                      }}>
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => setExpanded(!expanded)}
          style={{ marginTop: '1rem', width: '100%' }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Show Less' : `Show All (${events.length})`}
        </button>
      )}
    </div>
  );
}

export default Timeline;
