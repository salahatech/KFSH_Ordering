import { useNavigate } from 'react-router-dom';
import { ChevronRight, AlertTriangle } from 'lucide-react';

export interface JourneyStage {
  id: string;
  label: string;
  count: number;
  lateCount?: number;
  linkTo: string;
  color?: string;
}

interface JourneyFunnelStepperProps {
  stages: JourneyStage[];
  title?: string;
}

const stageColors: Record<string, { bg: string; border: string; text: string }> = {
  default: { bg: '#f1f5f9', border: '#e2e8f0', text: '#64748b' },
  blue: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' },
  yellow: { bg: '#fefce8', border: '#fef08a', text: '#ca8a04' },
  green: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
  teal: { bg: '#f0fdfa', border: '#99f6e4', text: '#0d9488' },
  purple: { bg: '#faf5ff', border: '#e9d5ff', text: '#9333ea' },
};

export function JourneyFunnelStepper({ stages, title }: JourneyFunnelStepperProps) {
  const navigate = useNavigate();

  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
      {title && (
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          {title}
        </h3>
      )}
      <div style={{ 
        display: 'flex', 
        alignItems: 'stretch', 
        gap: '0.25rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem'
      }}>
        {stages.map((stage, idx) => {
          const colors = stageColors[stage.color || 'default'];
          const isLast = idx === stages.length - 1;
          
          return (
            <div 
              key={stage.id} 
              style={{ display: 'flex', alignItems: 'center', flex: '1 1 0' }}
            >
              <div
                onClick={() => navigate(stage.linkTo)}
                style={{
                  flex: 1,
                  padding: '0.875rem 1rem',
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minWidth: '110px',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stage.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.text }}>
                    {stage.count}
                  </span>
                  {stage.lateCount && stage.lateCount > 0 && (
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.25rem',
                      padding: '0.125rem 0.375rem',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      borderRadius: '999px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                    }}>
                      <AlertTriangle size={10} />
                      {stage.lateCount}
                    </span>
                  )}
                </div>
              </div>
              {!isLast && (
                <ChevronRight size={18} style={{ color: 'var(--text-muted)', flexShrink: 0, margin: '0 0.125rem' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default JourneyFunnelStepper;
