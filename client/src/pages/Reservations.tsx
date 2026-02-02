import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useToast } from '../components/ui/Toast';
import { parseApiError } from '../components/ui/FormErrors';
import {
  CalendarCheck,
  Plus,
  Check,
  X,
  ShoppingCart,
  Clock,
  AlertCircle,
  Calendar,
  Building2,
  Package,
  Copy,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  TENTATIVE: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'default',
  CONVERTED: 'primary',
  EXPIRED: 'default',
};

export default function Reservations() {
  const toast = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [createForm, setCreateForm] = useState({
    customerId: '',
    productId: '',
    windowId: '',
    requestedDate: new Date().toISOString().split('T')[0],
    requestedActivity: '',
    numberOfDoses: '1',
    notes: '',
  });
  const queryClient = useQueryClient();

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['reservations', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const { data } = await api.get(`/reservations?${params.toString()}`);
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

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data;
    },
  });

  const { data: windows } = useQuery({
    queryKey: ['availability-windows'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.get(`/availability/windows?startDate=${today}&isActive=true`);
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/reservations', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['availability-windows'] });
      setShowCreateModal(false);
      resetForm();
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.put(`/reservations/${id}/confirm`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.put(`/reservations/${id}/cancel`, { reason: 'Cancelled by user' });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['availability-windows'] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/reservations/${id}/convert`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order Created', `Order ${data.order?.orderNumber || ''} created successfully from reservation.`);
    },
    onError: (error: any) => {
      const apiError = parseApiError(error);
      toast.error('Conversion Failed', apiError?.userMessage || 'Failed to convert reservation to order.');
    },
  });

  const resetForm = () => {
    setCreateForm({
      customerId: '',
      productId: '',
      windowId: '',
      requestedDate: new Date().toISOString().split('T')[0],
      requestedActivity: '',
      numberOfDoses: '1',
      notes: '',
    });
  };

  const handleCopyReservation = (reservation: any) => {
    setCreateForm({
      customerId: reservation.customerId || '',
      productId: reservation.productId || '',
      windowId: '',
      requestedDate: new Date().toISOString().split('T')[0],
      requestedActivity: reservation.requestedActivity?.toString() || '',
      numberOfDoses: reservation.numberOfDoses?.toString() || '1',
      notes: reservation.notes || '',
    });
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!createForm.customerId || !createForm.productId || !createForm.requestedActivity) return;
    
    await createMutation.mutateAsync({
      ...createForm,
      requestedActivity: parseFloat(createForm.requestedActivity),
      numberOfDoses: parseInt(createForm.numberOfDoses) || 1,
      windowId: createForm.windowId || undefined,
    });
  };

  const getSelectedWindow = () => {
    if (!createForm.windowId || !windows) return null;
    return windows.find((w: any) => w.id === createForm.windowId);
  };

  const selectedWindow = getSelectedWindow();
  const availableMinutes = selectedWindow ? selectedWindow.capacityMinutes - selectedWindow.usedMinutes : 0;
  const utilizationPercent = selectedWindow ? Math.round((selectedWindow.usedMinutes / selectedWindow.capacityMinutes) * 100) : 0;

  const stats = {
    total: reservations?.length || 0,
    tentative: reservations?.filter((r: any) => r.status === 'TENTATIVE').length || 0,
    confirmed: reservations?.filter((r: any) => r.status === 'CONFIRMED').length || 0,
    converted: reservations?.filter((r: any) => r.status === 'CONVERTED').length || 0,
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Reservations</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Manage capacity reservations to prevent overbooking
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> New Reservation
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card stat-card">
          <div className="stat-label">Total Reservations</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Tentative</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.tentative}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Confirmed</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.confirmed}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Converted to Orders</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{stats.converted}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ fontWeight: 500 }}>Status:</label>
            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="TENTATIVE">Tentative</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="CONVERTED">Converted</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Reservation #</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Date</th>
              <th>Activity</th>
              <th>Doses</th>
              <th>Est. Time</th>
              <th>Window</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reservations?.map((reservation: any) => (
              <tr key={reservation.id}>
                <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{reservation.reservationNumber}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
                    {reservation.customer?.name}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Package size={14} style={{ color: 'var(--text-muted)' }} />
                    {reservation.product?.name}
                  </div>
                </td>
                <td>{new Date(reservation.requestedDate).toLocaleDateString()}</td>
                <td>{reservation.requestedActivity} mCi</td>
                <td>{reservation.numberOfDoses}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                    {reservation.estimatedMinutes} min
                  </div>
                </td>
                <td>
                  {reservation.window ? (
                    <span style={{ fontSize: '0.8125rem' }}>
                      {reservation.window.name || new Date(reservation.window.date).toLocaleDateString()}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                  )}
                </td>
                <td>
                  <span className={`badge badge-${statusColors[reservation.status] || 'default'}`}>
                    {reservation.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleCopyReservation(reservation)}
                      title="Copy as New"
                    >
                      <Copy size={14} />
                    </button>
                    {reservation.status === 'TENTATIVE' && (
                      <>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => confirmMutation.mutate(reservation.id)}
                          disabled={confirmMutation.isPending}
                          title="Confirm"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => cancelMutation.mutate(reservation.id)}
                          disabled={cancelMutation.isPending}
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                    {reservation.status === 'CONFIRMED' && (
                      <>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => convertMutation.mutate(reservation.id)}
                          disabled={convertMutation.isPending}
                          title="Convert to Order"
                        >
                          <ShoppingCart size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => cancelMutation.mutate(reservation.id)}
                          disabled={cancelMutation.isPending}
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {reservations?.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                  No reservations found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>New Reservation</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Reserve capacity in a delivery window to prevent overbooking
              </p>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Customer *</label>
                  <select
                    className="form-select"
                    value={createForm.customerId}
                    onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value })}
                  >
                    <option value="">Select customer</option>
                    {customers?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Product *</label>
                  <select
                    className="form-select"
                    value={createForm.productId}
                    onChange={(e) => setCreateForm({ ...createForm, productId: e.target.value })}
                  >
                    <option value="">Select product</option>
                    {products?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Window</label>
                <select
                  className="form-select"
                  value={createForm.windowId}
                  onChange={(e) => setCreateForm({ ...createForm, windowId: e.target.value })}
                >
                  <option value="">No specific window</option>
                  {windows?.map((w: any) => {
                    const avail = w.capacityMinutes - w.usedMinutes;
                    const util = Math.round((w.usedMinutes / w.capacityMinutes) * 100);
                    return (
                      <option key={w.id} value={w.id}>
                        {new Date(w.date).toLocaleDateString()} {w.startTime}-{w.endTime} ({avail} min available, {util}% used)
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedWindow && (
                <div style={{
                  padding: '0.75rem 1rem',
                  background: utilizationPercent > 80 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                  borderRadius: 'var(--radius)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}>
                  {utilizationPercent > 80 ? (
                    <AlertCircle size={18} style={{ color: 'var(--danger)' }} />
                  ) : (
                    <Calendar size={18} style={{ color: 'var(--success)' }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                      {availableMinutes} minutes available
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {utilizationPercent}% capacity used
                    </div>
                  </div>
                </div>
              )}

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Requested Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={createForm.requestedDate}
                    onChange={(e) => setCreateForm({ ...createForm, requestedDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Activity (mCi) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={createForm.requestedActivity}
                    onChange={(e) => setCreateForm({ ...createForm, requestedActivity: e.target.value })}
                    step="0.1"
                    placeholder="e.g., 15"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">No. of Doses</label>
                  <input
                    type="number"
                    className="form-input"
                    value={createForm.numberOfDoses}
                    onChange={(e) => setCreateForm({ ...createForm, numberOfDoses: e.target.value })}
                    min="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional notes about this reservation"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={createMutation.isPending || !createForm.customerId || !createForm.productId || !createForm.requestedActivity}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Reservation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
