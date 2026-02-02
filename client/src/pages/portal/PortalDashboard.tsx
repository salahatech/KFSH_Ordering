import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { ShoppingCart, Package, Clock, CheckCircle, Plus, Receipt, TrendingUp, AlertCircle } from 'lucide-react';

export default function PortalDashboard() {
  const { user } = useAuthStore();

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['portal-orders'],
    queryFn: async () => {
      const { data } = await api.get('/orders', { params: { limit: 5 } });
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

  const stats = {
    totalOrders: orders?.length || 0,
    activeOrders: orders?.filter((o: any) => !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status)).length || 0,
    deliveredOrders: orders?.filter((o: any) => o.status === 'DELIVERED').length || 0,
    pendingInvoices: invoices?.filter((i: any) => ['SENT', 'PARTIALLY_PAID'].includes(i.status)).length || 0,
  };

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

  if (ordersLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Welcome back, {user?.firstName}!
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Manage your radiopharmaceutical orders and track deliveries
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px', 
              backgroundColor: 'rgba(13, 148, 136, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShoppingCart size={24} style={{ color: '#0d9488' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>{stats.totalOrders}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Orders</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px', 
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={24} style={{ color: 'var(--warning)' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>{stats.activeOrders}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>In Progress</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px', 
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle size={24} style={{ color: 'var(--success)' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>{stats.deliveredOrders}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Delivered</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px', 
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Receipt size={24} style={{ color: 'var(--danger)' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>{stats.pendingInvoices}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Pending Invoices</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <Link 
          to="/portal/orders/new" 
          className="btn btn-primary"
          style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.875rem 1.5rem',
            fontSize: '1rem'
          }}
        >
          <Plus size={20} /> Place New Order
        </Link>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600 }}>Recent Orders</h3>
            <Link to="/portal/orders" style={{ color: 'var(--primary)', fontSize: '0.875rem' }}>
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
                <tr key={order.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{order.orderNumber}</td>
                  <td>{order.product?.name}</td>
                  <td style={{ fontSize: '0.875rem' }}>
                    {format(new Date(order.deliveryDate), 'MMM d')}
                  </td>
                  <td>
                    <span className={`badge badge-${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
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

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600 }}>Recent Invoices</h3>
            <Link to="/portal/invoices" style={{ color: 'var(--primary)', fontSize: '0.875rem' }}>
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
                    <span className={`badge badge-${invoice.status === 'PAID' ? 'success' : invoice.status === 'OVERDUE' ? 'danger' : 'warning'}`}>
                      {invoice.status}
                    </span>
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
