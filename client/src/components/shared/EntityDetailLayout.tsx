import React, { useState, ReactNode } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';
import { KpiCard } from './KpiCard';
import { Timeline, TimelineEvent } from './Timeline';
import { LinkedRecordsSidebar, LinkedRecord } from './LinkedRecordsSidebar';

export interface EntityKpi {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default';
  onClick?: () => void;
}

export interface EntityTab {
  key: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  badge?: number;
}

export interface EntityAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  disabled?: boolean;
  tooltip?: string;
}

export interface EntityMetadata {
  label: string;
  value: string | ReactNode;
}

interface EntityDetailLayoutProps {
  title: string;
  subtitle?: string;
  code?: string;
  status?: {
    value: string;
    label: string;
    variant: 'success' | 'warning' | 'danger' | 'info' | 'default';
  };
  metadata?: EntityMetadata[];
  kpis?: EntityKpi[];
  tabs: EntityTab[];
  defaultTab?: string;
  actions?: EntityAction[];
  linkedRecords?: LinkedRecord[];
  timeline?: TimelineEvent[];
  showTimeline?: boolean;
  showLinkedRecords?: boolean;
  backUrl?: string;
  backLabel?: string;
  loading?: boolean;
  children?: ReactNode;
}

export function EntityDetailLayout({
  title,
  subtitle,
  code,
  status,
  metadata = [],
  kpis = [],
  tabs,
  defaultTab,
  actions = [],
  linkedRecords = [],
  timeline = [],
  showTimeline = true,
  showLinkedRecords = true,
  backUrl,
  backLabel = 'Back',
  loading = false,
}: EntityDetailLayoutProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.key || '');
  const [showTimelinePanel, setShowTimelinePanel] = useState(false);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  const activeTabContent = tabs.find(t => t.key === activeTab)?.content;

  return (
    <div style={{ display: 'flex', gap: '1.5rem' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 10, 
          background: 'var(--bg-secondary)', 
          paddingBottom: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              {backUrl && (
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(backUrl)}
                  style={{ marginTop: '0.25rem' }}
                >
                  <ArrowLeft size={16} />
                  {backLabel}
                </button>
              )}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
                    {code && <span style={{ color: 'var(--text-muted)' }}>{code} - </span>}
                    {title}
                  </h1>
                  {status && (
                    <StatusBadge status={status.value} />
                  )}
                </div>
                {subtitle && (
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>{subtitle}</p>
                )}
                {metadata.length > 0 && (
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {metadata.map((m, i) => (
                      <span key={i} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        <strong>{m.label}:</strong> {m.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {actions.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {actions.map((action, i) => (
                  <button
                    key={i}
                    className={`btn btn-${action.variant || 'secondary'}`}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    title={action.tooltip}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {kpis.length > 0 && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(auto-fit, minmax(${kpis.length <= 4 ? '180px' : '150px'}, 1fr))`, 
            gap: '1rem', 
            marginBottom: '1.5rem' 
          }}>
            {kpis.map((kpi, i) => (
              <KpiCard
                key={i}
                title={kpi.title}
                value={kpi.value}
                icon={kpi.icon}
                color={kpi.color}
                onClick={kpi.onClick}
              />
            ))}
          </div>
        )}

        {tabs.length > 0 && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ 
              display: 'flex', 
              borderBottom: '1px solid var(--border)', 
              overflowX: 'auto',
              gap: '0'
            }}>
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '0.875rem 1.25rem',
                    border: 'none',
                    background: activeTab === tab.key ? 'var(--bg-primary)' : 'transparent',
                    borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                    color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === tab.key ? 600 : 400,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    whiteSpace: 'nowrap',
                    fontSize: '0.875rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>{tab.badge}</span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ padding: '1.5rem' }}>
              {activeTabContent}
            </div>
          </div>
        )}

        {showTimeline && timeline.length > 0 && (
          <div className="card">
            <div 
              style={{ 
                padding: '1rem 1.5rem', 
                borderBottom: showTimelinePanel ? '1px solid var(--border)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer'
              }}
              onClick={() => setShowTimelinePanel(!showTimelinePanel)}
            >
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                Activity Timeline ({timeline.length})
              </h3>
              {showTimelinePanel ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
            {showTimelinePanel && (
              <div style={{ padding: '1.5rem' }}>
                <Timeline events={timeline} />
              </div>
            )}
          </div>
        )}
      </div>

      {showLinkedRecords && linkedRecords.length > 0 && (
        <div style={{ width: '280px', flexShrink: 0 }}>
          <div style={{ position: 'sticky', top: '1rem' }}>
            <LinkedRecordsSidebar records={linkedRecords} />
          </div>
        </div>
      )}
    </div>
  );
}
