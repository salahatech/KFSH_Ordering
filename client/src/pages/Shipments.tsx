import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { format } from 'date-fns';
import { Truck, Package, Send, CheckCircle, Plus, Clock, AlertTriangle, Eye, UserPlus, MoreVertical, Calendar, X, MapPin, Phone, Printer } from 'lucide-react';
import { useLocalization } from '../hooks/useLocalization';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';
import { KpiCard, StatusBadge, FilterBar, EmptyState, type FilterWidget } from '../components/shared';
import { ShipmentLabel } from '../components/PrintableLabel';

export default function Shipments() {
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [labelShipment, setLabelShipment] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { formatDateOnly, formatTimeOnly, formatDateTime } = useLocalization();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  const { data: shipments, isLoading } = useQuery({
    queryKey: ['shipments', filters],
    queryFn: async () => {
      const { data } = await api.get('/shipments', { params: filters });
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

  const { data: drivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data } = await api.get('/drivers');
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
      setActiveDropdown(null);
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

  const assignDriverMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return api.post(`/shipments/${id}/assign-driver`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setShowAssignModal(false);
      setSelectedShipment(null);
      toast.success('Driver Assigned', 'Driver has been assigned to the shipment');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Assignment Failed', apiError?.userMessage || 'Failed to assign driver');
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return api.post(`/shipments/${id}/schedule`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setShowScheduleModal(false);
      setSelectedShipment(null);
      toast.success('Scheduled', 'Shipment schedule updated');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Schedule Failed', apiError?.userMessage || 'Failed to update schedule');
    },
  });

  const markPackedMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/shipments/${id}/mark-packed`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setActiveDropdown(null);
      toast.success('Packed', 'Shipment marked as packed');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Failed', apiError?.userMessage || 'Failed to mark as packed');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return api.post(`/shipments/${id}/cancel`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setActiveDropdown(null);
      toast.success('Cancelled', 'Shipment has been cancelled');
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Cancel Failed', apiError?.userMessage || 'Failed to cancel shipment');
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

  const handleAssignDriver = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    assignDriverMutation.mutate({
      id: selectedShipment.id,
      data: {
        driverId: formData.get('driverId'),
        scheduledPickupAt: formData.get('scheduledPickupAt'),
        scheduledDeliveryAt: formData.get('scheduledDeliveryAt'),
        driverNotes: formData.get('driverNotes'),
        priority: formData.get('priority'),
      },
    });
  };

  const handleSchedule = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    scheduleMutation.mutate({
      id: selectedShipment.id,
      data: {
        scheduledPickupAt: formData.get('scheduledPickupAt'),
        scheduledDeliveryAt: formData.get('scheduledDeliveryAt'),
        priority: formData.get('priority'),
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
        { value: 'PACKED', label: 'Packed' },
        { value: 'ASSIGNED_TO_DRIVER', label: 'Assigned' },
        { value: 'ACCEPTED_BY_DRIVER', label: 'Accepted' },
        { value: 'PICKED_UP', label: 'Picked Up' },
        { value: 'IN_TRANSIT', label: 'In Transit' },
        { value: 'ARRIVED', label: 'Arrived' },
        { value: 'DELIVERED', label: 'Delivered' },
        { value: 'DELIVERY_FAILED', label: 'Failed' },
        { value: 'DELAYED', label: 'Delayed' },
      ]
    },
    {
      key: 'unassigned',
      label: 'Unassigned Only',
      type: 'select',
      options: [
        { value: '', label: 'All' },
        { value: 'true', label: 'Unassigned' },
      ]
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      options: [
        { value: '', label: 'All Priorities' },
        { value: 'NORMAL', label: 'Normal' },
        { value: 'URGENT', label: 'Urgent' },
      ]
    },
  ];

  const stats = {
    total: shipments?.length || 0,
    packed: shipments?.filter((s: any) => s.status === 'PACKED').length || 0,
    assigned: shipments?.filter((s: any) => ['ASSIGNED_TO_DRIVER', 'ACCEPTED_BY_DRIVER'].includes(s.status)).length || 0,
    inTransit: shipments?.filter((s: any) => ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(s.status)).length || 0,
    delivered: shipments?.filter((s: any) => s.status === 'DELIVERED').length || 0,
    issues: shipments?.filter((s: any) => ['DELAYED', 'DELIVERY_FAILED'].includes(s.status)).length || 0,
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'default',
      READY_TO_PACK: 'default',
      PACKED: 'warning',
      ASSIGNED_TO_DRIVER: 'info',
      ACCEPTED_BY_DRIVER: 'info',
      PICKED_UP: 'info',
      IN_TRANSIT: 'primary',
      ARRIVED: 'primary',
      DELIVERED: 'success',
      DELIVERY_FAILED: 'danger',
      RETURNED: 'danger',
      CANCELLED: 'default',
      DELAYED: 'warning',
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Logistics & Shipments</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Manage deliveries, assign drivers, and track shipment status
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/drivers" className="btn btn-secondary">
            <UserPlus size={16} />
            Manage Drivers
          </Link>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            Create Shipment
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Total" 
          value={stats.total} 
          icon={<Truck size={20} />}
          color="primary"
          onClick={() => setFilters({})}
          selected={!filters.status && !filters.unassigned}
        />
        <KpiCard 
          title="Packed" 
          value={stats.packed} 
          icon={<Package size={20} />}
          color="warning"
          onClick={() => setFilters({ status: 'PACKED' })}
          selected={filters.status === 'PACKED'}
        />
        <KpiCard 
          title="Assigned" 
          value={stats.assigned} 
          icon={<UserPlus size={20} />}
          color="info"
          onClick={() => setFilters({ status: 'ASSIGNED_TO_DRIVER' })}
          selected={filters.status === 'ASSIGNED_TO_DRIVER'}
        />
        <KpiCard 
          title="In Transit" 
          value={stats.inTransit} 
          icon={<Send size={20} />}
          color="primary"
          onClick={() => setFilters({ status: 'IN_TRANSIT' })}
          selected={filters.status === 'IN_TRANSIT'}
        />
        <KpiCard 
          title="Delivered" 
          value={stats.delivered} 
          icon={<CheckCircle size={20} />}
          color="success"
          onClick={() => setFilters({ status: 'DELIVERED' })}
          selected={filters.status === 'DELIVERED'}
        />
        <KpiCard 
          title="Issues" 
          value={stats.issues} 
          icon={<AlertTriangle size={20} />}
          color="danger"
          onClick={() => setFilters({ status: 'DELAYED' })}
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
            Shipment List ({shipments?.length || 0})
          </h3>
        </div>
        {shipments?.length > 0 ? (
          <table className="table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>Shipment #</th>
                <th>Customer</th>
                <th>Driver</th>
                <th>Orders</th>
                <th>Scheduled</th>
                <th>Priority</th>
                <th>Status</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment: any) => (
                <tr key={shipment.id}>
                  <td>
                    <Link to={`/shipments/${shipment.id}`} style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--primary)' }}>
                      {shipment.shipmentNumber}
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{shipment.customer?.nameEn || shipment.customer?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {shipment.customer?.city}
                    </div>
                  </td>
                  <td>
                    {shipment.driver ? (
                      <div>
                        <div style={{ fontWeight: 500 }}>{shipment.driver.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {shipment.driver.vehiclePlateNo}
                        </div>
                      </div>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-default">{shipment.orders?.length || 0} orders</span>
                  </td>
                  <td>
                    {shipment.scheduledDeliveryAt ? (
                      <div>
                        <div>{formatDateOnly(shipment.scheduledDeliveryAt)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatTimeOnly(shipment.scheduledDeliveryAt)}
                        </div>
                      </div>
                    ) : shipment.scheduledDepartureTime ? (
                      <div>
                        <div>{formatDateTime(shipment.scheduledDepartureTime)}</div>
                        {shipment.expectedArrivalTime && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ETA: {formatTimeOnly(shipment.expectedArrivalTime)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Not scheduled</span>
                    )}
                  </td>
                  <td>
                    {shipment.priority === 'URGENT' ? (
                      <span className="badge badge-danger">Urgent</span>
                    ) : (
                      <span className="badge badge-default">Normal</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={shipment.status} size="sm" />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', position: 'relative' }}>
                      <button
                        className="btn btn-sm btn-outline"
                        title="Print Label"
                        onClick={() => setLabelShipment(shipment)}
                      >
                        <Printer size={14} />
                      </button>
                      <Link to={`/shipments/${shipment.id}`} className="btn btn-sm btn-outline" title="View Details">
                        <Eye size={14} />
                      </Link>
                      <div style={{ position: 'relative' }} ref={activeDropdown === shipment.id ? dropdownRef : null}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === shipment.id ? null : shipment.id);
                          }}
                        >
                          <MoreVertical size={14} />
                        </button>
                        {activeDropdown === shipment.id && (
                          <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                            {['DRAFT', 'READY_TO_PACK', 'PACKED', 'ASSIGNED_TO_DRIVER', 'DELIVERY_FAILED'].includes(shipment.status) && (
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  setSelectedShipment(shipment);
                                  setShowAssignModal(true);
                                  setActiveDropdown(null);
                                }}
                              >
                                <UserPlus size={14} />
                                {shipment.driver ? 'Reassign Driver' : 'Assign Driver'}
                              </button>
                            )}
                            <button
                              className="dropdown-item"
                              onClick={() => {
                                setSelectedShipment(shipment);
                                setShowScheduleModal(true);
                                setActiveDropdown(null);
                              }}
                            >
                              <Calendar size={14} />
                              Schedule
                            </button>
                            {['DRAFT', 'READY_TO_PACK'].includes(shipment.status) && (
                              <button
                                className="dropdown-item"
                                onClick={() => markPackedMutation.mutate(shipment.id)}
                              >
                                <Package size={14} />
                                Mark Packed
                              </button>
                            )}
                            {shipment.status === 'PACKED' && shipment.driver && (
                              <button
                                className="dropdown-item"
                                onClick={() => dispatchMutation.mutate({ id: shipment.id, data: {} })}
                              >
                                <Send size={14} />
                                Dispatch
                              </button>
                            )}
                            {['ARRIVED', 'IN_TRANSIT'].includes(shipment.status) && (
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  setSelectedShipment(shipment);
                                  setShowDeliveryModal(true);
                                  setActiveDropdown(null);
                                }}
                              >
                                <CheckCircle size={14} />
                                Mark Delivered
                              </button>
                            )}
                            {!['DELIVERED', 'CANCELLED'].includes(shipment.status) && (
                              <>
                                <div className="dropdown-divider" />
                                <button
                                  className="dropdown-item danger"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to cancel this shipment?')) {
                                      cancelMutation.mutate({ id: shipment.id, reason: 'Cancelled by user' });
                                    }
                                  }}
                                >
                                  <X size={14} />
                                  Cancel Shipment
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
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

      {activeDropdown && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 999 }}
          onClick={() => setActiveDropdown(null)}
        />
      )}

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
                        {customer.nameEn || customer.name} - {customer.city}
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

      {showAssignModal && selectedShipment && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Assign Driver</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowAssignModal(false); setSelectedShipment(null); }}>×</button>
            </div>
            <form onSubmit={handleAssignDriver}>
              <div className="modal-body">
                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 500 }}>{selectedShipment.shipmentNumber}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {selectedShipment.customer?.nameEn || selectedShipment.customer?.name} • {selectedShipment.orders?.length || 0} orders
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Driver *</label>
                  <select name="driverId" className="form-select" required>
                    <option value="">Select Driver</option>
                    {drivers?.filter((d: any) => d.status === 'ACTIVE').map((driver: any) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.fullName} - {driver.vehicleType} ({driver.vehiclePlateNo}) 
                        {driver.inTransit > 0 && ` • ${driver.inTransit} in transit`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Pickup Time</label>
                    <input type="datetime-local" name="scheduledPickupAt" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Delivery Time</label>
                    <input type="datetime-local" name="scheduledDeliveryAt" className="form-input" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select name="priority" className="form-select" defaultValue={selectedShipment.priority || 'NORMAL'}>
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes for Driver</label>
                  <textarea name="driverNotes" className="form-textarea" rows={2} placeholder="Special instructions for the driver..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAssignModal(false); setSelectedShipment(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={assignDriverMutation.isPending}>
                  {assignDriverMutation.isPending ? 'Assigning...' : 'Assign Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScheduleModal && selectedShipment && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Schedule Shipment</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowScheduleModal(false); setSelectedShipment(null); }}>×</button>
            </div>
            <form onSubmit={handleSchedule}>
              <div className="modal-body">
                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 500 }}>{selectedShipment.shipmentNumber}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {selectedShipment.customer?.nameEn || selectedShipment.customer?.name}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Pickup Time</label>
                    <input 
                      type="datetime-local" 
                      name="scheduledPickupAt" 
                      className="form-input" 
                      defaultValue={selectedShipment.scheduledPickupAt ? format(new Date(selectedShipment.scheduledPickupAt), "yyyy-MM-dd'T'HH:mm") : ''}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Delivery Time</label>
                    <input 
                      type="datetime-local" 
                      name="scheduledDeliveryAt" 
                      className="form-input" 
                      defaultValue={selectedShipment.scheduledDeliveryAt ? format(new Date(selectedShipment.scheduledDeliveryAt), "yyyy-MM-dd'T'HH:mm") : ''}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select name="priority" className="form-select" defaultValue={selectedShipment.priority || 'NORMAL'}>
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowScheduleModal(false); setSelectedShipment(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={scheduleMutation.isPending}>
                  {scheduleMutation.isPending ? 'Saving...' : 'Save Schedule'}
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
                    {selectedShipment.customer?.nameEn || selectedShipment.customer?.name} • {selectedShipment.orders?.length || 0} orders
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

      {labelShipment && (
        <div className="modal-overlay" onClick={() => setLabelShipment(null)}>
          <div className="modal" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>Print Shipment Label</h3>
              <button onClick={() => setLabelShipment(null)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', justifyContent: 'center' }}>
              <ShipmentLabel shipment={labelShipment} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
