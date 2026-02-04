import { useMemo } from 'react';
import { format, differenceInMinutes } from 'date-fns';

interface BatchEvent {
  id: string;
  batchId: string;
  eventType: string;
  fromStatus?: string;
  toStatus?: string;
  notes?: string;
  createdAt: string;
  userId?: string;
  user?: { name: string };
}

interface BatchLifecycleTimelineProps {
  batch: {
    id: string;
    batchNumber: string;
    product?: { name: string };
    status: string;
    plannedStartTime: string;
    plannedEndTime: string;
    actualStartTime?: string;
    actualEndTime?: string;
  };
  events: BatchEvent[];
  onEventClick?: (event: BatchEvent) => void;
}

const phaseColors: Record<string, { bg: string; border: string; label: string }> = {
  PLANNED: { bg: '#e5e7eb', border: '#9ca3af', label: 'Planning' },
  IN_PRODUCTION: { bg: '#dbeafe', border: '#3b82f6', label: 'Production' },
  PRODUCTION_COMPLETE: { bg: '#dcfce7', border: '#22c55e', label: 'Complete' },
  QC_PENDING: { bg: '#fef3c7', border: '#f59e0b', label: 'QC Pending' },
  QC_PASSED: { bg: '#d1fae5', border: '#10b981', label: 'QC Passed' },
  FAILED_QC: { bg: '#fecaca', border: '#ef4444', label: 'QC Failed' },
  RELEASED: { bg: '#e9d5ff', border: '#a855f7', label: 'Released' },
  DISPENSED: { bg: '#cffafe', border: '#06b6d4', label: 'Dispensed' },
  CANCELLED: { bg: '#f3f4f6', border: '#6b7280', label: 'Cancelled' },
};

export default function BatchLifecycleTimeline({ batch, events, onEventClick }: BatchLifecycleTimelineProps) {
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [events]);

  const phases = useMemo(() => {
    const result: Array<{
      status: string;
      startTime: string;
      endTime?: string;
      duration?: number;
    }> = [];
    
    sortedEvents.forEach((event, idx) => {
      if (event.eventType === 'STATUS_CHANGE' && event.toStatus) {
        const nextEvent = sortedEvents[idx + 1];
        result.push({
          status: event.toStatus,
          startTime: event.createdAt,
          endTime: nextEvent?.createdAt,
          duration: nextEvent ? differenceInMinutes(new Date(nextEvent.createdAt), new Date(event.createdAt)) : undefined
        });
      }
    });
    
    return result;
  }, [sortedEvents]);

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  const totalPlannedMinutes = differenceInMinutes(
    new Date(batch.plannedEndTime),
    new Date(batch.plannedStartTime)
  );

  const totalActualMinutes = batch.actualStartTime
    ? differenceInMinutes(
        batch.actualEndTime ? new Date(batch.actualEndTime) : new Date(),
        new Date(batch.actualStartTime)
      )
    : null;

  return (
    <div className="card">
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontWeight: 600, margin: 0 }}>Batch Lifecycle - {batch.batchNumber}</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {batch.product?.name}
            </p>
          </div>
          <div style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '4px',
            background: phaseColors[batch.status]?.bg || '#f3f4f6',
            border: `1px solid ${phaseColors[batch.status]?.border || '#9ca3af'}`,
            fontSize: '0.8rem',
            fontWeight: 500
          }}>
            {phaseColors[batch.status]?.label || batch.status}
          </div>
        </div>
      </div>
      
      <div style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '2rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Planned</div>
              <div style={{ fontWeight: 500 }}>
                {format(new Date(batch.plannedStartTime), 'HH:mm')} - {format(new Date(batch.plannedEndTime), 'HH:mm')}
                <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>({formatDuration(totalPlannedMinutes)})</span>
              </div>
            </div>
            {batch.actualStartTime && (
              <div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Actual</div>
                <div style={{ fontWeight: 500 }}>
                  {format(new Date(batch.actualStartTime), 'HH:mm')} - {batch.actualEndTime ? format(new Date(batch.actualEndTime), 'HH:mm') : 'ongoing'}
                  {totalActualMinutes && <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>({formatDuration(totalActualMinutes)})</span>}
                </div>
              </div>
            )}
          </div>
          
          {phases.length > 0 && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Phase Duration Breakdown
              </div>
              <div style={{ display: 'flex', height: '24px', borderRadius: '4px', overflow: 'hidden' }}>
                {phases.map((phase, idx) => {
                  const phaseStyle = phaseColors[phase.status] || { bg: '#e5e7eb', border: '#9ca3af' };
                  const totalDuration = phases.reduce((acc, p) => acc + (p.duration || 0), 0) || 1;
                  const width = phase.duration ? `${(phase.duration / totalDuration) * 100}%` : '0';
                  
                  return (
                    <div
                      key={idx}
                      style={{
                        width,
                        minWidth: phase.duration ? '30px' : '0',
                        background: phaseStyle.bg,
                        borderRight: idx < phases.length - 1 ? `1px solid ${phaseStyle.border}` : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        padding: '0 4px'
                      }}
                      title={`${phaseColors[phase.status]?.label || phase.status}: ${formatDuration(phase.duration)}`}
                    >
                      {phase.duration && phase.duration > 10 ? formatDuration(phase.duration) : ''}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem', fontSize: '0.7rem' }}>
                {phases.map((phase, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{ 
                      width: '10px', 
                      height: '10px', 
                      borderRadius: '2px',
                      background: phaseColors[phase.status]?.bg || '#e5e7eb',
                      border: `1px solid ${phaseColors[phase.status]?.border || '#9ca3af'}`
                    }} />
                    <span>{phaseColors[phase.status]?.label || phase.status}</span>
                    {phase.duration && <span style={{ color: 'var(--text-secondary)' }}>({formatDuration(phase.duration)})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Event Log ({sortedEvents.length} events)
        </div>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {sortedEvents.map((event, idx) => (
            <div 
              key={event.id}
              onClick={() => onEventClick?.(event)}
              style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '0.6rem 0',
                borderBottom: idx < sortedEvents.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: onEventClick ? 'pointer' : 'default'
              }}
            >
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%',
                background: phaseColors[event.toStatus || '']?.border || 'var(--text-tertiary)',
                marginTop: '6px',
                flexShrink: 0
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{event.eventType.replace(/_/g, ' ')}</span>
                    {event.fromStatus && event.toStatus && (
                      <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                        {event.fromStatus} → {event.toStatus}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                    {format(new Date(event.createdAt), 'MMM d, HH:mm')}
                  </span>
                </div>
                {event.notes && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {event.notes}
                  </div>
                )}
                {event.user?.name && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                    by {event.user.name}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
