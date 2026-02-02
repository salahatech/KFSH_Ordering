import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { Plus, Eye, Package, Clock, CheckCircle, Truck, XCircle, MapPin } from 'lucide-react';

export default function PortalOrders() {
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['portal-orders', statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/orders', { params });
      return data;
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
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle size={16} style={{ color: 'var(--success)' }} />;
      case 'DISPATCHED':
        return <Truck size={16} style={{ color: 'var(--primary)' }} />;
      case 'CANCELLED':
      case 'REJECTED':
        return <XCircle size={16} style={{ color: 'var(--danger)' }} />;
      default:
        return <Clock size={16} style={{ color: 'var(--warning)' }} />;
    }
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>My Orders</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            View and track all your radiopharmaceutical orders
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
            <option value="RELEASED">Released</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="DELIVERED">Delivered</option>
          </select>
          <Link to="/portal/orders/new" className="btn btn-primary">
            <Plus size={18} /> Place Order
          </Link>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Product</th>
              <th>Activity</th>
              <th>Delivery Date</th>
              <th>Delivery Time</th>
              <th>Status</th>
              <th>Created</th>
              <th style={{ width: '80px' }}>Track</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((order: any) => (
              <tr key={order.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Package size={16} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{order.orderNumber}</span>
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{order.product?.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {order.product?.radionuclide}
                  </div>
                </td>
                <td style={{ fontWeight: 500 }}>
                  {order.requestedActivity} {order.activityUnit}
                </td>
                <td>{format(new Date(order.deliveryDate), 'MMM d, yyyy')}</td>
                <td>
                  {format(new Date(order.deliveryTimeStart), 'HH:mm')} - {format(new Date(order.deliveryTimeEnd), 'HH:mm')}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getStatusIcon(order.status)}
                    <span className={`badge badge-${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {format(new Date(order.createdAt), 'MMM d, yyyy')}
                </td>
                <td>
                  <Link 
                    to={`/portal/orders/${order.id}/journey`} 
                    className="btn btn-sm btn-outline"
                    title="Track Order"
                  >
                    <MapPin size={14} />
                  </Link>
                </td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                  <Package size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '1rem' }} />
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No orders found</p>
                  <Link to="/portal/orders/new" className="btn btn-primary">
                    <Plus size={16} /> Place Your First Order
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
