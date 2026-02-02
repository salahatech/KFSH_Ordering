import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { format } from 'date-fns';
import { CheckCircle, XCircle, FileText, Shield, Clock, History, Eye, AlertTriangle, Award, Clipboard } from 'lucide-react';
import { KpiCard, StatusBadge, FilterBar, EmptyState, Stepper, type FilterWidget, type StepperStep } from '../components/shared';
import { useToast } from '../components/ui/Toast';

const releaseSteps: StepperStep[] = [
  { key: 'production', label: 'Production' },
  { key: 'qc', label: 'QC Testing' },
  { key: 'qp_review', label: 'QP Review' },
  { key: 'released', label: 'Released' },
];

function getCompletedSteps(status: string): string[] {
  const completedMap: Record<string, string[]> = {
    QC_PASSED: ['production', 'qc'],
    QP_REVIEW: ['production', 'qc'],
    RELEASED: ['production', 'qc', 'qp_review', 'released'],
    REJECTED: ['production', 'qc'],
  };
  return completedMap[status] || [];
}

function getCurrentStep(status: string): string {
  const stepMap: Record<string, string> = {
    QC_PASSED: 'qp_review',
    QP_REVIEW: 'qp_review',
    RELEASED: 'released',
    REJECTED: 'qp_review',
  };
  return stepMap[status] || 'qp_review';
}

