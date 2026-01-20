import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { Truck, Package, Send, CheckCircle, Plus } from 'lucide-react';

export default function Shipments() {
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const queryClient = useQueryClient();

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
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return api.post(`/shipments/${id}/dispatch`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
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

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      CREATED: 'default',
      ASSIGNED: 'info',
      IN_TRANSIT: 'warning',
      DELIVERED: 'success',
      DELAYED: 'danger',
      RETURNED: 'danger',
      CANCELLED: 'danger',
    };
    return colors[status] || 'default';
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Logistics & Shipments</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} />
          Create Shipment
        </button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Shipment #</th>
              <th>Customer</th>
              <th>Orders</th>
              <th>Courier</th>
              <th>Scheduled</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shipments?.map((shipment: any) => (
              <tr key={shipment.id}>
                <td style={{ fontWeight: 500 }}>{shipment.shipmentNumber}</td>
                <td>
                  <div>{shipment.customer?.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {shipment.customer?.city}
                  </div>
                </td>
                <td>{shipment.orders?.length || 0} orders</td>
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
                  <span className={`badge badge-${getStatusColor(shipment.status)}`}>
                    {shipment.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {shipment.status === 'CREATED' && (
                      <button
                        className="btn btn-primary btn-sm"
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
                        onClick={() => {
                          setSelectedShipment(shipment);
                          setShowDeliveryModal(true);
                        }}
                      >
                        <CheckCircle size={14} />
                        Confirm Delivery
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shipments?.length === 0 && <div className="empty-state">No shipments found</div>}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" style={{ maxWidth: '40rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600 }}>Create Shipment</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem' }}>&times;</button>
            </div>
            <form onSubmit={handleCreateShipment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Customer</label>
                  <select name="customerId" className="form-select" required>
                    <option value="">Select Customer</option>
                    {customers?.map((customer: any) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Released Orders</label>
                  <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.5rem' }}>
                    {releasedOrders?.map((order: any) => (
                      <label key={order.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem' }}>
                        <input type="checkbox" name="orderIds" value={order.id} />
                        {order.orderNumber} - {order.customer?.name} - {order.product?.name}
                      </label>
                    ))}
                    {releasedOrders?.length === 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No released orders available</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Courier Name</label>
                    <input name="courierName" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Info</label>
                    <input name="vehicleInfo" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Scheduled Departure</label>
                    <input name="scheduledDepartureTime" type="datetime-local" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expected Arrival</label>
                    <input name="expectedArrivalTime" type="datetime-local" className="form-input" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createShipmentMutation.isPending}>Create Shipment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeliveryModal && selectedShipment && (
        <div className="modal-overlay" onClick={() => setShowDeliveryModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600 }}>Confirm Delivery</h3>
              <button onClick={() => setShowDeliveryModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem' }}>&times;</button>
            </div>
            <form onSubmit={handleDelivery}>
              <div className="modal-body">
                <p style={{ marginBottom: '1rem' }}>
                  Confirming delivery for shipment <strong>{selectedShipment.shipmentNumber}</strong>
                </p>
                <div className="form-group">
                  <label className="form-label">Receiver Name *</label>
                  <input name="receiverName" className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea name="notes" className="form-input" rows={3} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeliveryModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={deliverMutation.isPending}>
                  <CheckCircle size={18} />
                  Confirm Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
