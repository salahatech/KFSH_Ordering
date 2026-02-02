import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { CheckCircle, FileText, Shield } from 'lucide-react';

export default function Release() {
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches-for-release'],
    queryFn: async () => {
      const { data } = await api.get('/batches', { params: { status: 'QC_PASSED' } });
      return data;
    },
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
      setShowReleaseModal(false);
      setSelectedBatch(null);
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>QP Release</h2>
      </div>

      <div className="grid" style={{ gridTemplateColumns: selectedBatch ? '1fr 1.5fr' : '1fr' }}>
        <div className="card">
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 600 }}>Batches Ready for Release ({batches?.length || 0})</h3>
          </div>
          <div style={{ padding: '0' }}>
            {batches?.length > 0 ? (
              batches.map((batch: any) => (
                <div
                  key={batch.id}
                  style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: selectedBatch?.id === batch.id ? 'var(--bg-secondary)' : undefined,
                  }}
                  onClick={() => setSelectedBatch(batch)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{batch.batchNumber}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {batch.product?.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {batch.orders?.length || 0} orders | {batch.targetActivity} {batch.activityUnit}
                      </div>
                    </div>
                    <span className="badge badge-success">QC Passed</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No batches ready for release</div>
            )}
          </div>
        </div>

        {selectedBatch && (
          <div className="card">
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontWeight: 600 }}>{batchDetails?.batchNumber}</h3>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {batchDetails?.product?.name}
                </div>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {detailsLoading ? (
              <div className="loading-overlay">
                <div className="spinner" />
              </div>
            ) : batchDetails ? (
              <div style={{ padding: '1.5rem' }}>
                <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Product</div>
                    <div>{batchDetails.product?.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Activity</div>
                    <div>{batchDetails.actualActivity || batchDetails.targetActivity} {batchDetails.activityUnit}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Production Time</div>
                    <div>
                      {batchDetails.actualStartTime && format(new Date(batchDetails.actualStartTime), 'MMM dd, HH:mm')}
                      {batchDetails.actualEndTime && ` - ${format(new Date(batchDetails.actualEndTime), 'HH:mm')}`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Orders</div>
                    <div>{batchDetails.orders?.length || 0} orders</div>
                  </div>
                </div>

                <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>QC Results</h4>
                <div style={{ marginBottom: '1.5rem' }}>
                  {batchDetails.qcResults?.map((result: any) => (
                    <div
                      key={result.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '0.25rem',
                        fontSize: '0.875rem',
                      }}
                    >
                      <span>{result.template?.testName}</span>
                      <span className={`badge badge-${result.passed ? 'success' : 'danger'}`}>
                        {result.passed ? 'Pass' : 'Fail'}
                      </span>
                    </div>
                  ))}
                </div>

                <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Orders to be Released</h4>
                <div style={{ marginBottom: '1.5rem' }}>
                  {batchDetails.orders?.map((order: any) => (
                    <div
                      key={order.id}
                      style={{
                        padding: '0.5rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '0.25rem',
                        fontSize: '0.875rem',
                      }}
                    >
                      {order.orderNumber} - {order.customer?.name}
                    </div>
                  ))}
                </div>

                <button
                  className="btn btn-success"
                  style={{ width: '100%' }}
                  onClick={() => setShowReleaseModal(true)}
                >
                  <Shield size={18} />
                  Release Batch
                </button>
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
                    background: '#fef3c7',
                    borderRadius: 'var(--radius)',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <strong>Qualified Person Release</strong>
                  <p style={{ marginTop: '0.25rem' }}>
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
                  Confirm Release
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
