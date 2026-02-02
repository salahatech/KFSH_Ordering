import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { Plus, Syringe, Tag, Trash2, Eye, Package } from 'lucide-react';

export default function Dispensing() {
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    batchId: '',
    orderId: '',
    patientReference: '',
    requestedActivity: '',
    volume: '',
    containerType: '',
    notes: '',
  });
  const queryClient = useQueryClient();

  const { data: releasedBatches } = useQuery({
    queryKey: ['batches', 'RELEASED'],
    queryFn: async () => {
      const { data } = await api.get('/batches', { params: { status: 'RELEASED' } });
      return data;
    },
  });

  const { data: batchDispensing, isLoading } = useQuery({
    queryKey: ['dispensing', 'batch', selectedBatchId],
    queryFn: async () => {
      const { data } = await api.get(`/dispensing/batch/${selectedBatchId}`);
      return data;
    },
    enabled: !!selectedBatchId,
  });

  const { data: doseUnits } = useQuery({
    queryKey: ['dispensing'],
    queryFn: async () => {
      const { data } = await api.get('/dispensing');
      return data;
    },
  });

  const createDoseMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/dispensing', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispensing'] });
      setShowCreateModal(false);
      setCreateForm({
        batchId: '',
        orderId: '',
        patientReference: '',
        requestedActivity: '',
        volume: '',
        containerType: '',
        notes: '',
      });
    },
  });

  const dispenseMutation = useMutation({
    mutationFn: async ({ id, dispensedActivity }: { id: string; dispensedActivity?: number }) => {
      return api.put(`/dispensing/${id}/dispense`, { dispensedActivity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispensing'] });
    },
  });

  const labelMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.put(`/dispensing/${id}/label`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispensing'] });
    },
  });

  const wasteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return api.put(`/dispensing/${id}/waste`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispensing'] });
    },
  });

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      CREATED: 'default',
      LABELED: 'warning',
      DISPENSED: 'success',
      SHIPPED: 'success',
      DELIVERED: 'success',
      CANCELLED: 'danger',
      WASTED: 'danger',
    };
    return colors[status] || 'default';
  };

  const handleCreate = () => {
    if (!createForm.batchId || !createForm.requestedActivity) return;
    createDoseMutation.mutate({
      batchId: createForm.batchId,
      orderId: createForm.orderId || undefined,
      patientReference: createForm.patientReference || undefined,
      requestedActivity: parseFloat(createForm.requestedActivity),
      volume: createForm.volume ? parseFloat(createForm.volume) : undefined,
      containerType: createForm.containerType || undefined,
      notes: createForm.notes || undefined,
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Dose Dispensing</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Create Dose Unit
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Released Batches</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {releasedBatches?.map((batch: any) => (
              <button
                key={batch.id}
                className={`btn ${selectedBatchId === batch.id ? 'btn-primary' : 'btn-outline'}`}
                style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                onClick={() => setSelectedBatchId(batch.id)}
              >
                <Package size={16} />
                <span>{batch.batchNumber}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.7 }}>
                  {batch.product?.name}
                </span>
              </button>
            ))}
            {(!releasedBatches || releasedBatches.length === 0) && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No released batches available for dispensing
              </p>
            )}
          </div>
        </div>

        <div className="card">
          {selectedBatchId && batchDispensing ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontWeight: 600 }}>Batch: {batchDispensing.batch?.batchNumber}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {batchDispensing.batch?.product?.name}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)' }}>
                    {batchDispensing.remainingActivity?.toFixed(2)} {batchDispensing.batch?.activityUnit}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Activity</div>
                </div>
              </div>

              <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Dose Units</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Dose #</th>
                    <th>Patient Ref</th>
                    <th>Activity</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batchDispensing.doseUnits?.map((dose: any) => (
                    <tr key={dose.id}>
                      <td style={{ fontFamily: 'monospace' }}>{dose.doseNumber}</td>
                      <td>{dose.patientReference || '-'}</td>
                      <td>
                        {dose.dispensedActivity || dose.requestedActivity} {dose.activityUnit}
                      </td>
                      <td>
                        <span className={`badge badge-${getStatusColor(dose.status)}`}>
                          {dose.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {dose.status === 'CREATED' && (
                            <>
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => labelMutation.mutate(dose.id)}
                                title="Print Label"
                              >
                                <Tag size={14} />
                              </button>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => dispenseMutation.mutate({ id: dose.id })}
                                title="Dispense"
                              >
                                <Syringe size={14} />
                              </button>
                            </>
                          )}
                          {dose.status === 'LABELED' && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => dispenseMutation.mutate({ id: dose.id })}
                              title="Dispense"
                            >
                              <Syringe size={14} />
                            </button>
                          )}
                          {['CREATED', 'LABELED'].includes(dose.status) && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => {
                                const reason = prompt('Reason for waste:');
                                if (reason) wasteMutation.mutate({ id: dose.id, reason });
                              }}
                              title="Mark as Wasted"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!batchDispensing.doseUnits || batchDispensing.doseUnits.length === 0) && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No dose units created for this batch
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {batchDispensing.pendingOrders?.length > 0 && (
                <>
                  <h4 style={{ fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                    Pending Orders
                  </h4>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Requested Activity</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchDispensing.pendingOrders.map((order: any) => (
                        <tr key={order.id}>
                          <td>{order.orderNumber}</td>
                          <td>{order.customer?.name}</td>
                          <td>{order.requestedActivity} {order.activityUnit}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => {
                                setCreateForm({
                                  ...createForm,
                                  batchId: selectedBatchId,
                                  orderId: order.id,
                                  requestedActivity: order.requestedActivity.toString(),
                                });
                                setShowCreateModal(true);
                              }}
                            >
                              Create Dose
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Syringe size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p>Select a released batch to view and manage dose units</p>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Recent Dose Units</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Dose #</th>
              <th>Batch</th>
              <th>Product</th>
              <th>Customer</th>
              <th>Activity</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {doseUnits?.slice(0, 20).map((dose: any) => (
              <tr key={dose.id}>
                <td style={{ fontFamily: 'monospace' }}>{dose.doseNumber}</td>
                <td>{dose.batch?.batchNumber}</td>
                <td>{dose.batch?.product?.name}</td>
                <td>{dose.order?.customer?.name || '-'}</td>
                <td>{dose.dispensedActivity || dose.requestedActivity} {dose.activityUnit}</td>
                <td>
                  <span className={`badge badge-${getStatusColor(dose.status)}`}>
                    {dose.status}
                  </span>
                </td>
                <td>{format(new Date(dose.createdAt), 'MMM d, HH:mm')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Create Dose Unit</h3>
            <div className="form-group">
              <label>Batch *</label>
              <select
                className="form-select"
                value={createForm.batchId}
                onChange={(e) => setCreateForm({ ...createForm, batchId: e.target.value })}
              >
                <option value="">Select a batch</option>
                {releasedBatches?.map((batch: any) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batchNumber} - {batch.product?.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Requested Activity (mCi) *</label>
              <input
                type="number"
                className="form-input"
                value={createForm.requestedActivity}
                onChange={(e) => setCreateForm({ ...createForm, requestedActivity: e.target.value })}
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>Patient Reference</label>
              <input
                type="text"
                className="form-input"
                value={createForm.patientReference}
                onChange={(e) => setCreateForm({ ...createForm, patientReference: e.target.value })}
                placeholder="e.g., Hospital order ref or pseudonym"
              />
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Volume (mL)</label>
                <input
                  type="number"
                  className="form-input"
                  value={createForm.volume}
                  onChange={(e) => setCreateForm({ ...createForm, volume: e.target.value })}
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label>Container Type</label>
                <input
                  type="text"
                  className="form-input"
                  value={createForm.containerType}
                  onChange={(e) => setCreateForm({ ...createForm, containerType: e.target.value })}
                  placeholder="e.g., Vial, Syringe"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                className="form-input"
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={createDoseMutation.isPending}
              >
                {createDoseMutation.isPending ? 'Creating...' : 'Create Dose Unit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
