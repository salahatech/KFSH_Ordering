import { useMemo } from 'react';
import { format, differenceInMinutes, startOfDay, addHours } from 'date-fns';

interface Batch {
  id: string;
  batchNumber: string;
  productId: string;
  product?: { name: string; productType: string };
  plannedStartTime: string;
  plannedEndTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: string;
  targetActivity: number;
  activityUnit: string;
  orders?: Array<{ id: string; orderNumber: string }>;
}

interface Equipment {
  id: string;
  name: string;
  type: string;
}

interface ProductionGanttChartProps {
  batches: Batch[];
  equipment?: Equipment[];
  date: string;
  onBatchClick?: (batch: Batch) => void;
}

const statusColors: Record<string, string> = {
  PLANNED: '#94a3b8',
  IN_PRODUCTION: '#3b82f6',
  PRODUCTION_COMPLETE: '#22c55e',
  QC_PENDING: '#f59e0b',
  QC_PASSED: '#10b981',
  FAILED_QC: '#ef4444',
  RELEASED: '#8b5cf6',
  DISPENSED: '#06b6d4',
  CANCELLED: '#6b7280',
};

export default function ProductionGanttChart({ batches, equipment, date, onBatchClick }: ProductionGanttChartProps) {
  const dayStart = startOfDay(new Date(date));
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const productGroups = useMemo(() => {
    const groups: Record<string, Batch[]> = {};
    batches.forEach(batch => {
      const productName = batch.product?.name || 'Unknown';
      if (!groups[productName]) groups[productName] = [];
      groups[productName].push(batch);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [batches]);

  const getBarPosition = (batch: Batch) => {
    const start = new Date(batch.plannedStartTime);
    const end = new Date(batch.plannedEndTime);
    const dayStartTime = startOfDay(new Date(date));
    
    const startMinutes = differenceInMinutes(start, dayStartTime);
    const duration = differenceInMinutes(end, start);
    
    const leftPercent = (startMinutes / (24 * 60)) * 100;
    const widthPercent = (duration / (24 * 60)) * 100;
    
    return { left: `${Math.max(0, leftPercent)}%`, width: `${Math.min(100 - leftPercent, widthPercent)}%` };
  };

  const getActualBarPosition = (batch: Batch) => {
    if (!batch.actualStartTime) return null;
    
    const start = new Date(batch.actualStartTime);
    const end = batch.actualEndTime ? new Date(batch.actualEndTime) : new Date();
    const dayStartTime = startOfDay(new Date(date));
    
    const startMinutes = differenceInMinutes(start, dayStartTime);
    const duration = differenceInMinutes(end, start);
    
    const leftPercent = (startMinutes / (24 * 60)) * 100;
    const widthPercent = (duration / (24 * 60)) * 100;
    
    return { left: `${Math.max(0, leftPercent)}%`, width: `${Math.min(100 - leftPercent, widthPercent)}%` };
  };

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontWeight: 600, margin: 0 }}>Production Schedule - {format(new Date(date), 'EEEE, MMMM d, yyyy')}</h3>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: '1200px' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ width: '180px', flexShrink: 0, padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>
              Product
            </div>
            <div style={{ flex: 1, display: 'flex' }}>
              {hours.map(hour => (
                <div 
                  key={hour} 
                  style={{ 
                    flex: 1, 
                    textAlign: 'center', 
                    fontSize: '0.75rem', 
                    padding: '0.75rem 0',
                    borderLeft: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    fontWeight: 500
                  }}
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>
          
          {productGroups.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No batches scheduled for this date
            </div>
          ) : (
            productGroups.map(([productName, productBatches]) => (
              <div key={productName} style={{ borderBottom: '1px solid var(--border)' }}>
                {productBatches.map((batch, idx) => (
                  <div 
                    key={batch.id} 
                    style={{ 
                      display: 'flex', 
                      minHeight: '48px',
                      background: idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'
                    }}
                  >
                    <div style={{ 
                      width: '180px', 
                      flexShrink: 0, 
                      padding: '0.5rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      fontSize: '0.8rem'
                    }}>
                      <div style={{ fontWeight: 500 }}>{idx === 0 ? productName : ''}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{batch.batchNumber}</div>
                    </div>
                    
                    <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
                      {hours.map(hour => (
                        <div 
                          key={hour} 
                          style={{ 
                            flex: 1, 
                            borderLeft: '1px solid var(--border)',
                            background: hour >= 6 && hour < 18 ? 'transparent' : 'rgba(0,0,0,0.02)'
                          }} 
                        />
                      ))}
                      
                      {batch.actualStartTime && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '4px',
                            height: 'calc(50% - 6px)',
                            ...getActualBarPosition(batch),
                            background: statusColors[batch.status] || '#3b82f6',
                            borderRadius: '4px',
                            opacity: 0.6,
                            zIndex: 1
                          }}
                          title={`Actual: ${format(new Date(batch.actualStartTime), 'HH:mm')} - ${batch.actualEndTime ? format(new Date(batch.actualEndTime), 'HH:mm') : 'ongoing'}`}
                        />
                      )}
                      
                      <div
                        onClick={() => onBatchClick?.(batch)}
                        style={{
                          position: 'absolute',
                          top: batch.actualStartTime ? 'calc(50% + 2px)' : '8px',
                          height: batch.actualStartTime ? 'calc(50% - 6px)' : 'calc(100% - 16px)',
                          ...getBarPosition(batch),
                          background: `linear-gradient(135deg, ${statusColors[batch.status] || '#3b82f6'}, ${statusColors[batch.status] || '#3b82f6'}dd)`,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 8px',
                          color: 'white',
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          zIndex: 2,
                          transition: 'transform 0.1s, box-shadow 0.1s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'scale(1.02)';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
                        }}
                        title={`${batch.batchNumber}: ${format(new Date(batch.plannedStartTime), 'HH:mm')} - ${format(new Date(batch.plannedEndTime), 'HH:mm')}\n${batch.status}\n${batch.targetActivity} ${batch.activityUnit}`}
                      >
                        {batch.batchNumber} • {batch.targetActivity}{batch.activityUnit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
      
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem' }}>
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: color }} />
              <span style={{ color: 'var(--text-secondary)' }}>{status.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
