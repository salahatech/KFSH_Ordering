import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Shield, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { KpiCard } from '../components/shared';
import { DashboardHeader, QueueList, ExceptionPanel } from '../components/dashboard';

export default function DashboardQP() {
  const navigate = useNavigate();
  
  const { data: dashboard, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-qp'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/qp');
      return data;
    },
    refetchInterval: 60000,
  });

  if (isError) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
        <h2 style={{ marginBottom: '0.5rem' }}>Failed to load QP dashboard</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          {error instanceof Error ? error.message : 'An error occurred.'}
        </p>
        <button className="btn btn-primary" onClick={() => refetch()}>Try Again</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card skeleton" style={{ height: '100px' }} />
          ))}
        </div>
        <div className="card skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  const exceptions = [
    { id: 'on_hold', type: 'warning' as const, icon: 'on_hold' as const, title: 'On Hold Batches', count: dashboard?.kpis?.onHold || 0, linkTo: '/batches?status=ON_HOLD' },
    { id: 'rejected', type: 'error' as const, icon: 'qc_failed' as const, title: 'Rejected Batches', count: dashboard?.kpis?.rejected || 0, linkTo: '/batches?status=REJECTED' },
  ];

  return (
    <div>
      <DashboardHeader
        title="QP Release Dashboard"
        subtitle="Batch release queue and QP approval overview"
        lastRefreshed={dashboard?.lastRefreshed ? new Date(dashboard.lastRefreshed) : undefined}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        actions={
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            Back to Overview
          </button>
        }
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard
          title="Awaiting QP Release"
          value={dashboard?.kpis?.awaitingQP || 0}
          icon={<Shield size={20} />}
          color="warning"
          linkTo="/release?status=QC_PASSED"
        />
        <KpiCard
          title="On Hold"
          value={dashboard?.kpis?.onHold || 0}
          icon={<AlertCircle size={20} />}
          color={dashboard?.kpis?.onHold > 0 ? 'warning' : undefined}
          linkTo="/batches?status=ON_HOLD"
        />
        <KpiCard
          title="Released Today"
          value={dashboard?.kpis?.releasedToday || 0}
          icon={<CheckCircle size={20} />}
          color="success"
          linkTo="/batches?status=RELEASED&today=true"
        />
        <KpiCard
          title="Rejected"
          value={dashboard?.kpis?.rejected || 0}
          icon={<XCircle size={20} />}
          color={dashboard?.kpis?.rejected > 0 ? 'danger' : undefined}
          linkTo="/batches?status=REJECTED"
        />
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
        <QueueList
          title="QP Release Queue"
          items={dashboard?.queue || []}
          viewAllLink="/release"
          maxItems={10}
          icon={<Shield size={18} style={{ color: '#7c3aed' }} />}
          accentColor="#7c3aed"
          emptyMessage="No batches awaiting QP release"
        />
        <ExceptionPanel
          title="Release Exceptions"
          items={exceptions}
        />
      </div>
    </div>
  );
}