export default function Release() {
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: stats } = useQuery({
    queryKey: ['release-stats'],
    queryFn: async () => {
      const { data } = await api.get('/batches/release/stats');
      return data;
    },
  });

  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches-for-release'],
    queryFn: async () => {
      const { data } = await api.get('/batches', { params: { status: 'QC_PASSED' } });
      return data;
    },
  });

  const { data: historyBatches, isLoading: historyLoading } = useQuery({
    queryKey: ['release-history'],
    queryFn: async () => {
      const { data } = await api.get('/batches/release/history?days=14');
      return data;
    },
    enabled: viewMode === 'history',
  });

  const { data: batchDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['batch-release-details', selectedBatch?.id],
    queryFn: async () => {
      const { data } = await api.get(`/batches/${selectedBatch.id}`);
      return data;
    },
    enabled: !!selectedBatch,
  });

  const releaseMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post(`/batches/${selectedBatch.id}/release`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches-for-release'] });
      queryClient.invalidateQueries({ queryKey: ['batch-release-details'] });
      queryClient.invalidateQueries({ queryKey: ['release-stats'] });
      queryClient.invalidateQueries({ queryKey: ['release-history'] });
      setShowReleaseModal(false);
      setSelectedBatch(null);
      toast.success('Batch Released', 'Batch has been successfully released for dispensing');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to release batch';
      toast.error('Release Failed', message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post(`/batches/${selectedBatch.id}/transition`, { status: 'REJECTED', ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches-for-release'] });
      queryClient.invalidateQueries({ queryKey: ['batch-release-details'] });
      queryClient.invalidateQueries({ queryKey: ['release-stats'] });
      queryClient.invalidateQueries({ queryKey: ['release-history'] });
      setShowRejectModal(false);
      setSelectedBatch(null);
      toast.warning('Batch Rejected', 'Batch has been rejected and removed from release queue');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to reject batch';
      toast.error('Rejection Failed', message);
    },
  });

  const handleRelease = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    releaseMutation.mutate({
      electronicSignature: formData.get('signature'),
      reason: formData.get('reason'),
      releaseType: 'FULL',
    });
  };

  const handleReject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    rejectMutation.mutate({
      note: formData.get('reason'),
    });
  };

  const handleViewModeChange = (mode: 'pending' | 'history') => {
    setViewMode(mode);
    setSelectedBatch(null);
  };

  const filterWidgets: FilterWidget[] = [
    { key: 'search', label: 'Search', type: 'search', placeholder: 'Search batches...' },
  ];

  const currentBatches = viewMode === 'pending' ? batches : historyBatches;
  const filteredBatches = currentBatches?.filter((batch: any) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!batch.batchNumber.toLowerCase().includes(q) && 
          !batch.product?.name.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const qcPassedCount = batchDetails?.qcResults?.filter((r: any) => r.passed).length || 0;
  const qcTotalCount = batchDetails?.qcResults?.length || 0;

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>QP Release</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${viewMode === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleViewModeChange('pending')}
          >
            <Clock size={16} /> Pending
          </button>
          <button 
            className={`btn ${viewMode === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleViewModeChange('history')}
          >
            <History size={16} /> History
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard 
          title="Pending Release" 
          value={stats?.pendingRelease || 0} 
          icon={<Clock size={20} />}
          color="warning"
          onClick={() => handleViewModeChange('pending')}
        />
        <KpiCard 
          title="In QP Review" 
          value={stats?.qpReview || 0} 
          icon={<Clipboard size={20} />}
          color="info"
        />
        <KpiCard 
          title="Released Today" 
          value={stats?.releasedToday || 0} 
          icon={<CheckCircle size={20} />}
          color="success"
          onClick={() => handleViewModeChange('history')}
        />
        <KpiCard 
          title="Rejected Today" 
          value={stats?.rejectedToday || 0} 
          icon={<XCircle size={20} />}
          color="danger"
          onClick={() => handleViewModeChange('history')}
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

      <div className="grid" style={{ gridTemplateColumns: selectedBatch ? '1fr 1.5fr' : '1fr' }}>
        <div className="card">
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 600 }}>
              {viewMode === 'pending' 
                ? `Batches Ready for Release (${filteredBatches?.length || 0})` 
                : `Release History (${filteredBatches?.length || 0})`}
            </h3>
          </div>
          <div style={{ padding: '0', maxHeight: '60vh', overflowY: 'auto' }}>
            {(viewMode === 'pending' ? isLoading : historyLoading) ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="spinner" />
              </div>
            ) : filteredBatches?.length > 0 ? (
              filteredBatches.map((batch: any) => (
                <div
                  key={batch.id}
                  style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: selectedBatch?.id === batch.id ? 'var(--bg-secondary)' : undefined,
                    transition: 'background 0.15s',
                  }}
                  onClick={() => setSelectedBatch(batch)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>{batch.batchNumber}</span>
                        {batch.status === 'REJECTED' && <AlertTriangle size={14} color="var(--danger)" />}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {batch.product?.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {batch.orders?.length || 0} orders | {batch.targetActivity} {batch.activityUnit}
                      </div>
                      {viewMode === 'history' && batch.batchReleases?.[0] && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Released by: {batch.batchReleases[0].releasedBy?.email} | {format(new Date(batch.batchReleases[0].releasedAt), 'MMM dd HH:mm')}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={batch.status} size="sm" />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState 
                title={viewMode === 'pending' ? 'No batches pending release' : 'No release history found'}
                message={viewMode === 'pending' ? 'All batches have been reviewed by QP' : 'No releases in the selected period'}
                icon="success"
                variant="compact"
              />
            )}
          </div>
        </div>

        {selectedBatch && (
          <div className="card">
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h3 style={{ fontWeight: 600 }}>{batchDetails?.batchNumber || selectedBatch.batchNumber}</h3>
                  <StatusBadge status={batchDetails?.status || selectedBatch.status} />
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {batchDetails?.product?.name || selectedBatch.product?.name}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Link to={`/batches/${selectedBatch.id}/journey`} className="btn btn-secondary btn-sm">
                  <Eye size={14} /> Batch Journey
                </Link>
                <button
                  onClick={() => setSelectedBatch(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  &times;
                </button>
              </div>
            </div>

            {detailsLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="spinner" />
              </div>
            ) : batchDetails ? (
              <div style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <Stepper 
                    steps={releaseSteps}
                    currentStep={getCurrentStep(batchDetails.status)}
                    completedSteps={getCompletedSteps(batchDetails.status)}
                    exceptionStep={batchDetails.status === 'REJECTED' ? 'qp_review' : undefined}
                    size="sm"
                  />
                </div>

                <div style={{ 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '0.5rem', 
                  padding: '1rem', 
                  marginBottom: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '1rem',
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Product</div>
                    <div style={{ fontWeight: 500 }}>{batchDetails.product?.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Activity</div>
                    <div style={{ fontWeight: 500 }}>{batchDetails.actualActivity || batchDetails.targetActivity} {batchDetails.activityUnit}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Orders</div>
                    <div style={{ fontWeight: 500 }}>{batchDetails.orders?.length || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>QC Tests</div>
                    <div style={{ fontWeight: 500, color: qcPassedCount === qcTotalCount ? 'var(--success)' : 'var(--danger)' }}>
                      {qcPassedCount}/{qcTotalCount} Passed
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} /> QC Results Summary
                  </h4>
                  <div style={{ display: 'grid', gap: '0.25rem' }}>
                    {batchDetails.qcResults?.map((result: any) => (
                      <div
                        key={result.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.625rem 0.75rem',
                          background: 'var(--bg-secondary)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 500 }}>{result.template?.testName}</span>
                          {result.numericResult !== null && (
                            <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                              ({result.numericResult} {result.template?.unit})
                            </span>
                          )}
                        </div>
                        <span className={`badge badge-${result.passed ? 'success' : 'danger'}`}>
                          {result.passed ? 'Pass' : 'Fail'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Award size={16} /> Orders to be Released
                  </h4>
                  <div style={{ display: 'grid', gap: '0.25rem' }}>
                    {batchDetails.orders?.map((order: any) => (
                      <div
                        key={order.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.625rem 0.75rem',
                          background: 'var(--bg-secondary)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 500 }}>{order.orderNumber}</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                            {order.customer?.name}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {order.requestedActivity} {order.activityUnit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {batchDetails.batchReleases?.length > 0 && (
                  <div style={{ 
                    background: batchDetails.status === 'RELEASED' ? '#f0fdf4' : '#fef2f2',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: batchDetails.status === 'RELEASED' ? 'var(--success)' : 'var(--danger)' }}>
                      {batchDetails.status === 'RELEASED' ? 'Released' : 'Rejected'} by QP
                    </div>
                    <div style={{ fontSize: '0.875rem' }}>
                      <div><strong>QP:</strong> {batchDetails.batchReleases[0].releasedBy?.email}</div>
                      <div><strong>Date:</strong> {format(new Date(batchDetails.batchReleases[0].releasedAt), 'MMM dd, yyyy HH:mm')}</div>
                      {batchDetails.batchReleases[0].reason && (
                        <div><strong>Notes:</strong> {batchDetails.batchReleases[0].reason}</div>
                      )}
                    </div>
                  </div>
                )}

                {viewMode === 'pending' && batchDetails.status === 'QC_PASSED' && (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      className="btn btn-danger"
                      style={{ flex: 1 }}
                      onClick={() => setShowRejectModal(true)}
                    >
                      <XCircle size={18} />
                      Reject
                    </button>
                    <button
                      className="btn btn-success"
                      style={{ flex: 2 }}
                      onClick={() => setShowReleaseModal(true)}
                    >
                      <Shield size={18} />
                      Release Batch
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {showReleaseModal && (
        <div className="modal-overlay" onClick={() => setShowReleaseModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>Batch Release - Electronic Signature</h3>
              <button onClick={() => setShowReleaseModal(false)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <form onSubmit={handleRelease}>
              <div className="modal-body">
                <div
                  style={{
                    padding: '1rem',
                    background: '#f0fdf4',
                    borderRadius: 'var(--radius)',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Shield size={18} color="var(--success)" />
                    <strong style={{ color: 'var(--success)' }}>Qualified Person Release</strong>
                  </div>
                  <p style={{ margin: 0, color: '#166534' }}>
                    By signing below, I confirm that this batch has been manufactured and tested in accordance
                    with GMP requirements and is fit for release.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Batch Number</label>
                  <input
                    className="form-input"
                    value={batchDetails?.batchNumber || ''}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Electronic Signature (Type your full name) *</label>
                  <input
                    name="signature"
                    className="form-input"
                    required
                    placeholder="Enter your full name"
                    autoComplete="off"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Release Notes</label>
                  <textarea
                    name="reason"
                    className="form-input"
                    rows={3}
                    placeholder="Optional notes for this release"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReleaseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" disabled={releaseMutation.isPending}>
                  <CheckCircle size={18} />
                  {releaseMutation.isPending ? 'Releasing...' : 'Confirm Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 600, margin: 0 }}>Reject Batch</h3>
              <button onClick={() => setShowRejectModal(false)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 'var(--radius)', padding: '0.375rem', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>&times;</button>
            </div>
            <form onSubmit={handleReject}>
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
                    <strong style={{ color: 'var(--danger)' }}>Batch Rejection</strong>
                  </div>
                  <p style={{ margin: 0, color: '#991b1b' }}>
                    This action will reject the batch and prevent it from being released. 
                    Please provide a reason for the rejection.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Batch Number</label>
                  <input
                    className="form-input"
                    value={batchDetails?.batchNumber || ''}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rejection Reason *</label>
                  <textarea
                    name="reason"
                    className="form-input"
                    rows={3}
                    required
                    placeholder="Enter reason for rejection"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" disabled={rejectMutation.isPending}>
                  <XCircle size={18} />
                  {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
