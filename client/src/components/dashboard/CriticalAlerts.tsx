import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Package, 
  FlaskConical,
  Shield,
  Truck,
  XCircle,
  Bell,
  ChevronRight,
  Zap,
} from 'lucide-react';

export interface CriticalAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium';
  category: 'expiring' | 'overdue' | 'approval' | 'qc_failed' | 'inventory' | 'delivery';
  title: string;
  description: string;
  count: number;
  linkTo: string;
  timestamp?: string;
}

interface CriticalAlertsProps {
  alerts: CriticalAlert[];
  title?: string;
  maxAlerts?: number;
}

const categoryIcons = {
  expiring: Clock,
  overdue: Calendar,
  approval: Shield,
  qc_failed: XCircle,
  inventory: Package,
  delivery: Truck,
};

const severityStyles = {
  critical: {
    bg: '#fef2f2',
    border: '#fecaca',
    text: '#dc2626',
    icon: '#dc2626',
    pulse: true,
  },
  high: {
    bg: '#fff7ed',
    border: '#fed7aa',
    text: '#ea580c',
    icon: '#ea580c',
    pulse: false,
  },
  medium: {
    bg: '#fffbeb',
    border: '#fde68a',
    text: '#d97706',
    icon: '#d97706',
    pulse: false,
  },
};

export function CriticalAlerts({ 
  alerts, 
  title = 'Critical Alerts', 
  maxAlerts = 6 
}: CriticalAlertsProps) {
  const navigate = useNavigate();
  
  const activeAlerts = alerts
    .filter(alert => alert.count > 0)
    .sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .slice(0, maxAlerts);

  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
  const totalCount = activeAlerts.reduce((sum, a) => sum + a.count, 0);

  if (activeAlerts.length === 0) {
    return (
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          marginBottom: '1rem' 
        }}>
          <Bell size={18} style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ 
            fontSize: '0.875rem', 
            fontWeight: 600, 
            color: 'var(--text-secondary)',
            margin: 0,
          }}>
            {title}
          </h3>
        </div>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '2rem 1rem',
          backgroundColor: '#f0fdf4',
          borderRadius: '12px',
          color: '#16a34a',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem',
          }}>
            <span style={{ fontSize: '1.5rem' }}>✓</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>All Clear</span>
          <span style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.25rem' }}>
            No critical alerts at this time
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '1rem' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {criticalCount > 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#dc2626',
              animation: 'pulse 2s infinite',
            }}>
              <Zap size={14} style={{ color: 'white' }} />
            </div>
          ) : (
            <AlertTriangle size={18} style={{ color: '#ea580c' }} />
          )}
          <h3 style={{ 
            fontSize: '0.875rem', 
            fontWeight: 600, 
            color: 'var(--text-secondary)',
            margin: 0,
          }}>
            {title}
          </h3>
        </div>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          padding: '0.25rem 0.5rem',
          borderRadius: '9999px',
          backgroundColor: criticalCount > 0 ? '#fef2f2' : '#fff7ed',
          color: criticalCount > 0 ? '#dc2626' : '#ea580c',
        }}>
          {totalCount} items
        </span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {activeAlerts.map(alert => {
          const styles = severityStyles[alert.severity];
          const IconComponent = categoryIcons[alert.category] || AlertTriangle;
          
          return (
            <div
              key={alert.id}
              onClick={() => navigate(alert.linkTo)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                backgroundColor: styles.bg,
                border: `1px solid ${styles.border}`,
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                color: styles.icon,
                flexShrink: 0,
              }}>
                <IconComponent size={18} />
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  marginBottom: '0.125rem',
                }}>
                  <span style={{ 
                    fontWeight: 600, 
                    fontSize: '0.8125rem',
                    color: styles.text,
                  }}>
                    {alert.title}
                  </span>
                  <span style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '0.125rem 0.375rem',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(255, 255, 255, 0.6)',
                    color: styles.text,
                  }}>
                    {alert.count}
                  </span>
                </div>
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: 'rgba(0, 0, 0, 0.6)',
                }}>
                  {alert.description}
                </span>
              </div>
              
              <ChevronRight size={16} style={{ color: styles.icon, flexShrink: 0 }} />
            </div>
          );
        })}
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
