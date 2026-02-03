import React from 'react';
import { getStatusColor } from '../../theme/statusColors';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  label?: string;
}

const sizeStyles = {
  sm: { padding: '0.125rem 0.5rem', fontSize: '0.625rem', gap: '0.25rem' },
  md: { padding: '0.25rem 0.75rem', fontSize: '0.75rem', gap: '0.375rem' },
  lg: { padding: '0.375rem 1rem', fontSize: '0.875rem', gap: '0.5rem' },
};

export function StatusBadge({ status, size = 'md', showDot = false, label }: StatusBadgeProps) {
  const colors = getStatusColor(status);
  const displayLabel = label || status.replace(/_/g, ' ');
  const sizeStyle = sizeStyles[size];

  return (
    <span 
      style={{ 
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeStyle.gap,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        fontWeight: 500,
        borderRadius: '9999px',
        backgroundColor: colors.bg,
        color: colors.text,
        border: colors.border ? `1px solid ${colors.border}` : undefined,
        whiteSpace: 'nowrap',
        textTransform: 'capitalize',
      }}
    >
      {showDot && (
        <span style={{
          width: size === 'sm' ? '5px' : size === 'md' ? '6px' : '7px',
          height: size === 'sm' ? '5px' : size === 'md' ? '6px' : '7px',
          borderRadius: '50%',
          backgroundColor: colors.text,
          flexShrink: 0,
        }} />
      )}
      {displayLabel}
    </span>
  );
}

export default StatusBadge;
