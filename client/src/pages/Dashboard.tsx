import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import {
  ShoppingCart,
  FlaskConical,
  ClipboardCheck,
  Truck,
  ArrowUpRight,
  Clock,
} from 'lucide-react';

export default function Dashboard() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/reports/dashboard');
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-label">Today's Orders</div>
              <div className="stat-value">{dashboard?.today?.orders || 0}</div>
            </div>
            <div
              style={{
                width: '3rem',
                height: '3rem',
                background: '#dbeafe',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingCart size={24} color="#2563eb" />
            </div>
          </div>
        </div>

        <div className="card stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-label">Today's Batches</div>
              <div className="stat-value">{dashboard?.today?.batches || 0}</div>
            </div>
            <div
              style={{
                width: '3rem',
                height: '3rem',
                background: '#dcfce7',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FlaskConical size={24} color="#22c55e" />
            </div>
          </div>
        </div>

        <div className="card stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-label">Pending QC</div>
              <div className="stat-value">{dashboard?.today?.pendingQC || 0}</div>
            </div>
            <div
              style={{
                width: '3rem',
                height: '3rem',
                background: '#fef3c7',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ClipboardCheck size={24} color="#f59e0b" />
            </div>
          </div>
        </div>

        <div className="card stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-label">In Transit</div>
              <div className="stat-value">{dashboard?.today?.inTransit || 0}</div>
            </div>
            <div
              style={{
                width: '3rem',
                height: '3rem',
                background: '#e0f2fe',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={24} color="#0284c7" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 600 }}>Recent Orders</h3>
          </div>
          <div style={{ padding: '0' }}>
            {dashboard?.recentOrders?.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentOrders.map((order: any) => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 500 }}>{order.orderNumber}</td>
                      <td>{order.customer?.name}</td>
                      <td>{order.product?.name}</td>
                      <td>
                        <span className={`badge badge-${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">No recent orders</div>
            )}
          </div>
        </div>

        <div className="card">
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 600 }}>Recent Batches</h3>
          </div>
          <div style={{ padding: '0' }}>
            {dashboard?.recentBatches?.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Batch #</th>
                    <th>Product</th>
                    <th>Scheduled</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentBatches.map((batch: any) => (
                    <tr key={batch.id}>
                      <td style={{ fontWeight: 500 }}>{batch.batchNumber}</td>
                      <td>{batch.product?.name}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={14} color="var(--text-muted)" />
                          {format(new Date(batch.plannedStartTime), 'HH:mm')}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${getStatusColor(batch.status)}`}>
                          {batch.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">No recent batches</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'default',
    SUBMITTED: 'info',
    VALIDATED: 'info',
    SCHEDULED: 'info',
    IN_PRODUCTION: 'warning',
    QC_PENDING: 'warning',
    QC_IN_PROGRESS: 'warning',
    QC_PASSED: 'success',
    QC_FAILED: 'danger',
    RELEASED: 'success',
    DISPATCHED: 'info',
    DELIVERED: 'success',
    CANCELLED: 'danger',
    PLANNED: 'default',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success',
  };
  return colors[status] || 'default';
}
