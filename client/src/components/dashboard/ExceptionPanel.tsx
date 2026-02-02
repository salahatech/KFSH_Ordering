import { useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertCircle, Clock, XCircle, Calendar, ChevronRight } from 'lucide-react';

export interface ExceptionItem {
  id: string;
  type: 'error' | 'warning' | 'info';
  icon?: 'qc_failed' | 'on_hold' | 'expired' | 'capacity' | 'delay' | 'alert';
  title: string;
  count: number;
  linkTo: string;
}

interface ExceptionPanelProps {
  title?: string;
  items: ExceptionItem[];
}

const iconMap = {
  qc_failed: XCircle,
  on_hold: AlertCircle,
  expired: Clock,
  capacity: Calendar,
  delay: AlertTriangle,
  alert: AlertTriangle,
};

const typeStyles = {
  error: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', icon: '#dc2626' },
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', icon: '#d97706' },
  info: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', icon: '#2563eb' },
};

export function ExceptionPanel({ title = 'Exceptions & Alerts', items }: ExceptionPanelProps) {
  const navigate = useNavigate();
  
  const activeItems = items.filter(item => item.count > 0);
  
  if (activeItems.length === 0) {
    return (
      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          {title}
        </h3>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '1.5rem',
          backgroundColor: '#f0fdf4',
          borderRadius: '8px',
          color: '#16a34a',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}>
          <span style={{ marginRight: '0.5rem' }}>✓</span>
          No active exceptions
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {activeItems.map(item => {
          const styles = typeStyles[item.type];
          const IconComponent = iconMap[item.icon || 'alert'];
          
          return (
            <div
              key={item.id}
              onClick={() => navigate(item.linkTo)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: styles.bg,
                border: `1px solid ${styles.border}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <IconComponent size={18} style={{ color: styles.icon }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: styles.text }}>
                  {item.title}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ 
                  backgroundColor: styles.icon,
                  color: 'white',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}>
                  {item.count}
                </span>
                <ChevronRight size={16} style={{ color: styles.icon }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ExceptionPanel;
