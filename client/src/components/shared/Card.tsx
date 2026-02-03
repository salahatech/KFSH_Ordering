import React from 'react';

interface CardProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  selected?: boolean;
  hoverable?: boolean;
}

const paddingMap = {
  none: 0,
  sm: '1rem',
  md: '1.25rem',
  lg: '1.5rem',
};

export function Card({
  children,
  padding = 'md',
  className = '',
  style,
  onClick,
  selected = false,
  hoverable = false,
}: CardProps) {
  return (
    <div
      className={`card ${className}`}
      onClick={onClick}
      style={{
        padding: paddingMap[padding],
        cursor: onClick ? 'pointer' : 'default',
        border: selected ? '2px solid var(--primary)' : '1px solid var(--border)',
        transition: hoverable ? 'transform 0.2s, box-shadow 0.2s' : undefined,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (hoverable) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--shadow)';
        }
      }}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

export function CardHeader({ title, subtitle, actions, icon }: CardHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1rem',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        {icon && (
          <div
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--primary)',
            }}
          >
            {icon}
          </div>
        )}
        <div>
          <h3 style={{ fontWeight: 600, margin: 0, fontSize: '1rem' }}>{title}</h3>
          {subtitle && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: '0.25rem 0 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', gap: '0.5rem' }}>{actions}</div>}
    </div>
  );
}

interface CardSectionProps {
  title?: string;
  children: React.ReactNode;
  noBorder?: boolean;
}

export function CardSection({ title, children, noBorder = false }: CardSectionProps) {
  return (
    <div
      style={{
        paddingTop: '1rem',
        marginTop: '1rem',
        borderTop: noBorder ? 'none' : '1px solid var(--border)',
      }}
    >
      {title && (
        <h4
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem',
          }}
        >
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}

export default Card;
