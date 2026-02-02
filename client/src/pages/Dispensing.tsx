import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { Plus, Syringe, Tag, Trash2, Package, Activity, Beaker } from 'lucide-react';

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

  const { data: releasedBatches, isLoading: batchesLoading } = useQuery({
    queryKey: ['batches', 'RELEASED'],
    queryFn: async () => {
      const { data } = await api.get('/batches', { params: { status: 'RELEASED' } });
      return data;
    },
  });

  const { data: batchDispensing, isLoading: dispensingLoading } = useQuery({
    queryKey: ['dispensing', 'batch', selectedBatchId],
    queryFn: async () => {
      const { data } = await api.get(`/dispensing/batch/${selectedBatchId}`);
      return data;
    },
    enabled: !!selectedBatchId,
  });

  const { data: doseUnits, isLoading: doseUnitsLoading } = useQuery({
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

  const totalDoses = doseUnits?.length || 0;
  const dispensedDoses = doseUnits?.filter((d: any) => d.status === 'DISPENSED').length || 0;
  const pendingDoses = doseUnits?.filter((d: any) => ['CREATED', 'LABELED'].includes(d.status)).length || 0;

  if (batchesLoading) {
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>Dose Dispensing</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Create and manage individual dose units from released batches
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> Create Dose Unit
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--primary)' }}>
            {releasedBatches?.length || 0}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Released Batches</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text)' }}>
            {totalDoses}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Doses</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--warning)' }}>
            {pendingDoses}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Pending</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--success)' }}>
            {dispensedDoses}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Dispensed</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Beaker size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Released Batches</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {releasedBatches?.map((batch: any) => (
              <button
                key={batch.id}
                className={`btn ${selectedBatchId === batch.id ? 'btn-primary' : 'btn-outline'}`}
                style={{ 
                  textAlign: 'left', 
                  justifyContent: 'flex-start',
                  padding: '0.75rem 1rem',
                  height: 'auto'
                }}
                onClick={() => setSelectedBatchId(batch.id)}
              >
                <Package size={16} />
                <div style={{ flex: 1, marginLeft: '0.5rem' }}>
                  <div style={{ fontWeight: 500 }}>{batch.batchNumber}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                    {batch.product?.name}
                  </div>
                </div>
              </button>
            ))}
            {(!releasedBatches || releasedBatches.length === 0) && (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem 1rem', 
                color: 'var(--text-muted)',
                backgroundColor: 'var(--background-secondary)',
                borderRadius: '0.5rem'
              }}>
                <Package size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.875rem', margin: 0 }}>No released batches available</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          {selectedBatchId && batchDispensing ? (
            <>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--border)',
                marginBottom: '1rem'
              }}>
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                    {batchDispensing.batch?.batchNumber}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                    {batchDispensing.batch?.product?.name}
                  </p>
                </div>
                <div style={{ 
                  textAlign: 'right',
                  backgroundColor: 'var(--background-secondary)',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <Activity size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)' }}>
                      {batchDispensing.remainingActivity?.toFixed(2)} {batchDispensing.batch?.activityUnit}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Activity</div>
                </div>
              </div>

              <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Dose Units
              </h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Dose #</th>
                    <th>Patient Ref</th>
                    <th>Activity</th>
                    <th>Status</th>
                    <th style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batchDispensing.doseUnits?.map((dose: any) => (
                    <tr key={dose.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{dose.doseNumber}</td>
                      <td>{dose.patientReference || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                      <td style={{ fontWeight: 500 }}>
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
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No dose units created for this batch
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {batchDispensing.pendingOrders?.length > 0 && (
                <>
                  <h4 style={{ fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                    Pending Orders
                  </h4>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Requested Activity</th>
                        <th style={{ width: '120px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchDispensing.pendingOrders.map((order: any) => (
                        <tr key={order.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{order.orderNumber}</td>
                          <td>{order.customer?.name}</td>
                          <td style={{ fontWeight: 500 }}>{order.requestedActivity} {order.activityUnit}</td>
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
                              <Plus size={14} /> Create Dose
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
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
              <Syringe size={56} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <h3 style={{ fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text)' }}>No Batch Selected</h3>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Select a released batch from the left to view and manage dose units</p>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Syringe size={18} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Recent Dose Units</h3>
        </div>
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
            {doseUnits?.slice(0, 15).map((dose: any) => (
              <tr key={dose.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{dose.doseNumber}</td>
                <td>{dose.batch?.batchNumber}</td>
                <td>{dose.batch?.product?.name}</td>
                <td>{dose.order?.customer?.name || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                <td style={{ fontWeight: 500 }}>{dose.dispensedActivity || dose.requestedActivity} {dose.activityUnit}</td>
                <td>
                  <span className={`badge badge-${getStatusColor(dose.status)}`}>
                    {dose.status}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{format(new Date(dose.createdAt), 'MMM d, HH:mm')}</td>
              </tr>
            ))}
            {(!doseUnits || doseUnits.length === 0) && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No dose units created yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Create Dose Unit</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Create a new dose unit from a released batch
            </p>
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
                placeholder="Enter activity amount"
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
                  placeholder="Optional"
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
                placeholder="Optional notes"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={createDoseMutation.isPending || !createForm.batchId || !createForm.requestedActivity}
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
