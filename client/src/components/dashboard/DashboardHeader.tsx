import { RefreshCw, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  lastRefreshed?: Date;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  actions?: React.ReactNode;
}

export function DashboardHeader({ 
  title, 
  subtitle, 
  lastRefreshed, 
  onRefresh, 
  isRefreshing,
  actions 
}: DashboardHeaderProps) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start', 
      marginBottom: '1.5rem',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            {subtitle}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {lastRefreshed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Clock size={14} />
            Last updated: {format(lastRefreshed, 'HH:mm:ss')}
          </div>
        )}
        {onRefresh && (
          <button 
            className="btn btn-secondary" 
            onClick={onRefresh}
            disabled={isRefreshing}
            style={{ minWidth: '100px' }}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
        {actions}
      </div>
    </div>
  );
}

export default DashboardHeader;
