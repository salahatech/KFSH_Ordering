import React from 'react';
import { AlertTriangle, ArrowRight, Lock, User, Play } from 'lucide-react';

interface NextStepPanelProps {
  nextAction: string;
  ownerRole: string;
  description?: string;
  blockedReason?: string;
  blockedBy?: string;
  onAction?: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
  actionLoading?: boolean;
  variant?: 'default' | 'warning' | 'blocked';
}

export function NextStepPanel({
  nextAction,
  ownerRole,
  description,
  blockedReason,
  blockedBy,
  onAction,
  actionLabel,
  actionDisabled = false,
  actionLoading = false,
  variant = 'default',
}: NextStepPanelProps) {
  const isBlocked = !!blockedReason || variant === 'blocked';

  const variantStyles = {
    default: {
      bg: 'var(--bg-secondary)',
      border: 'var(--border)',
      icon: <ArrowRight size={20} style={{ color: 'var(--primary)' }} />,
    },
    warning: {
      bg: '#fffbeb',
      border: '#fcd34d',
      icon: <AlertTriangle size={20} style={{ color: '#f59e0b' }} />,
    },
    blocked: {
      bg: '#fef2f2',
      border: '#fecaca',
      icon: <Lock size={20} style={{ color: '#ef4444' }} />,
    },
  };

  const styles = variantStyles[isBlocked ? 'blocked' : variant];

  return (
    <div style={{
      padding: '1rem',
      backgroundColor: styles.bg,
      border: `1px solid ${styles.border}`,
      borderRadius: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0, marginTop: '0.125rem' }}>
            {styles.icon}
          </div>
          <div>
            <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              {isBlocked ? 'BLOCKED' : 'WHAT HAPPENS NEXT'}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {isBlocked ? 'Step Blocked' : nextAction}
            </div>
            {description && !isBlocked && (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                {description}
              </div>
            )}
            {blockedReason && (
              <div style={{ fontSize: '0.875rem', color: '#991b1b', marginBottom: '0.5rem' }}>
                {blockedReason}
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <User size={12} />
              Responsible: <strong>{isBlocked && blockedBy ? blockedBy : ownerRole}</strong>
            </div>
          </div>
        </div>
        {onAction && !isBlocked && (
          <button 
            className="btn btn-primary"
            onClick={onAction}
            disabled={actionDisabled || actionLoading}
          >
            {actionLoading ? (
              <span className="spinner-sm" />
            ) : (
              <Play size={16} />
            )}
            {actionLabel || nextAction}
          </button>
        )}
      </div>
    </div>
  );
}

export default NextStepPanel;
