import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { ShoppingCart, Clock, CheckCircle, Plus, Receipt, Truck, Package, AlertTriangle } from 'lucide-react';
import { KpiCard, StatusBadge } from '../../components/shared';
import { DashboardHeader, JourneyFunnelStepper, QueueList, type JourneyStage, type QueueItem } from '../../components/dashboard';

export default function PortalDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: orders, isLoading: ordersLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['portal-orders'],
    queryFn: async () => {
      const { data } = await api.get('/orders', { params: { limit: 20 } });
      return data;
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ['portal-invoices'],
    queryFn: async () => {
      const { data } = await api.get('/invoices', { params: { limit: 5 } });
      return data;
    },
  });

  if (isError) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertTriangle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
        <h2 style={{ marginBottom: '0.5rem' }}>Failed to load dashboard</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          {error instanceof Error ? error.message : 'An error occurred while loading your dashboard.'}
        </p>
        <button className="btn btn-primary" onClick={() => refetch()}>
          Try Again
        </button>
      </div>
    );
  }

  if (ordersLoading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card skeleton" style={{ height: '100px' }} />
          ))}
        </div>
        <div className="card skeleton" style={{ height: '120px', marginBottom: '1.5rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          {[1, 2].map(i => (
            <div key={i} className="card skeleton" style={{ height: '300px' }} />
          ))}
        </div>
      </div>
    );
  }

  const stats = {
    totalOrders: orders?.length || 0,
    activeOrders: orders?.filter((o: any) => !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status)).length || 0,
    deliveredOrders: orders?.filter((o: any) => o.status === 'DELIVERED').length || 0,
    pendingInvoices: invoices?.filter((i: any) => ['SENT', 'PARTIALLY_PAID'].includes(i.status)).length || 0,
  };

  const statusCounts = (orders || []).reduce((acc: Record<string, number>, order: any) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  const journeyStages: JourneyStage[] = [
    { id: 'submitted', label: 'Submitted', count: statusCounts['SUBMITTED'] || 0, color: 'blue', linkTo: '/portal/orders?status=SUBMITTED' },
    { id: 'confirmed', label: 'Confirmed', count: statusCounts['VALIDATED'] || 0, color: 'blue', linkTo: '/portal/orders?status=VALIDATED' },
    { id: 'scheduled', label: 'Scheduled', count: statusCounts['SCHEDULED'] || 0, color: 'blue', linkTo: '/portal/orders?status=SCHEDULED' },
    { id: 'in_production', label: 'In Production', count: statusCounts['IN_PRODUCTION'] || 0, color: 'yellow', linkTo: '/portal/orders?status=IN_PRODUCTION' },
    { id: 'dispatched', label: 'Dispatched', count: statusCounts['DISPATCHED'] || 0, color: 'teal', linkTo: '/portal/orders?status=DISPATCHED' },
    { id: 'delivered', label: 'Delivered', count: statusCounts['DELIVERED'] || 0, color: 'green', linkTo: '/portal/orders?status=DELIVERED' },
  ];

  const arrivingToday = (orders || [])
    .filter((o: any) => {
      const deliveryDate = new Date(o.deliveryDate);
      const today = new Date();
      return deliveryDate.toDateString() === today.toDateString() && !['DELIVERED', 'CANCELLED'].includes(o.status);
    })
    .map((o: any) => ({
      id: o.id,
      identifier: o.orderNumber,
      title: o.product?.name || 'Unknown Product',
      eta: o.deliveryDate,
      status: o.status,
      nextAction: 'Track',
      linkTo: `/portal/orders/${o.id}/journey`,
    }));

  const inTransitOrders = (orders || [])
    .filter((o: any) => o.status === 'DISPATCHED')
    .map((o: any) => ({
      id: o.id,
      identifier: o.orderNumber,
      title: o.product?.name || 'Unknown Product',
      subtitle: 'In Transit',
      eta: o.deliveryDate,
      status: o.status,
      nextAction: 'Track Shipment',
      linkTo: `/portal/orders/${o.id}/journey`,
    }));

  return (
    <div>
      <DashboardHeader
        title={`Welcome back, ${user?.firstName}!`}
        subtitle="Manage your radiopharmaceutical orders and track deliveries"
        lastRefreshed={new Date()}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        actions={
          <Link 
            to="/portal/orders/new" 
            className="btn btn-primary"
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Plus size={18} /> Place New Order
          </Link>
        }
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard
          title="Total Orders"
          value={stats.totalOrders}
          icon={<ShoppingCart size={20} />}
          color="primary"
          linkTo="/portal/orders"
        />
        <KpiCard
          title="In Progress"
          value={stats.activeOrders}
          icon={<Clock size={20} />}
          color="warning"
          linkTo="/portal/orders?active=true"
        />
        <KpiCard
          title="Delivered"
          value={stats.deliveredOrders}
          icon={<CheckCircle size={20} />}
          color="success"
          linkTo="/portal/orders?status=DELIVERED"
        />
        <KpiCard
          title="Pending Invoices"
          value={stats.pendingInvoices}
          icon={<Receipt size={20} />}
          color={stats.pendingInvoices > 0 ? 'danger' : 'info'}
          linkTo="/portal/invoices"
        />
      </div>

      {/* Journey Funnel */}
      <JourneyFunnelStepper
        title="My Orders Journey"
        stages={journeyStages}
      />

      {/* Work Queues */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <QueueList
          title="Arriving Today"
          items={arrivingToday}
          viewAllLink="/portal/orders?due=today"
          maxItems={5}
          icon={<Package size={18} style={{ color: '#0d9488' }} />}
          accentColor="#0d9488"
          emptyMessage="No orders arriving today"
        />
        <QueueList
          title="In Transit"
          items={inTransitOrders}
          viewAllLink="/portal/orders?status=DISPATCHED"
          maxItems={5}
          icon={<Truck size={18} style={{ color: '#0891b2' }} />}
          accentColor="#0891b2"
          emptyMessage="No orders in transit"
        />
      </div>

      {/* Recent Tables */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Recent Orders</h3>
            <Link to="/portal/orders" className="btn btn-sm btn-secondary">
              View All
            </Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Product</th>
                <th>Delivery</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders?.slice(0, 5).map((order: any) => (
                <tr 
                  key={order.id} 
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/portal/orders/${order.id}/journey`)}
                >
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{order.orderNumber}</td>
                  <td>{order.product?.name}</td>
                  <td style={{ fontSize: '0.875rem' }}>
                    {format(new Date(order.deliveryDate), 'MMM d')}
                  </td>
                  <td>
                    <StatusBadge status={order.status} size="sm" />
                  </td>
                </tr>
              ))}
              {(!orders || orders.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No orders yet. Place your first order!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Recent Invoices</h3>
            <Link to="/portal/invoices" className="btn btn-sm btn-secondary">
              View All
            </Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices?.slice(0, 5).map((invoice: any) => (
                <tr key={invoice.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{invoice.invoiceNumber}</td>
                  <td style={{ fontSize: '0.875rem' }}>
                    {format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}
                  </td>
                  <td style={{ fontWeight: 500 }}>${invoice.totalAmount?.toFixed(2)}</td>
                  <td>
                    <StatusBadge 
                      status={invoice.status} 
                      size="sm"
                    />
                  </td>
                </tr>
              ))}
              {(!invoices || invoices.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No invoices yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
