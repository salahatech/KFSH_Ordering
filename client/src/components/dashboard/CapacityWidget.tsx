import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { Calendar, AlertTriangle } from 'lucide-react';

export interface CapacityDay {
  date: Date | string;
  reservedMinutes: number;
  committedMinutes: number;
  totalCapacity: number;
  isFull?: boolean;
}

interface CapacityWidgetProps {
  days: CapacityDay[];
  title?: string;
}

export function CapacityWidget({ days, title = 'Capacity Overview (7 Days)' }: CapacityWidgetProps) {
  const navigate = useNavigate();

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Calendar size={18} style={{ color: 'var(--primary)' }} />
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, color: 'var(--text-secondary)' }}>
          {title}
        </h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
        {days.map((day, idx) => {
          const date = typeof day.date === 'string' ? new Date(day.date) : day.date;
          const utilization = day.totalCapacity > 0 
            ? Math.round(((day.reservedMinutes + day.committedMinutes) / day.totalCapacity) * 100)
            : 0;
          const isToday = idx === 0;
          
          let bgColor = '#f0fdf4';
          let barColor = '#22c55e';
          if (utilization >= 90) {
            bgColor = '#fef2f2';
            barColor = '#ef4444';
          } else if (utilization >= 70) {
            bgColor = '#fffbeb';
            barColor = '#f59e0b';
          }

          return (
            <div
              key={idx}
              onClick={() => navigate(`/planner?date=${format(date, 'yyyy-MM-dd')}`)}
              style={{
                padding: '0.75rem 0.5rem',
                backgroundColor: isToday ? '#eff6ff' : 'var(--bg-secondary)',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s',
                border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {format(date, 'EEE')}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                {format(date, 'd')}
              </div>
              <div style={{ 
                width: '100%', 
                height: '4px', 
                backgroundColor: '#e2e8f0', 
                borderRadius: '2px',
                marginBottom: '0.375rem',
                overflow: 'hidden',
              }}>
                <div style={{ 
                  width: `${Math.min(utilization, 100)}%`, 
                  height: '100%', 
                  backgroundColor: barColor,
                  borderRadius: '2px',
                }} />
              </div>
              <div style={{ 
                fontSize: '0.6875rem', 
                fontWeight: 500,
                color: utilization >= 90 ? '#dc2626' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
              }}>
                {day.isFull && <AlertTriangle size={10} />}
                {utilization}%
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '1rem', 
        marginTop: '1rem',
        fontSize: '0.6875rem',
        color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#22c55e' }} />
          Low
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#f59e0b' }} />
          Medium
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#ef4444' }} />
          High
        </div>
      </div>
    </div>
  );
}

export default CapacityWidget;
