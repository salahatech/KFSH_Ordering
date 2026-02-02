import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { format } from 'date-fns';
import { Plus, Syringe, Tag, Trash2, Package, Activity, Beaker, Eye, Clock, CheckCircle, AlertTriangle, Truck } from 'lucide-react';
import { KpiCard, StatusBadge, FilterBar, EmptyState, type FilterWidget } from '../components/shared';
import { useToast } from '../components/ui/Toast';

export default function Dispensing() {
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [wasteTarget, setWasteTarget] = useState<any>(null);
  const [wasteReason, setWasteReason] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
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
  const toast = useToast();

  const { data: stats } = useQuery({
    queryKey: ['dispensing-stats'],
    queryFn: async () => {
      const { data } = await api.get('/dispensing/stats');
      return data;
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['dispensing-stats'] });
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
      toast.success('Dose Created', 'New dose unit has been created successfully');
    },
    onError: (error: any) => {
      toast.error('Creation Failed', error.response?.data?.error || 'Failed to create dose unit');
    },
  });

  const dispenseMutation = useMutation({
    mutationFn: async ({ id, dispensedActivity }: { id: string; dispensedActivity?: number }) => {
      return api.put(`/dispensing/${id}/dispense`, { dispensedActivity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispensing'] });
      queryClient.invalidateQueries({ queryKey: ['dispensing-stats'] });
      toast.success('Dose Dispensed', 'Dose has been marked as dispensed');
    },
    onError: (error: any) => {
      toast.error('Dispense Failed', error.response?.data?.error || 'Failed to dispense dose');
    },
  });

  const labelMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.put(`/dispensing/${id}/label`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispensing'] });
      toast.success('Label Printed', 'Dose has been labeled');
    },
    onError: (error: any) => {
      toast.error('Label Failed', error.response?.data?.error || 'Failed to label dose');
    },
  });

  const wasteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return api.put(`/dispensing/${id}/waste`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispensing'] });
      queryClient.invalidateQueries({ queryKey: ['dispensing-stats'] });
      setShowWasteModal(false);
      setWasteTarget(null);
      setWasteReason('');
      toast.warning('Dose Wasted', 'Dose has been marked as wasted');
    },
    onError: (error: any) => {
      toast.error('Waste Failed', error.response?.data?.error || 'Failed to mark as wasted');
    },
  });

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

  const handleWaste = () => {
    if (!wasteTarget || !wasteReason.trim()) return;
    wasteMutation.mutate({ id: wasteTarget.id, reason: wasteReason });
  };

  const openWasteModal = (dose: any) => {
    setWasteTarget(dose);
    setWasteReason('');
    setShowWasteModal(true);
  };

  const filterWidgets: FilterWidget[] = [
    { key: 'search', label: 'Search', type: 'search', placeholder: 'Search doses...' },
  ];

  const filteredBatches = releasedBatches?.filter((batch: any) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!batch.batchNumber.toLowerCase().includes(q) && 
          !batch.product?.name.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const filteredDoseUnits = doseUnits?.filter((dose: any) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!dose.doseNumber.toLowerCase().includes(q) && 
          !dose.batch?.batchNumber?.toLowerCase().includes(q) &&
          !dose.batch?.product?.name?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Dose Dispensing</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Create and manage individual dose units from released batches
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> Create Dose Unit
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Released Batches" 
          value={stats?.releasedBatches || 0} 
          icon={<Beaker size={20} />}
          color="primary"
        />
        <KpiCard 
          title="Total Doses" 
          value={stats?.totalDoses || 0} 
          icon={<Syringe size={20} />}
          color="default"
        />
        <KpiCard 
          title="Pending" 
          value={stats?.pending || 0} 
          icon={<Clock size={20} />}
          color="warning"
        />
        <KpiCard 
          title="Dispensed Today" 
          value={stats?.dispensedToday || 0} 
          icon={<CheckCircle size={20} />}
          color="success"
        />
        <KpiCard 
          title="Shipped" 
          value={stats?.shipped || 0} 
          icon={<Truck size={20} />}
          color="info"
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

      <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
        <div className="card">
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Beaker size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Released Batches ({filteredBatches?.length || 0})</h3>
          </div>
          <div style={{ padding: '0.75rem', maxHeight: '50vh', overflowY: 'auto' }}>
            {filteredBatches?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filteredBatches.map((batch: any) => {
                  const doseCount = batch.doseUnits?.length || 0;
                  return (
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
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.25rem' }}>
                          {doseCount} doses | {batch.targetActivity} {batch.activityUnit}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState 
                title="No released batches"
                message="Batches must be released by QP before dispensing"
                icon="package"
                variant="compact"
              />
            )}
          </div>
        </div>

        <div className="card">
          {selectedBatchId && batchDispensing ? (
            <>
              <div style={{ 
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '1.125rem', margin: 0 }}>
                      {batchDispensing.batch?.batchNumber}
                    </h3>
                    <StatusBadge status={batchDispensing.batch?.status} size="sm" />
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                    {batchDispensing.batch?.product?.name}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ 
                    textAlign: 'right',
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Activity size={14} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary)' }}>
                        {batchDispensing.remainingActivity?.toFixed(2)} {batchDispensing.batch?.activityUnit}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Available</div>
                  </div>
                  <Link to={`/batches/${selectedBatchId}/journey`} className="btn btn-secondary btn-sm">
                    <Eye size={14} />
                  </Link>
                </div>
              </div>

              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', margin: 0 }}>
                    Dose Units ({batchDispensing.doseUnits?.length || 0})
                  </h4>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setCreateForm({ ...createForm, batchId: selectedBatchId });
                      setShowCreateModal(true);
                    }}
                  >
                    <Plus size={14} /> Add Dose
                  </button>
                </div>
                
                {batchDispensing.doseUnits?.length > 0 ? (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Dose #</th>
                        <th>Patient Ref</th>
                        <th>Activity</th>
                        <th>Status</th>
                        <th style={{ width: '140px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchDispensing.doseUnits.map((dose: any) => (
                        <tr key={dose.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{dose.doseNumber}</td>
                          <td>{dose.patientReference || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                          <td style={{ fontWeight: 500 }}>
                            {dose.dispensedActivity || dose.requestedActivity} {dose.activityUnit}
                          </td>
                          <td>
                            <StatusBadge status={dose.status} size="sm" />
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              {dose.status === 'CREATED' && (
                                <>
                                  <button
                                    className="btn btn-sm btn-outline"
                                    onClick={() => labelMutation.mutate(dose.id)}
                                    disabled={labelMutation.isPending}
                                    title="Print Label"
                                  >
                                    <Tag size={14} />
                                  </button>
                                  <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => dispenseMutation.mutate({ id: dose.id })}
                                    disabled={dispenseMutation.isPending}
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
                                  disabled={dispenseMutation.isPending}
                                  title="Dispense"
                                >
                                  <Syringe size={14} />
                                </button>
                              )}
                              {['CREATED', 'LABELED'].includes(dose.status) && (
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => openWasteModal(dose)}
                                  title="Mark as Wasted"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState 
                    title="No dose units"
                    message="Create dose units for this batch"
                    icon="package"
                    variant="compact"
                    ctaLabel="Create Dose"
                    onCta={() => {
                      setCreateForm({ ...createForm, batchId: selectedBatchId });
                      setShowCreateModal(true);
                    }}
                  />
                )}

                {batchDispensing.pendingOrders?.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                      Pending Orders ({batchDispensing.pendingOrders.length})
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
                  </div>
                )}
              </div>
            </>
          ) : dispensingLoading ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <div className="spinner" />
            </div>
          ) : (
            <div style={{ padding: '1.5rem' }}>
              <EmptyState 
                title="No Batch Selected"
                message="Select a released batch from the left to view and manage dose units"
                icon="package"
              />
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Syringe size={18} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Recent Dose Units</h3>
        </div>
        <div style={{ padding: '0' }}>
          {filteredDoseUnits?.length > 0 ? (
            <table className="table" style={{ marginBottom: 0 }}>
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
                {filteredDoseUnits.slice(0, 15).map((dose: any) => (
                  <tr key={dose.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{dose.doseNumber}</td>
                    <td>{dose.batch?.batchNumber}</td>
                    <td>{dose.batch?.product?.name}</td>
                    <td>{dose.order?.customer?.name || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                    <td style={{ fontWeight: 500 }}>{dose.dispensedActivity || dose.requestedActivity} {dose.activityUnit}</td>
                    <td>
                      <StatusBadge status={dose.status} size="sm" />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{format(new Date(dose.createdAt), 'MMM d, HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '2rem' }}>
              <EmptyState 
                title="No dose units"
                message="Create dose units from released batches"
                icon="package"
                variant="compact"
              />
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>Create Dose Unit</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Batch *</label>
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
                <label className="form-label">Requested Activity (mCi) *</label>
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
                <label className="form-label">Patient Reference</label>
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
                  <label className="form-label">Volume (mL)</label>
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
                  <label className="form-label">Container Type</label>
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
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional notes"
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
                disabled={createDoseMutation.isPending || !createForm.batchId || !createForm.requestedActivity}
              >
                <Syringe size={16} />
                {createDoseMutation.isPending ? 'Creating...' : 'Create Dose Unit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWasteModal && wasteTarget && (
        <div className="modal-overlay" onClick={() => setShowWasteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>Mark Dose as Wasted</h3>
              <button onClick={() => setShowWasteModal(false)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  padding: '1rem',
                  background: '#fef2f2',
                  borderRadius: 'var(--radius)',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  border: '1px solid #fecaca',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <AlertTriangle size={18} color="var(--danger)" />
                  <strong style={{ color: 'var(--danger)' }}>Dose Waste</strong>
                </div>
                <p style={{ margin: 0, color: '#991b1b' }}>
                  This action will mark the dose as wasted. Please provide a reason for the waste.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Dose Number</label>
                <input
                  className="form-input"
                  value={wasteTarget.doseNumber}
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Activity</label>
                <input
                  className="form-input"
                  value={`${wasteTarget.requestedActivity} ${wasteTarget.activityUnit}`}
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Waste Reason *</label>
                <textarea
                  className="form-input"
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  rows={3}
                  required
                  placeholder="Enter reason for waste (e.g., spillage, contamination, decay)"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowWasteModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleWaste}
                disabled={wasteMutation.isPending || !wasteReason.trim()}
              >
                <Trash2 size={16} />
                {wasteMutation.isPending ? 'Processing...' : 'Confirm Waste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
