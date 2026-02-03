import React, { useState } from 'react';
import { PageHeader, KpiCard, Card, Timeline, LinkedRecordsSidebar, type LinkedRecord as SharedLinkedRecord } from '../shared';
import type { KpiCardProps } from '../shared/KpiCard';

interface Tab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  badge?: number | string;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DetailPageLayoutProps {
  title: string;
  subtitle?: string;
  status?: string;
  statusLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  kpis?: KpiCardProps[];
  tabs: Tab[];
  defaultTab?: string;
  linkedRecords?: SharedLinkedRecord[];
  showTimeline?: boolean;
  timelineEvents?: any[];
  stickyHeader?: boolean;
}

export function DetailPageLayout({
  title,
  subtitle,
  status,
  statusLabel,
  breadcrumbs,
  actions,
  kpis,
  tabs,
  defaultTab,
  linkedRecords,
  showTimeline = false,
  timelineEvents = [],
  stickyHeader = true,
}: DetailPageLayoutProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.key);
  const hasLinkedRecords = linkedRecords && linkedRecords.length > 0;

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        status={status}
        statusLabel={statusLabel}
        breadcrumbs={breadcrumbs}
        actions={actions}
        sticky={stickyHeader}
      />

      {kpis && kpis.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))`,
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {kpis.map((kpi, index) => (
            <KpiCard key={index} {...kpi} />
          ))}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: hasLinkedRecords ? '1fr 300px' : '1fr',
          gap: '1.5rem',
        }}
      >
        <div>
          <Card padding="none">
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid var(--border)',
                overflow: 'auto',
              }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.875rem 1.25rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                    color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: activeTab === tab.key ? 600 : 500,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span
                      style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                        backgroundColor: 'var(--bg-tertiary)',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ padding: '1.5rem' }}>
              {tabs.find((t) => t.key === activeTab)?.content}
            </div>
          </Card>

          {showTimeline && timelineEvents.length > 0 && (
            <Card style={{ marginTop: '1.5rem' }}>
              <h3
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                  color: 'var(--text-primary)',
                }}
              >
                Activity Timeline
              </h3>
              <Timeline events={timelineEvents} />
            </Card>
          )}
        </div>

        {hasLinkedRecords && (
          <div style={{ position: 'sticky', top: '5rem', height: 'fit-content' }}>
            <LinkedRecordsSidebar records={linkedRecords} />
          </div>
        )}
      </div>
    </div>
  );
}

export default DetailPageLayout;
