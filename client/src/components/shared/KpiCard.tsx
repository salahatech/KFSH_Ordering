import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: number | string;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
  loading?: boolean;
}

const colorStyles: Record<string, { bg: string; text: string; accent: string }> = {
  default: { bg: 'var(--bg-secondary)', text: 'var(--text-primary)', accent: 'var(--text-muted)' },
  primary: { bg: '#eff6ff', text: '#1d4ed8', accent: '#3b82f6' },
  success: { bg: '#f0fdf4', text: '#166534', accent: '#22c55e' },
  warning: { bg: '#fffbeb', text: '#92400e', accent: '#f59e0b' },
  danger: { bg: '#fef2f2', text: '#991b1b', accent: '#ef4444' },
  info: { bg: '#f0f9ff', text: '#0369a1', accent: '#0ea5e9' },
};

export function KpiCard({ 
  title, 
  value, 
  subtext, 
  icon, 
  trend, 
  trendValue, 
  color = 'default',
  onClick,
  loading = false
}: KpiCardProps) {
  const styles = colorStyles[color];

  return (
    <div 
      className="card"
      style={{ 
        backgroundColor: styles.bg,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        minWidth: '160px',
      }}
      onClick={onClick}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={(e) => onClick && (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: styles.accent, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            {title}
          </div>
          {loading ? (
            <div className="skeleton" style={{ width: '60px', height: '2rem', borderRadius: '4px' }} />
          ) : (
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: styles.text, lineHeight: 1.2 }}>
              {value}
            </div>
          )}
          {subtext && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {subtext}
            </div>
          )}
        </div>
        {icon && (
          <div style={{ color: styles.accent, opacity: 0.8 }}>
            {icon}
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
          {trend === 'up' && <TrendingUp size={14} style={{ color: '#22c55e' }} />}
          {trend === 'down' && <TrendingDown size={14} style={{ color: '#ef4444' }} />}
          {trend === 'neutral' && <Minus size={14} style={{ color: 'var(--text-muted)' }} />}
          <span style={{ color: trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : 'var(--text-muted)' }}>
            {trendValue}
          </span>
        </div>
      )}
    </div>
  );
}

export default KpiCard;
