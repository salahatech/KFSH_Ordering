import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Truck, Package, Send, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { KpiCard } from '../components/shared';
import { DashboardHeader, QueueList, ExceptionPanel } from '../components/dashboard';

export default function DashboardLogistics() {
  const navigate = useNavigate();
  
  const { data: dashboard, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-logistics'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/logistics');
      return data;
    },
    refetchInterval: 60000,
  });

  if (isError) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertTriangle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
        <h2 style={{ marginBottom: '0.5rem' }}>Failed to load Logistics dashboard</h2>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="card skeleton" style={{ height: '100px' }} />
          ))}
        </div>
        <div className="card skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  const exceptions = [
    { id: 'delayed', type: 'error' as const, icon: 'delay' as const, title: 'Delayed Shipments', count: dashboard?.kpis?.delayed || 0, linkTo: '/shipments?status=DELAYED' },
  ];

  return (
    <div>
      <DashboardHeader
        title="Logistics Dashboard"
        subtitle="Shipment tracking and delivery management"
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard
          title="Ready to Pack"
          value={dashboard?.kpis?.readyToPack || 0}
          icon={<Package size={20} />}
          linkTo="/shipments?status=CREATED"
        />
        <KpiCard
          title="Ready to Dispatch"
          value={dashboard?.kpis?.readyToDispatch || 0}
          icon={<Send size={20} />}
          color="info"
          linkTo="/shipments?status=ASSIGNED"
        />
        <KpiCard
          title="In Transit"
          value={dashboard?.kpis?.inTransit || 0}
          icon={<Truck size={20} />}
          color="warning"
          linkTo="/shipments?status=IN_TRANSIT"
        />
        <KpiCard
          title="Delayed"
          value={dashboard?.kpis?.delayed || 0}
          icon={<AlertTriangle size={20} />}
          color={dashboard?.kpis?.delayed > 0 ? 'danger' : undefined}
          linkTo="/shipments?status=DELAYED"
        />
        <KpiCard
          title="Delivered Today"
          value={dashboard?.kpis?.deliveredToday || 0}
          icon={<CheckCircle size={20} />}
          color="success"
          linkTo="/shipments?delivered=today"
        />
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
        <QueueList
          title="Logistics Queue"
          items={dashboard?.queue || []}
          viewAllLink="/shipments"
          maxItems={10}
          icon={<Truck size={18} style={{ color: '#0891b2' }} />}
          accentColor="#0891b2"
          emptyMessage="No shipments in queue"
        />
        <ExceptionPanel
          title="Logistics Exceptions"
          items={exceptions}
        />
      </div>
    </div>
  );
}
