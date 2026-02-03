import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Plus, Eye, ArrowRight, HelpCircle, ChevronDown, ChevronUp, Route, ShoppingCart, Clock, CheckCircle, Truck, Package } from 'lucide-react';
import { useLocalization } from '../hooks/useLocalization';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';
import { KpiCard, StatusBadge, FilterBar, EmptyState, type FilterWidget } from '../components/shared';

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
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [showStatusGuide, setShowStatusGuide] = useState(false);
  const queryClient = useQueryClient();
  const { formatDateOnly, formatTimeOnly } = useLocalization();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', filters.status, filters.date],
    queryFn: async () => {
      const params: any = {};
      if (filters.status) params.status = filters.status;
      if (filters.date) {
        params.fromDate = filters.date;
        params.toDate = filters.date;
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

  const filterWidgets: FilterWidget[] = [
    { key: 'search', label: 'Search', type: 'search', placeholder: 'Search orders...' },
    { 
      key: 'status', 
      label: 'Status', 
      type: 'select', 
      options: [
        { value: '', label: 'All Statuses' },
        { value: 'DRAFT', label: 'Draft' },
        { value: 'SUBMITTED', label: 'Submitted' },
        { value: 'VALIDATED', label: 'Validated' },
        { value: 'SCHEDULED', label: 'Scheduled' },
        { value: 'IN_PRODUCTION', label: 'In Production' },
        { value: 'QC_PENDING', label: 'QC Pending' },
        { value: 'RELEASED', label: 'Released' },
        { value: 'DISPATCHED', label: 'Dispatched' },
        { value: 'DELIVERED', label: 'Delivered' },
      ]
    },
  ];

  const filteredOrders = orders?.filter((order: any) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!order.orderNumber.toLowerCase().includes(q) &&
          !order.customer?.name?.toLowerCase().includes(q) &&
          !order.product?.name?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter((o: any) => ['DRAFT', 'SUBMITTED', 'VALIDATED'].includes(o.status)).length || 0,
    inProgress: orders?.filter((o: any) => ['SCHEDULED', 'IN_PRODUCTION', 'QC_PENDING'].includes(o.status)).length || 0,
    ready: orders?.filter((o: any) => ['RELEASED', 'DISPATCHED'].includes(o.status)).length || 0,
    delivered: orders?.filter((o: any) => o.status === 'DELIVERED').length || 0,
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Orders</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Manage radiopharmaceutical orders from creation to delivery
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowStatusGuide(!showStatusGuide)}
          >
            <HelpCircle size={16} />
            Status Guide
            {showStatusGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <Link to="/orders/new" className="btn btn-primary">
            <Plus size={16} />
            New Order
          </Link>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Orders" 
          value={stats.total} 
          icon={<ShoppingCart size={20} />}
          color="primary"
          onClick={() => setFilters({})}
          selected={!filters.status}
        />
        <KpiCard 
          title="Pending" 
          value={stats.pending} 
          icon={<Clock size={20} />}
          color="warning"
          onClick={() => setFilters(prev => ({ ...prev, status: 'SUBMITTED' }))}
          selected={filters.status === 'SUBMITTED'}
        />
        <KpiCard 
          title="In Progress" 
          value={stats.inProgress} 
          icon={<Package size={20} />}
          color="info"
          onClick={() => setFilters(prev => ({ ...prev, status: 'IN_PRODUCTION' }))}
          selected={filters.status === 'IN_PRODUCTION'}
        />
        <KpiCard 
          title="Ready/Dispatched" 
          value={stats.ready} 
          icon={<Truck size={20} />}
          color="success"
          onClick={() => setFilters(prev => ({ ...prev, status: 'RELEASED' }))}
          selected={filters.status === 'RELEASED'}
        />
        <KpiCard 
          title="Delivered" 
          value={stats.delivered} 
          icon={<CheckCircle size={20} />}
          color="default"
          onClick={() => setFilters(prev => ({ ...prev, status: 'DELIVERED' }))}
          selected={filters.status === 'DELIVERED'}
        />
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <FilterBar 
            widgets={filterWidgets}
            values={filters}
            onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
            onReset={() => setFilters({})}
          />
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Delivery Date</label>
            <input
              type="date"
              className="form-input"
              style={{ width: '160px' }}
              value={filters.date || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
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
                <StatusBadge status={status} size="sm" />
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
                  <StatusBadge status={status} size="sm" />
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
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
            Order List ({filteredOrders?.length || 0})
          </h3>
        </div>
        {filteredOrders?.length > 0 ? (
          <table className="table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Delivery</th>
                <th>Activity</th>
                <th>Status</th>
                <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order: any) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.8125rem' }}>{order.orderNumber}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{order.customer?.name}</div>
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
                    <div>{formatDateOnly(order.deliveryDate)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formatTimeOnly(order.deliveryTimeStart)} - {formatTimeOnly(order.deliveryTimeEnd)}
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
                    <StatusBadge status={order.status} size="sm" />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Link to={`/orders/${order.id}/journey`} className="btn btn-sm btn-outline" title="View Journey">
                        <Route size={14} />
                      </Link>
                      <Link to={`/orders/${order.id}`} className="btn btn-sm btn-outline" title="Edit Order">
                        <Eye size={14} />
                      </Link>
                      {getNextStatus(order.status) && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: getNextStatus(order.status)! })}
                          disabled={updateStatusMutation.isPending}
                          title={`Move to ${statusDescriptions[getNextStatus(order.status)!]?.label}`}
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
        ) : (
          <div style={{ padding: '2rem' }}>
            <EmptyState 
              title="No orders found"
              message="Create your first order to get started"
              icon="package"
            />
          </div>
        )}
      </div>
    </div>
  );
}
