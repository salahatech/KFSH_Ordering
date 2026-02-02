import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { format } from 'date-fns';
import { Plus, Eye, ArrowRight, HelpCircle, ChevronDown, ChevronUp, Route } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';

const statusDescriptions: Record<string, { label: string; description: string; nextAction: string }> = {
  DRAFT: { 
    label: 'Draft', 
    description: 'Order created but not yet submitted for processing.', 
    nextAction: 'Submit order to begin processing' 
  },
  SUBMITTED: { 
    label: 'Submitted', 
    description: 'Order submitted and awaiting validation by sales team.', 
    nextAction: 'Sales team validates order details' 
  },
  VALIDATED: { 
    label: 'Validated', 
    description: 'Order validated and approved. Ready for production planning.', 
    nextAction: 'Production planner schedules batch' 
  },
  SCHEDULED: { 
    label: 'Scheduled', 
    description: 'Order assigned to a production batch and scheduled for manufacturing.', 
    nextAction: 'Production team starts manufacturing' 
  },
  IN_PRODUCTION: { 
    label: 'In Production', 
    description: 'Radiopharmaceutical is being manufactured.', 
    nextAction: 'Send to QC for quality testing' 
  },
  QC_PENDING: { 
    label: 'QC Pending', 
    description: 'Quality control testing in progress.', 
    nextAction: 'QC analyst completes testing' 
  },
  RELEASED: { 
    label: 'Released', 
    description: 'Batch passed QC and released by Qualified Person (QP). Ready for dispatch.', 
    nextAction: 'Logistics dispatches shipment' 
  },
  DISPATCHED: { 
    label: 'Dispatched', 
    description: 'Order shipped and on the way to customer.', 
    nextAction: 'Confirm delivery to customer' 
  },
  DELIVERED: { 
    label: 'Delivered', 
    description: 'Order successfully delivered to customer. Complete!', 
    nextAction: 'Order complete' 
  },
  CANCELLED: { 
    label: 'Cancelled', 
    description: 'Order was cancelled and will not be fulfilled.', 
    nextAction: '-' 
  },
  REJECTED: { 
    label: 'Rejected', 
    description: 'Order was rejected during validation.', 
    nextAction: '-' 
  },
  FAILED_QC: { 
    label: 'Failed QC', 
    description: 'Batch did not pass quality control testing.', 
    nextAction: 'Rework or cancel order' 
  },
  REWORK: { 
    label: 'Rework', 
    description: 'Order requires rework due to QC failure or other issues.', 
    nextAction: 'Create new batch' 
  },
};

export default function Orders() {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [showStatusGuide, setShowStatusGuide] = useState(false);
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      const statusInfo = statusDescriptions[variables.status];
      toast.success('Status Updated', `Order moved to ${statusInfo?.label || variables.status}`);
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Update Failed', apiError?.userMessage || 'Failed to update order status');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowStatusGuide(!showStatusGuide)}
          >
            <HelpCircle size={18} />
            Status Guide
            {showStatusGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <Link to="/orders/new" className="btn btn-primary">
            <Plus size={18} />
            New Order
          </Link>
        </div>
      </div>

      {showStatusGuide && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HelpCircle size={18} style={{ color: 'var(--primary)' }} />
            Order Workflow Guide
          </h3>
          <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Orders flow through these stages from creation to delivery:
          </div>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius)',
          }}>
            {['DRAFT', 'SUBMITTED', 'VALIDATED', 'SCHEDULED', 'IN_PRODUCTION', 'QC_PENDING', 'RELEASED', 'DISPATCHED', 'DELIVERED'].map((status, idx, arr) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`badge badge-${getStatusColor(status)}`} style={{ fontSize: '0.75rem' }}>
                  {statusDescriptions[status]?.label}
                </span>
                {idx < arr.length - 1 && <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {Object.entries(statusDescriptions).slice(0, 9).map(([status, info]) => (
              <div key={status} style={{ 
                padding: '0.75rem', 
                backgroundColor: 'var(--bg-tertiary)', 
                borderRadius: 'var(--radius-sm)',
                borderLeft: `3px solid var(--${getStatusColor(status) === 'default' ? 'secondary' : getStatusColor(status)})`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span className={`badge badge-${getStatusColor(status)}`} style={{ fontSize: '0.7rem' }}>
                    {info.label}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  {info.description}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <strong>Next:</strong> {info.nextAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                    <Link to={`/orders/${order.id}/journey`} className="btn btn-secondary btn-sm" title="View Journey">
                      <Route size={14} />
                    </Link>
                    <Link to={`/orders/${order.id}`} className="btn btn-secondary btn-sm" title="Edit Order">
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
