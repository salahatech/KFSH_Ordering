import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { PenTool, User, Clock, FileText, CheckCircle } from 'lucide-react';

interface Signature {
  id: string;
  scope: string;
  entityType: string;
  entityId: string;
  meaning: string;
  comment: string | null;
  signedAt: string;
  signedBy: {
    id: string;
    name: string;
    email: string;
  };
  metadata?: Record<string, any>;
}

interface ESignatureHistoryProps {
  entityType: string;
  entityId: string;
  scope?: string;
  title?: string;
  compact?: boolean;
}

const scopeColors: Record<string, { bg: string; color: string }> = {
  BATCH_RELEASE: { bg: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' },
  QC_APPROVAL: { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' },
  DEVIATION_APPROVAL: { bg: 'rgba(234, 179, 8, 0.1)', color: 'var(--warning)' },
  MASTERDATA_CHANGE: { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' },
  RECIPE_ACTIVATION: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
  PO_APPROVAL: { bg: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6' },
  FINANCIAL_APPROVAL: { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' },
  DISPENSING_APPROVAL: { bg: 'rgba(249, 115, 22, 0.1)', color: '#f97316' },
};

const scopeLabels: Record<string, string> = {
  BATCH_RELEASE: 'Batch Release',
  QC_APPROVAL: 'QC Approval',
  DEVIATION_APPROVAL: 'Deviation Approval',
  MASTERDATA_CHANGE: 'Master Data Change',
  RECIPE_ACTIVATION: 'Recipe Activation',
  PO_APPROVAL: 'PO Approval',
  FINANCIAL_APPROVAL: 'Financial Approval',
  DISPENSING_APPROVAL: 'Dispensing',
};

export default function ESignatureHistory({
  entityType,
  entityId,
  scope,
  title = 'Electronic Signatures',
  compact = false,
}: ESignatureHistoryProps) {
  const { data: signatures, isLoading } = useQuery({
    queryKey: ['esignatures', entityType, entityId, scope],
    queryFn: async () => {
      const params = scope ? `?scope=${scope}` : '';
      const { data } = await api.get(`/esignatures/entity/${entityType}/${entityId}${params}`);
      return data as Signature[];
    },
    enabled: !!entityId,
  });

  if (isLoading) {
    return (
      <div style={{ 
        padding: compact ? '0.75rem' : '1rem', 
        textAlign: 'center', 
        color: 'var(--text-muted)',
        fontSize: '0.875rem',
      }}>
        Loading signatures...
      </div>
    );
  }

  if (!signatures || signatures.length === 0) {
    if (compact) {
      return (
        <div style={{ 
          fontSize: '0.8125rem', 
          color: 'var(--text-muted)',
          fontStyle: 'italic',
        }}>
          No signatures recorded
        </div>
      );
    }
    
    return (
      <div style={{ 
        padding: '1.5rem', 
        textAlign: 'center', 
        color: 'var(--text-muted)',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius)',
      }}>
        <PenTool size={24} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
        <div style={{ fontSize: '0.875rem' }}>No electronic signatures recorded</div>
      </div>
    );
  }

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {signatures.map((sig) => {
          const colors = scopeColors[sig.scope] || { bg: 'var(--bg-secondary)', color: 'var(--text)' };
          return (
            <div
              key={sig.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                background: colors.bg,
                borderRadius: 'var(--radius)',
                fontSize: '0.75rem',
              }}
            >
              <CheckCircle size={14} style={{ color: colors.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 500 }}>{sig.signedBy.name}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: '0.375rem' }}>
                  {format(new Date(sig.signedAt), 'MMM d, HH:mm')}
                </span>
              </div>
              <span 
                className="badge"
                style={{ 
                  background: colors.bg, 
                  color: colors.color,
                  fontSize: '0.625rem',
                }}
              >
                {scopeLabels[sig.scope] || sig.scope}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem', 
        marginBottom: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--border)',
      }}>
        <PenTool size={18} style={{ color: 'var(--primary)' }} />
        <h3 style={{ fontWeight: 600, fontSize: '0.9375rem', margin: 0 }}>{title}</h3>
        <span className="badge badge-default" style={{ marginLeft: 'auto' }}>
          {signatures.length} signature{signatures.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {signatures.map((sig) => {
          const colors = scopeColors[sig.scope] || { bg: 'var(--bg-secondary)', color: 'var(--text)' };
          return (
            <div
              key={sig.id}
              style={{
                padding: '0.875rem',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius)',
                borderLeft: `3px solid ${colors.color}`,
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: colors.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <User size={14} style={{ color: colors.color }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                      {sig.signedBy.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {sig.signedBy.email}
                    </div>
                  </div>
                </div>
                <span 
                  className="badge"
                  style={{ 
                    background: colors.bg, 
                    color: colors.color,
                    fontSize: '0.6875rem',
                  }}
                >
                  {scopeLabels[sig.scope] || sig.scope}
                </span>
              </div>

              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.375rem',
                fontSize: '0.8125rem',
                marginBottom: '0.375rem',
              }}>
                <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{sig.meaning}</span>
              </div>

              {sig.comment && (
                <div style={{ 
                  fontSize: '0.8125rem', 
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                  marginBottom: '0.375rem',
                  paddingLeft: '1.25rem',
                }}>
                  "{sig.comment}"
                </div>
              )}

              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.375rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}>
                <Clock size={12} />
                {format(new Date(sig.signedAt), 'MMMM d, yyyy \'at\' HH:mm:ss')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
