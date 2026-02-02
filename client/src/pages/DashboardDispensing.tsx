import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Package, Play, Pause, CheckCircle, AlertTriangle } from 'lucide-react';
import { KpiCard } from '../components/shared';
import { DashboardHeader, QueueList, ExceptionPanel } from '../components/dashboard';

export default function DashboardDispensing() {
  const navigate = useNavigate();
  
  const { data: dashboard, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-dispensing'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/dispensing');
      return data;
    },
    refetchInterval: 60000,
  });

  if (isError) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertTriangle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
        <h2 style={{ marginBottom: '0.5rem' }}>Failed to load Dispensing dashboard</h2>
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
    { id: 'blocked', type: 'warning' as const, icon: 'on_hold' as const, title: 'Blocked (Not Released)', count: dashboard?.kpis?.blocked || 0, linkTo: '/batches?status=ON_HOLD,FAILED_QC' },
  ];

  return (
    <div>
      <DashboardHeader
        title="Dispensing Dashboard"
        subtitle="Dose dispensing queue and progress tracking"
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
          title="Ready to Dispense"
          value={dashboard?.kpis?.readyToDispense || 0}
          icon={<Package size={20} />}
          color="success"
          linkTo="/dispensing?ready=true"
        />
        <KpiCard
          title="Dispensing In Progress"
          value={dashboard?.kpis?.dispensingInProgress || 0}
          icon={<Play size={20} />}
          color="info"
          linkTo="/dispensing?status=DISPENSING_IN_PROGRESS"
        />
        <KpiCard
          title="Blocked"
          value={dashboard?.kpis?.blocked || 0}
          icon={<Pause size={20} />}
          color={dashboard?.kpis?.blocked > 0 ? 'warning' : undefined}
          linkTo="/batches?status=ON_HOLD,FAILED_QC"
        />
        <KpiCard
          title="Dispensed Today"
          value={dashboard?.kpis?.dispensedToday || 0}
          icon={<CheckCircle size={20} />}
          color="success"
          linkTo="/dispensing?dispensed=today"
        />
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
        <QueueList
          title="Dispensing Queue"
          items={dashboard?.queue || []}
          viewAllLink="/dispensing"
          maxItems={10}
          icon={<Package size={18} style={{ color: '#0d9488' }} />}
          accentColor="#0d9488"
          emptyMessage="No batches ready for dispensing"
        />
        <ExceptionPanel
          title="Dispensing Exceptions"
          items={exceptions}
        />
      </div>
    </div>
  );
}
