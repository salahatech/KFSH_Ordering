import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface KpiCardProps {
  title: string;
  value: number | string;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
  loading?: boolean;
  active?: boolean;
  selected?: boolean;
  linkTo?: string;
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
  loading = false,
  active = false,
  selected = false,
  linkTo
}: KpiCardProps) {
  const navigate = useNavigate();
  const styles = colorStyles[color];
  const isClickable = onClick || linkTo;
  const isHighlighted = active || selected;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (linkTo) {
      navigate(linkTo);
    }
  };

  return (
    <div 
      className="card"
      style={{ 
        backgroundColor: styles.bg,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        minWidth: '180px',
        minHeight: '100px',
        padding: '1.25rem 1.5rem',
        border: isHighlighted ? `2px solid ${styles.accent}` : '1px solid var(--border)',
        boxShadow: isHighlighted ? `0 0 0 3px ${styles.accent}20` : '0 1px 3px rgba(0,0,0,0.05)',
        borderRadius: '12px',
      }}
      onClick={handleClick}
      onMouseEnter={(e) => isClickable && (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={(e) => isClickable && (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.75rem' }}>
            {title}
          </div>
          {loading ? (
            <div className="skeleton" style={{ width: '60px', height: '2.5rem', borderRadius: '4px' }} />
          ) : (
            <div style={{ fontSize: '2.25rem', fontWeight: 700, color: styles.text, lineHeight: 1.1 }}>
              {value}
            </div>
          )}
          {subtext && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              {subtext}
            </div>
          )}
        </div>
        {icon && (
          <div style={{ 
            padding: '0.625rem', 
            borderRadius: '10px', 
            backgroundColor: `${styles.accent}15`,
            color: styles.accent,
          }}>
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
