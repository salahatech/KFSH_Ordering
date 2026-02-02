import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { Truck, Package, Clock, MapPin, Phone, ArrowRight, CheckCircle, Search } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { parseApiError } from '../../components/ui/FormErrors';
import { StatusBadge, EmptyState } from '../../components/shared';

export default function DriverShipments() {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: shipments, isLoading } = useQuery({
    queryKey: ['driver-shipments', filters],
    queryFn: async () => {
      const { data } = await api.get('/driver/shipments', { params: filters });
      return data;
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/driver/shipments/${id}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-shipments'] });
      toast.success('Accepted', 'Shipment accepted successfully');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Failed', apiError?.userMessage || 'Failed to accept shipment');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>My Shipments</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            View and manage your assigned deliveries
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search shipment..."
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <select
            className="form-select"
            style={{ width: '180px' }}
            value={filters.status || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="">All Statuses</option>
            <option value="ASSIGNED_TO_DRIVER">Awaiting Accept</option>
            <option value="ACCEPTED_BY_DRIVER">Accepted</option>
            <option value="PICKED_UP">Picked Up</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="ARRIVED">Arrived</option>
            <option value="DELIVERED">Delivered</option>
            <option value="DELIVERY_FAILED">Failed</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
            Shipments ({shipments?.length || 0})
          </h3>
        </div>
        
        {shipments?.length > 0 ? (
          <div style={{ padding: '1rem' }}>
            {shipments.map((shipment: any) => (
              <div key={shipment.id} style={{ 
                padding: '1rem', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius)',
                marginBottom: '0.75rem',
                border: shipment.status === 'ASSIGNED_TO_DRIVER' ? '2px solid var(--warning)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{shipment.shipmentNumber}</span>
                      <StatusBadge status={shipment.status} size="sm" />
                      {shipment.priority === 'URGENT' && (
                        <span className="badge badge-danger">Urgent</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {shipment.customer?.nameEn || shipment.customer?.name}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {shipment.orders?.length || 0} orders
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
                    <MapPin size={14} />
                    {shipment.deliveryAddress || shipment.customer?.address || 'N/A'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  {shipment.scheduledDeliveryAt && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} />
                      Deliver by {format(new Date(shipment.scheduledDeliveryAt), 'MMM dd, HH:mm')}
                    </span>
                  )}
                  {shipment.customer?.city && (
                    <span>{shipment.customer.city}</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  {shipment.customer?.mobile && (
                    <a href={`tel:${shipment.customer.mobile}`} className="btn btn-sm btn-outline">
                      <Phone size={14} />
                      Call
                    </a>
                  )}
                  {shipment.status === 'ASSIGNED_TO_DRIVER' && (
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => acceptMutation.mutate(shipment.id)}
                      disabled={acceptMutation.isPending}
                    >
                      <CheckCircle size={14} />
                      Accept
                    </button>
                  )}
                  <Link to={`/driver/shipments/${shipment.id}`} className="btn btn-sm btn-primary">
                    Open
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '2rem' }}>
            <EmptyState 
              title="No shipments found"
              message="You have no assigned shipments at this time"
              icon="truck"
            />
          </div>
        )}
      </div>
    </div>
  );
}
