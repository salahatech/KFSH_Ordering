import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { format } from 'date-fns';
import { Plus, Eye, ArrowRight, Filter } from 'lucide-react';

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', statusFilter, dateFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) {
        params.fromDate = dateFilter;
        params.toDate = dateFilter;
      }
      const { data } = await api.get('/orders', { params });
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.patch(`/orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      DRAFT: 'default',
      SUBMITTED: 'info',
      VALIDATED: 'info',
      SCHEDULED: 'info',
      IN_PRODUCTION: 'warning',
      QC_PENDING: 'warning',
      RELEASED: 'success',
      DISPATCHED: 'info',
      DELIVERED: 'success',
      CANCELLED: 'danger',
      REJECTED: 'danger',
      FAILED_QC: 'danger',
    };
    return colors[status] || 'default';
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const transitions: Record<string, string> = {
      DRAFT: 'SUBMITTED',
      SUBMITTED: 'VALIDATED',
      VALIDATED: 'SCHEDULED',
    };
    return transitions[currentStatus] || null;
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Orders</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="VALIDATED">Validated</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PRODUCTION">In Production</option>
              <option value="QC_PENDING">QC Pending</option>
              <option value="RELEASED">Released</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="DELIVERED">Delivered</option>
            </select>
            <input
              type="date"
              className="form-input"
              style={{ width: 'auto' }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
        <Link to="/orders/new" className="btn btn-primary">
          <Plus size={18} />
          New Order
        </Link>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Delivery</th>
              <th>Activity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((order: any) => (
              <tr key={order.id}>
                <td style={{ fontWeight: 500 }}>{order.orderNumber}</td>
                <td>
                  <div>{order.customer?.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {order.customer?.city}
                  </div>
                </td>
                <td>
                  <div>{order.product?.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {order.product?.radionuclide}
                  </div>
                </td>
                <td>
                  <div>{format(new Date(order.deliveryDate), 'MMM dd, yyyy')}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {format(new Date(order.deliveryTimeStart), 'HH:mm')} - {format(new Date(order.deliveryTimeEnd), 'HH:mm')}
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>
                    {order.requestedActivity} {order.activityUnit}
                  </div>
                  {order.calculatedProductionActivity && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Prod: {order.calculatedProductionActivity.toFixed(1)} {order.activityUnit}
                    </div>
                  )}
                </td>
                <td>
                  <span className={`badge badge-${getStatusColor(order.status)}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link to={`/orders/${order.id}`} className="btn btn-secondary btn-sm">
                      <Eye size={14} />
                    </Link>
                    {getNextStatus(order.status) && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => updateStatusMutation.mutate({ id: order.id, status: getNextStatus(order.status)! })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders?.length === 0 && <div className="empty-state">No orders found</div>}
      </div>
    </div>
  );
}
