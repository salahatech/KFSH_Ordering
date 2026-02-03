import React from 'react';
import { FileQuestion, Search, Package, AlertCircle, CheckCircle, Plus, Beaker, Clock, FileText, Truck, User, Box } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: 'search' | 'package' | 'alert' | 'success' | 'question' | 'beaker' | 'clock' | 'file' | 'truck' | 'user' | 'box';
  ctaLabel?: string;
  onCta?: () => void;
  variant?: 'default' | 'compact';
}

const icons = {
  search: Search,
  package: Package,
  alert: AlertCircle,
  success: CheckCircle,
  question: FileQuestion,
  beaker: Beaker,
  clock: Clock,
  file: FileText,
  truck: Truck,
  user: User,
  box: Box,
};

export function EmptyState({ 
  title, 
  message, 
  icon = 'question',
  ctaLabel,
  onCta,
  variant = 'default'
}: EmptyStateProps) {
  const Icon = icons[icon];
  const isCompact = variant === 'compact';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isCompact ? '2rem' : '4rem 2rem',
      textAlign: 'center',
    }}>
      <div style={{
        width: isCompact ? '48px' : '64px',
        height: isCompact ? '48px' : '64px',
        borderRadius: '50%',
        backgroundColor: 'var(--bg-tertiary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
      }}>
        <Icon size={isCompact ? 24 : 32} style={{ color: 'var(--text-muted)' }} />
      </div>
      <h3 style={{ 
        fontSize: isCompact ? '1rem' : '1.25rem', 
        fontWeight: 600, 
        color: 'var(--text-primary)',
        marginBottom: '0.5rem',
      }}>
        {title}
      </h3>
      <p style={{ 
        fontSize: isCompact ? '0.875rem' : '1rem', 
        color: 'var(--text-muted)',
        maxWidth: '400px',
        marginBottom: ctaLabel ? '1.5rem' : 0,
      }}>
        {message}
      </p>
      {ctaLabel && onCta && (
        <button className="btn btn-primary" onClick={onCta}>
          <Plus size={16} /> {ctaLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
