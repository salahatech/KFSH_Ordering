import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  ShoppingCart,
  FlaskConical,
  ClipboardCheck,
  Truck,
  Package,
  AlertTriangle,
  Shield,
  Clock,
  CheckCircle,
  RefreshCw,
  FileText,
  Box,
  Factory,
  Warehouse,
} from 'lucide-react';
import { KpiCard } from '../components/shared';
import {
  DashboardHeader,
  JourneyFunnelStepper,
  QueueList,
  ExceptionPanel,
  RecentActivityTimeline,
  CapacityWidget,
  QuickActions,
  CriticalAlerts,
  KPIChartsGrid,
} from '../components/dashboard';

export default function Dashboard() {
  const navigate = useNavigate();
  
  const { data: dashboard, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/overview');
      return data;
    },
    refetchInterval: 60000,
  });

  if (isError) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertTriangle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
        <h2 style={{ marginBottom: '0.5rem' }}>Failed to load dashboard</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          {error instanceof Error ? error.message : 'An error occurred while loading the dashboard.'}
        </p>
        <button className="btn btn-primary" onClick={() => refetch()}>
          Try Again
        </button>
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
        <div className="card skeleton" style={{ height: '120px', marginBottom: '1.5rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card skeleton" style={{ height: '300px' }} />
          ))}
        </div>
      </div>
    );
  }

  const journeyStages = (dashboard?.journeyCounts || []).map((stage: any) => ({
    ...stage,
    linkTo: getJourneyLink(stage.id),
  }));

  return (
    <div>
      <DashboardHeader
        title="Operations Command Center"
        subtitle="End-to-end visibility across orders, production, QC, and logistics"
        lastRefreshed={dashboard?.lastRefreshed ? new Date(dashboard.lastRefreshed) : undefined}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      />

      {/* Quick Actions */}
      <QuickActions />

      {/* Critical Alerts */}
      <div style={{ marginBottom: '1.5rem' }}>
        <CriticalAlerts
          alerts={dashboard?.criticalAlerts || []}
          title="Requiring Immediate Attention"
        />
      </div>

      {/* Visual KPI Charts */}
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Performance Analytics</h3>
      <KPIChartsGrid
        throughputData={dashboard?.charts?.throughput || generateMockThroughput()}
        qcPassRateData={dashboard?.charts?.qcPassRate || generateMockQCPassRate()}
        deliveryData={dashboard?.charts?.delivery || generateMockDelivery()}
        orderDistribution={dashboard?.charts?.orderDistribution || generateMockOrderDistribution()}
      />

      {/* Orders & Production KPI Cards */}
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Orders & Production</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard
          title="Due Today"
          value={dashboard?.kpis?.ordersDueToday || 0}
          icon={<Clock size={20} />}
          trend={dashboard?.kpis?.ordersDueToday > 0 ? 'up' : undefined}
          linkTo="/orders?due=today"
        />
        <KpiCard
          title="Orders Late"
          value={dashboard?.kpis?.ordersLate || 0}
          icon={<AlertTriangle size={20} />}
          color={dashboard?.kpis?.ordersLate > 0 ? 'danger' : undefined}
          linkTo="/orders?risk=high"
        />
        <KpiCard
          title="In Production"
          value={dashboard?.kpis?.batchesInProduction || 0}
          icon={<Factory size={20} />}
          color="info"
          linkTo="/batches?status=IN_PRODUCTION"
        />
        <KpiCard
          title="Awaiting QC"
          value={dashboard?.kpis?.batchesAwaitingQC || 0}
          icon={<FlaskConical size={20} />}
          color="warning"
          linkTo="/qc?status=QC_PENDING"
        />
        <KpiCard
          title="Awaiting QP"
          value={dashboard?.kpis?.batchesAwaitingQP || 0}
          icon={<Shield size={20} />}
          color="info"
          linkTo="/release?status=QC_PASSED"
        />
        <KpiCard
          title="Ready to Dispense"
          value={dashboard?.kpis?.readyToDispense || 0}
          icon={<Package size={20} />}
          color="success"
          linkTo="/dispensing?ready=true"
        />
      </div>

      {/* Logistics KPI Cards */}
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Logistics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard
          title="Ready to Dispatch"
          value={dashboard?.kpis?.shipmentsReadyToDispatch || 0}
          icon={<Truck size={20} />}
          linkTo="/shipments?status=ASSIGNED"
        />
        <KpiCard
          title="Delayed"
          value={dashboard?.kpis?.shipmentsDelayed || 0}
          icon={<AlertTriangle size={20} />}
          color={dashboard?.kpis?.shipmentsDelayed > 0 ? 'danger' : undefined}
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

      {/* Procurement & Inventory KPI Cards */}
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Procurement & Inventory</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard
          title="PO Pending Approval"
          value={dashboard?.kpis?.poPendingApproval || 0}
          icon={<FileText size={20} />}
          color="warning"
          linkTo="/purchase-orders?status=PENDING_APPROVAL"
        />
        <KpiCard
          title="PO Sent"
          value={dashboard?.kpis?.poSent || 0}
          icon={<ShoppingCart size={20} />}
          color="info"
          linkTo="/purchase-orders?status=SENT"
        />
        <KpiCard
          title="GRN Pending QC"
          value={dashboard?.kpis?.grnPendingQC || 0}
          icon={<Box size={20} />}
          color="warning"
          linkTo="/grn?status=PENDING_QC"
        />
        <KpiCard
          title="Low Stock Items"
          value={dashboard?.kpis?.lowStockItems || 0}
          icon={<Warehouse size={20} />}
          color={dashboard?.kpis?.lowStockItems > 0 ? 'danger' : undefined}
          linkTo="/inventory?lowStock=true"
        />
        <KpiCard
          title="eBR In Progress"
          value={dashboard?.kpis?.batchRecordsInProgress || 0}
          icon={<Factory size={20} />}
          color="info"
          linkTo="/manufacturing?status=IN_PROGRESS"
        />
      </div>

      {/* Journey Funnel */}
      <JourneyFunnelStepper
        title="End-to-End Order Journey"
        stages={journeyStages}
      />

      {/* Work Queues - Production */}
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Work Queues - Production</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <QueueList
          title="Validation Queue"
          items={dashboard?.queues?.validation || []}
          viewAllLink="/orders?status=SUBMITTED"
          maxItems={5}
          icon={<ClipboardCheck size={18} style={{ color: '#2563eb' }} />}
          accentColor="#2563eb"
          emptyMessage="No orders awaiting validation"
        />
        <QueueList
          title="Manufacturing Queue"
          items={dashboard?.queues?.manufacturing || []}
          viewAllLink="/manufacturing?status=IN_PROGRESS"
          maxItems={5}
          icon={<Factory size={18} style={{ color: '#059669' }} />}
          accentColor="#059669"
          emptyMessage="No batch records in progress"
        />
        <QueueList
          title="QC Queue"
          items={dashboard?.queues?.qc || []}
          viewAllLink="/qc?status=QC_PENDING"
          maxItems={5}
          icon={<FlaskConical size={18} style={{ color: '#d97706' }} />}
          accentColor="#d97706"
          emptyMessage="No batches awaiting QC"
        />
        <QueueList
          title="QP Release Queue"
          items={dashboard?.queues?.qp || []}
          viewAllLink="/release?status=QC_PASSED"
          maxItems={5}
          icon={<Shield size={18} style={{ color: '#7c3aed' }} />}
          accentColor="#7c3aed"
          emptyMessage="No batches awaiting QP release"
        />
      </div>

      {/* Work Queues - Procurement & Logistics */}
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Work Queues - Procurement & Logistics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <QueueList
          title="PO Approval Queue"
          items={dashboard?.queues?.poApproval || []}
          viewAllLink="/purchase-orders?status=PENDING_APPROVAL"
          maxItems={5}
          icon={<FileText size={18} style={{ color: '#ea580c' }} />}
          accentColor="#ea580c"
          emptyMessage="No POs awaiting approval"
        />
        <QueueList
          title="GRN QC Queue"
          items={dashboard?.queues?.grnQc || []}
          viewAllLink="/grn?status=PENDING_QC"
          maxItems={5}
          icon={<Box size={18} style={{ color: '#0284c7' }} />}
          accentColor="#0284c7"
          emptyMessage="No GRNs awaiting QC"
        />
        <QueueList
          title="Logistics Queue"
          items={dashboard?.queues?.logistics || []}
          viewAllLink="/shipments?status=CREATED"
          maxItems={5}
          icon={<Truck size={18} style={{ color: '#0891b2' }} />}
          accentColor="#0891b2"
          emptyMessage="No shipments pending"
        />
      </div>

      {/* Bottom Row: Exceptions, Capacity, and Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '1rem' }}>
        <ExceptionPanel
          title="Exceptions & Alerts"
          items={dashboard?.exceptions || []}
        />
        <CapacityWidget
          title="Capacity Overview (7 Days)"
          days={dashboard?.capacity || generatePlaceholderCapacity()}
        />
        <RecentActivityTimeline
          title="Recent Activity"
          events={dashboard?.recentActivity || []}
          maxEvents={8}
        />
      </div>
    </div>
  );
}

function getJourneyLink(stageId: string): string {
  const links: Record<string, string> = {
    submitted: '/orders?status=SUBMITTED',
    validated: '/orders?status=VALIDATED',
    scheduled: '/orders?status=SCHEDULED',
    in_production: '/batches?status=IN_PRODUCTION',
    qc_pending: '/qc?status=QC_PENDING',
    released: '/batches?status=RELEASED',
    dispensing: '/dispensing',
    packed: '/batches?status=PACKED',
    dispatched: '/shipments?status=IN_TRANSIT',
    delivered: '/shipments?status=DELIVERED',
  };
  return links[stageId] || '/orders';
}

function generatePlaceholderCapacity() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    days.push({
      date,
      reservedMinutes: Math.floor(Math.random() * 200) + 100,
      committedMinutes: Math.floor(Math.random() * 100) + 50,
      totalCapacity: 480,
      isFull: false,
    });
  }
  return days;
}

function generateMockThroughput() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map(name => ({
    name,
    value: Math.floor(Math.random() * 15) + 5,
  }));
}

function generateMockQCPassRate() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map(name => ({
    name,
    value: Math.floor(Math.random() * 10) + 88,
  }));
}

function generateMockDelivery() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map(name => ({
    name,
    value: Math.floor(Math.random() * 8) + 90,
  }));
}

function generateMockOrderDistribution() {
  return [
    { name: 'Pending', value: 12 },
    { name: 'In Progress', value: 28 },
    { name: 'QC', value: 8 },
    { name: 'Ready', value: 15 },
    { name: 'Delivered', value: 42 },
  ];
}
