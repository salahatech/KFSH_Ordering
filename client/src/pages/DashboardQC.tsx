import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { FlaskConical, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { KpiCard } from '../components/shared';
import { DashboardHeader, QueueList, ExceptionPanel } from '../components/dashboard';

export default function DashboardQC() {
  const navigate = useNavigate();
  
  const { data: dashboard, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-qc'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/qc');
      return data;
    },
    refetchInterval: 60000,
  });

  if (isError) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertTriangle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
        <h2 style={{ marginBottom: '0.5rem' }}>Failed to load QC dashboard</h2>
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
    { id: 'qc_failed', type: 'error' as const, icon: 'qc_failed' as const, title: 'QC Failed Batches', count: dashboard?.kpis?.qcFailed || 0, linkTo: '/batches?status=FAILED_QC' },
  ];

  return (
    <div>
      <DashboardHeader
        title="QC Dashboard"
        subtitle="Quality control queue and batch testing overview"
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
          title="Awaiting Samples"
          value={dashboard?.kpis?.awaitingSamples || 0}
          icon={<FlaskConical size={20} />}
          color="warning"
          linkTo="/qc?status=QC_PENDING"
        />
        <KpiCard
          title="QC In Progress"
          value={dashboard?.kpis?.qcInProgress || 0}
          icon={<Clock size={20} />}
          color="info"
          linkTo="/qc?status=QC_IN_PROGRESS"
        />
        <KpiCard
          title="QC Failed"
          value={dashboard?.kpis?.qcFailed || 0}
          icon={<XCircle size={20} />}
          color={dashboard?.kpis?.qcFailed > 0 ? 'danger' : undefined}
          linkTo="/batches?status=FAILED_QC"
        />
        <KpiCard
          title="Nearing Deadline"
          value={dashboard?.kpis?.nearingDeadline || 0}
          icon={<AlertTriangle size={20} />}
          color={dashboard?.kpis?.nearingDeadline > 0 ? 'warning' : undefined}
          linkTo="/qc?urgent=true"
        />
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
        <QueueList
          title="QC Queue - Prioritized by Delivery Urgency"
          items={dashboard?.queue || []}
          viewAllLink="/qc"
          maxItems={10}
          icon={<FlaskConical size={18} style={{ color: '#d97706' }} />}
          accentColor="#d97706"
          emptyMessage="No batches awaiting QC testing"
        />
        <ExceptionPanel
          title="QC Exceptions"
          items={exceptions}
        />
      </div>
    </div>
  );
}
