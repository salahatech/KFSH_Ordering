import React from 'react';
import { PageHeader, KpiCard, FilterBar, EmptyState, Card } from '../shared';
import type { KpiCardProps } from '../shared/KpiCard';
import type { FilterWidget } from '../shared/FilterBar';

interface KpiConfig extends Omit<KpiCardProps, 'onClick'> {
  filterKey?: string;
  filterValue?: string;
}

type EmptyIconType = 'search' | 'success' | 'file' | 'alert' | 'user' | 'package' | 'question' | 'beaker' | 'clock' | 'truck' | 'box';

interface ListPageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  kpis?: KpiConfig[];
  onKpiClick?: (filterKey: string, filterValue: string) => void;
  activeKpiFilter?: { key: string; value: string };
  filterWidgets?: FilterWidget[];
  filterValues?: Record<string, any>;
  onFilterChange?: (key: string, value: any) => void;
  onFilterReset?: () => void;
  loading?: boolean;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: EmptyIconType;
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
  detailPanel?: React.ReactNode;
}

export function ListPageLayout({
  title,
  subtitle,
  actions,
  kpis,
  onKpiClick,
  activeKpiFilter,
  filterWidgets,
  filterValues,
  onFilterChange,
  onFilterReset,
  loading = false,
  isEmpty = false,
  emptyTitle = 'No items found',
  emptyMessage = 'Get started by creating your first item',
  emptyIcon = 'package',
  emptyAction,
  children,
  detailPanel,
}: ListPageLayoutProps) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />

      {kpis && kpis.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`,
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {kpis.map((kpi, index) => (
            <KpiCard
              key={index}
              {...kpi}
              onClick={
                kpi.filterKey && onKpiClick
                  ? () => onKpiClick(kpi.filterKey!, kpi.filterValue || '')
                  : undefined
              }
              active={
                activeKpiFilter &&
                kpi.filterKey === activeKpiFilter.key &&
                (kpi.filterValue || '') === activeKpiFilter.value
              }
            />
          ))}
        </div>
      )}

      {filterWidgets && filterWidgets.length > 0 && filterValues && onFilterChange && (
        <Card padding="sm" style={{ marginBottom: '1.5rem' }}>
          <FilterBar
            widgets={filterWidgets}
            values={filterValues}
            onChange={onFilterChange}
            onReset={onFilterReset}
          />
        </Card>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: detailPanel ? '1fr 400px' : '1fr',
          gap: '1.5rem',
        }}
      >
        <div>
          {loading ? (
            <Card>
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="loading-spinner" style={{ marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
              </div>
            </Card>
          ) : isEmpty ? (
            <Card>
              <div style={{ padding: '3rem' }}>
                <EmptyState
                  title={emptyTitle}
                  message={emptyMessage}
                  icon={emptyIcon}
                />
                {emptyAction && (
                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>{emptyAction}</div>
                )}
              </div>
            </Card>
          ) : (
            children
          )}
        </div>

        {detailPanel && (
          <div style={{ position: 'sticky', top: '1rem', height: 'fit-content' }}>
            {detailPanel}
          </div>
        )}
      </div>
    </div>
  );
}

export default ListPageLayout;
