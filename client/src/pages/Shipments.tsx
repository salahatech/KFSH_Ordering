import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { Truck, Package, Send, CheckCircle, Plus, Clock, AlertTriangle, Eye } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';
import { KpiCard, StatusBadge, FilterBar, EmptyState, type FilterWidget } from '../components/shared';

export default function Shipments() {
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: shipments, isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: async () => {
      const { data } = await api.get('/shipments');
      return data;
    },
  });

  const { data: releasedOrders } = useQuery({
    queryKey: ['released-orders'],
    queryFn: async () => {
      const { data } = await api.get('/orders', { params: { status: 'RELEASED' } });
      return data;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await api.get('/customers');
      return data;
    },
  });

  const createShipmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/shipments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['released-orders'] });
      setShowCreateModal(false);
      toast.success('Shipment Created', 'New shipment has been created successfully');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Creation Failed', apiError?.userMessage || 'Failed to create shipment');
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return api.post(`/shipments/${id}/dispatch`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Dispatched', 'Shipment is now in transit');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Dispatch Failed', apiError?.userMessage || 'Failed to dispatch shipment');
    },
  });

  const deliverMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return api.post(`/shipments/${id}/deliver`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setShowDeliveryModal(false);
      setSelectedShipment(null);
      toast.success('Delivered', 'Shipment marked as delivered');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Delivery Failed', apiError?.userMessage || 'Failed to confirm delivery');
    },
  });

  const handleCreateShipment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const selectedOrderIds = Array.from(formData.getAll('orderIds'));
    createShipmentMutation.mutate({
      customerId: formData.get('customerId'),
      courierName: formData.get('courierName'),
      vehicleInfo: formData.get('vehicleInfo'),
      scheduledDepartureTime: formData.get('scheduledDepartureTime'),
      expectedArrivalTime: formData.get('expectedArrivalTime'),
      orderIds: selectedOrderIds,
    });
  };

  const handleDelivery = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    deliverMutation.mutate({
      id: selectedShipment.id,
      data: {
        receiverName: formData.get('receiverName'),
        notes: formData.get('notes'),
      },
    });
  };

  const filterWidgets: FilterWidget[] = [
    { key: 'search', label: 'Search', type: 'search', placeholder: 'Search shipments...' },
    { 
      key: 'status', 
      label: 'Status', 
      type: 'select', 
      options: [
        { value: '', label: 'All Statuses' },
        { value: 'CREATED', label: 'Created' },
        { value: 'IN_TRANSIT', label: 'In Transit' },
        { value: 'DELIVERED', label: 'Delivered' },
        { value: 'DELAYED', label: 'Delayed' },
      ]
    },
  ];

  const filteredShipments = shipments?.filter((shipment: any) => {
    if (filters.status && shipment.status !== filters.status) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!shipment.shipmentNumber?.toLowerCase().includes(q) &&
          !shipment.customer?.name?.toLowerCase().includes(q) &&
          !shipment.courierName?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const stats = {
    total: shipments?.length || 0,
    created: shipments?.filter((s: any) => s.status === 'CREATED').length || 0,
    inTransit: shipments?.filter((s: any) => s.status === 'IN_TRANSIT').length || 0,
    delivered: shipments?.filter((s: any) => s.status === 'DELIVERED').length || 0,
    delayed: shipments?.filter((s: any) => s.status === 'DELAYED').length || 0,
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Logistics & Shipments</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Manage deliveries and track shipment status
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          Create Shipment
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total Shipments" 
          value={stats.total} 
          icon={<Truck size={20} />}
          color="primary"
          onClick={() => setFilters({})}
          selected={!filters.status}
        />
        <KpiCard 
          title="Pending" 
          value={stats.created} 
          icon={<Clock size={20} />}
          color="warning"
          onClick={() => setFilters(prev => ({ ...prev, status: 'CREATED' }))}
          selected={filters.status === 'CREATED'}
        />
        <KpiCard 
          title="In Transit" 
          value={stats.inTransit} 
          icon={<Send size={20} />}
          color="info"
          onClick={() => setFilters(prev => ({ ...prev, status: 'IN_TRANSIT' }))}
          selected={filters.status === 'IN_TRANSIT'}
        />
        <KpiCard 
          title="Delivered" 
          value={stats.delivered} 
          icon={<CheckCircle size={20} />}
          color="success"
          onClick={() => setFilters(prev => ({ ...prev, status: 'DELIVERED' }))}
          selected={filters.status === 'DELIVERED'}
        />
        <KpiCard 
          title="Delayed" 
          value={stats.delayed} 
          icon={<AlertTriangle size={20} />}
          color="danger"
          onClick={() => setFilters(prev => ({ ...prev, status: 'DELAYED' }))}
          selected={filters.status === 'DELAYED'}
        />
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <FilterBar 
          widgets={filterWidgets}
          values={filters}
          onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
          onReset={() => setFilters({})}
        />
      </div>

      <div className="card">
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
            Shipment List ({filteredShipments?.length || 0})
          </h3>
        </div>
        {filteredShipments?.length > 0 ? (
          <table className="table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>Shipment #</th>
                <th>Customer</th>
                <th>Orders</th>
                <th>Courier</th>
                <th>Scheduled</th>
                <th>Status</th>
                <th style={{ width: '180px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.map((shipment: any) => (
                <tr key={shipment.id}>
                  <td style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.8125rem' }}>{shipment.shipmentNumber}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{shipment.customer?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {shipment.customer?.city}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-default">{shipment.orders?.length || 0} orders</span>
                  </td>
                  <td>
                    <div>{shipment.courierName || 'Not assigned'}</div>
                    {shipment.vehicleInfo && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {shipment.vehicleInfo}
                      </div>
                    )}
                  </td>
                  <td>
                    {shipment.scheduledDepartureTime && (
                      <div>{format(new Date(shipment.scheduledDepartureTime), 'MMM dd, HH:mm')}</div>
                    )}
                    {shipment.expectedArrivalTime && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ETA: {format(new Date(shipment.expectedArrivalTime), 'HH:mm')}
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={shipment.status} size="sm" />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-outline" title="View Details">
                        <Eye size={14} />
                      </button>
                      {shipment.status === 'CREATED' && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ minWidth: '90px' }}
                          onClick={() => dispatchMutation.mutate({ id: shipment.id, data: {} })}
                          disabled={dispatchMutation.isPending}
                        >
                          <Send size={14} />
                          Dispatch
                        </button>
                      )}
                      {shipment.status === 'IN_TRANSIT' && (
                        <button
                          className="btn btn-success btn-sm"
                          style={{ minWidth: '110px' }}
                          onClick={() => {
                            setSelectedShipment(shipment);
                            setShowDeliveryModal(true);
                          }}
                        >
                          <CheckCircle size={14} />
                          Deliver
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
              title="No shipments found"
              message="Create a shipment to start delivering orders"
              icon="package"
            />
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Create Shipment</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateShipment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Customer *</label>
                  <select name="customerId" className="form-select" required>
                    <option value="">Select Customer</option>
                    {customers?.map((customer: any) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.city}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Orders to Ship</label>
                  <div style={{ maxHeight: '150px', overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.5rem' }}>
                    {releasedOrders?.map((order: any) => (
                      <label key={order.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
                        <input type="checkbox" name="orderIds" value={order.id} />
                        <span>{order.orderNumber} - {order.product?.name}</span>
                      </label>
                    ))}
                    {(!releasedOrders || releasedOrders.length === 0) && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No released orders available</div>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Courier Name</label>
                    <input type="text" name="courierName" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Info</label>
                    <input type="text" name="vehicleInfo" className="form-input" placeholder="e.g., Van ABC-123" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Departure Time</label>
                    <input type="datetime-local" name="scheduledDepartureTime" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expected Arrival</label>
                    <input type="datetime-local" name="expectedArrivalTime" className="form-input" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createShipmentMutation.isPending}>
                  {createShipmentMutation.isPending ? 'Creating...' : 'Create Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeliveryModal && selectedShipment && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Confirm Delivery</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowDeliveryModal(false); setSelectedShipment(null); }}>×</button>
            </div>
            <form onSubmit={handleDelivery}>
              <div className="modal-body">
                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 500 }}>{selectedShipment.shipmentNumber}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {selectedShipment.customer?.name} • {selectedShipment.orders?.length || 0} orders
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Receiver Name *</label>
                  <input type="text" name="receiverName" className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Delivery Notes</label>
                  <textarea name="notes" className="form-textarea" rows={3} placeholder="Any notes about the delivery..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowDeliveryModal(false); setSelectedShipment(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" disabled={deliverMutation.isPending}>
                  <CheckCircle size={16} />
                  {deliverMutation.isPending ? 'Confirming...' : 'Confirm Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
